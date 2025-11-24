require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { generateExam } = require('./services/examGenerator');

const app = express();
const port = process.env.PORT || 3000;

// === ENV VALIDATION (Critical for Production) ===
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'DEEPSEEK_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('\n❌ FATAL ERROR: Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these environment variables and restart the server.\n');
    process.exit(1);
}

console.log('✅ Environment variables validated successfully');
console.log(`   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY.slice(0, 7)}...`);
console.log(`   - DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY.slice(0, 7)}...`);
console.log(`   - CLIENT_URL: ${process.env.CLIENT_URL || '*'} ${!process.env.CLIENT_URL ? '⚠️ (wildcard - set for production!)' : ''}\n`);


// Trust Proxy for Render/Heroku
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// CORS Configuration
const clientUrl = process.env.CLIENT_URL;
if (process.env.NODE_ENV === 'production' && !clientUrl) {
    console.warn('⚠️ WARNING: CLIENT_URL not set in production. CORS will allow all origins (*).');
}

app.use(cors({
    origin: clientUrl || '*', // Restrict in production
    methods: ['GET', 'POST']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Stricter Rate Limiting for AI Endpoints (expensive calls)
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 AI-generated exams per IP per hour
    message: { error: 'QUOTA_EXCEEDED. You can generate maximum 5 exams per hour. Please try again later.' }
    // Using default keyGenerator which handles IPv6 correctly
});



// Rate Limiting for Payment endpoints
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Max 50 payment verifications per 15 min
    message: { error: 'Too many payment requests. Please try again later.' }
});


app.use(express.json());
app.use(morgan('combined'));

// --- Promo Code System ---

const PROMO_FILE = path.join(__dirname, 'data', 'promo_codes.json');

// Rate limiter for promo code endpoint (prevent abuse)
const promoLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Max 5 promo attempts per minute per IP
    message: { error: 'Troppi tentativi. Riprova tra 1 minuto.' }
});

app.post('/api/redeem-promo', promoLimiter, async (req, res) => {
    const { code, topic, difficulty } = req.body;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;

    console.log(`🔍 Promo redemption attempt:`, { code, trimmed: code?.trim(), clientIp, body: req.body });

    if (!code) {
        return res.status(400).json({ error: 'Code required' });
    }

    try {
        // Ensure data directory exists for promo codes
        if (!fs.existsSync(PROMO_FILE)) {
            fs.writeFileSync(PROMO_FILE, JSON.stringify([], null, 2));
        }

        const promos = JSON.parse(fs.readFileSync(PROMO_FILE, 'utf8'));
        const promo = promos.find(p => p.code === code);

        if (!promo) {
            return res.status(404).json({ error: 'Codice non valido' });
        }

        // Check if IP already used this code (allow re-entry for same IP)
        const alreadyUsed = promo.usedBy.includes(clientIp);

        if (!alreadyUsed) {
            // Check limits
            if (promo.usedBy.length >= promo.maxUses) {
                return res.status(403).json({ error: 'Codice esaurito (limite utilizzi raggiunto)' });
            }
            // Bind IP
            promo.usedBy.push(clientIp);
            fs.writeFileSync(PROMO_FILE, JSON.stringify(promos, null, 2));
            console.log(`🎟️ Promo ${code} redeemed by ${clientIp}`);
        } else {
            console.log(`🎟️ Promo ${code} re-used by ${clientIp}`);
        }

        // Grant access - try to use an existing exam from cache if topic/difficulty provided
        let chosenExamId = null;
        let chosenTopic = topic;
        let chosenDifficulty = difficulty;
        const { excludeIds = [] } = req.body;

        if (topic && difficulty) {
            // Look for a matching exam in cache that hasn't been seen
            const cache = getCache();
            const match = cache.find(e =>
                e.topic === topic &&
                e.difficulty === difficulty &&
                !excludeIds.includes(e.id)
            );

            if (match) {
                chosenExamId = match.id;
                console.log(`✅ Promo: found existing exam ${chosenExamId} for ${topic}/${difficulty} (not in exclude list)`);
            } else {
                console.log(`⚠️ Promo: no fresh exam found in cache for ${topic}/${difficulty} (checked ${cache.length} exams, excluded ${excludeIds.length})`);
            }
        }

        if (!chosenExamId) {
            // Fallback: generate a fresh exam (random if not specified)
            const TOPICS = [
                "Introduzione e Metodi", "Meccanica", "Meccanica dei Fluidi",
                "Onde Meccaniche", "Termodinamica", "Elettricità e Magnetismo",
                "Radiazioni e Ottica"
            ];
            const DIFFICULTIES = ["easy", "medium", "hard"];

            const randomTopic = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
            const randomDifficulty = difficulty || DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

            console.log(`🎓 Generating fresh exam for promo: ${randomTopic}/${randomDifficulty}`);
            try {
                const examData = await generateExam(randomTopic, randomDifficulty, process.env.DEEPSEEK_API_KEY);
                const newId = Date.now().toString();
                const newCacheEntry = {
                    id: newId,
                    topic: randomTopic,
                    difficulty: randomDifficulty,
                    questions: examData.questions,
                    timestamp: new Date().toISOString()
                };
                const currentCache = getCache();
                currentCache.push(newCacheEntry);
                saveCache(currentCache);
                chosenExamId = newId;
                chosenTopic = randomTopic;
                chosenDifficulty = randomDifficulty;
            } catch (genError) {
                console.error('Failed to generate exam for promo:', genError);
                return res.status(500).json({ error: 'Impossibile generare esame al momento. Riprova più tardi.' });
            }
        }

        // Grant access for the chosen exam
        const { sessionToken, expiresAt } = grantAccess(clientIp, chosenExamId);
        res.json({
            success: true,
            sessionToken,
            expiresAt,
            examId: chosenExamId,
            topic: chosenTopic,
            difficulty: chosenDifficulty
        });

    } catch (error) {
        console.error('Promo redemption error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DeepSeek Configuration
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// --- Data & Caching Helpers ---

const CACHE_FILE = path.join(__dirname, 'data', 'exam_cache.json');

// Ensure data dir exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const getCache = () => {
    try {
        if (!fs.existsSync(CACHE_FILE)) return [];
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading exam cache:", e);
        return [];
    }
};

const saveCache = (cache) => {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error("Error saving exam cache:", e);
    }
};



// --- Access Token System (IP-based 45-min access) ---

const ACCESS_FILE = path.join(__dirname, 'data', 'access_tokens.json');

const getAccessTokens = () => {
    try {
        if (!fs.existsSync(ACCESS_FILE)) return [];
        const data = fs.readFileSync(ACCESS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading access tokens:", e);
        return [];
    }
};

const saveAccessTokens = (tokens) => {
    try {
        fs.writeFileSync(ACCESS_FILE, JSON.stringify(tokens, null, 2));
    } catch (e) {
        console.error("Error saving access tokens:", e);
    }
};

const grantAccess = (ip, examId) => {
    const tokens = getAccessTokens();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 60 * 1000); // 45 minutes

    // Generate unique session token (independent of IP for IP change scenarios)
    const crypto = require('crypto');
    const sessionToken = crypto.randomUUID();

    // Remove any existing token for this IP+examId combo
    const filtered = tokens.filter(t => !(t.ip === ip && t.examId === examId));

    filtered.push({
        ip,
        examId,
        sessionToken,
        purchaseTimestamp: now.toISOString(),
        expiresAt: expiresAt.toISOString()
    });

    saveAccessTokens(filtered);
    console.log(`[Access] Granted 45-min access to IP ${ip} for exam ${examId} (token: ${sessionToken.slice(0, 8)}...)`);
    return { expiresAt: expiresAt.toISOString(), sessionToken };
};

const checkAccess = (examId, sessionToken) => {
    const tokens = getAccessTokens();
    const now = new Date();

    // Find by examId AND sessionToken (not IP, to handle IP changes)
    const token = tokens.find(t => t.examId === examId && t.sessionToken === sessionToken);

    if (!token) {
        return { hasAccess: false };
    }

    const expiresAt = new Date(token.expiresAt);
    if (now > expiresAt) {
        return { hasAccess: false, expired: true };
    }

    return { hasAccess: true, expiresAt: token.expiresAt };
};

const cleanupExpiredTokens = () => {
    const tokens = getAccessTokens();
    const now = new Date();

    const valid = tokens.filter(t => new Date(t.expiresAt) > now);

    if (valid.length < tokens.length) {
        saveAccessTokens(valid);
        console.log(`[Access] Cleaned up ${tokens.length - valid.length} expired tokens`);
    }
};

// Cleanup expired tokens every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);

async function replenishCache(topic, difficulty) {
    console.log(`[Cache] Triggering background replenishment for ${topic}/${difficulty}`);
    try {
        const examData = await generateExam(topic, difficulty, process.env.DEEPSEEK_API_KEY);

        const cache = getCache();
        cache.push({
            id: Date.now().toString(),
            topic,
            difficulty,
            questions: examData.questions,
            timestamp: new Date().toISOString()
        });
        saveCache(cache);
        console.log(`[Cache] Replenishment successful for ${topic}/${difficulty}`);
    } catch (error) {
        console.error(`[Cache] Replenishment failed for ${topic}/${difficulty}:`, error);
    }
}

// --- Automatic Cache Seeding (Grow Cache Background Job) ---
const TOPICS = [
    "Introduzione e Metodi", "Meccanica", "Meccanica dei Fluidi",
    "Onde Meccaniche", "Termodinamica", "Elettricità e Magnetismo",
    "Radiazioni e Ottica", "full"
];
const DIFFICULTIES = ["easy", "medium", "hard"];

const seedCache = async () => {
    const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const randomDiff = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

    console.log(`[Auto-Seed] Generating new exam for ${randomTopic}/${randomDiff}...`);
    await replenishCache(randomTopic, randomDiff);
};

// Generate a new exam every 5 minutes to grow the cache
setInterval(seedCache, 5 * 60 * 1000);
// Also run one immediately on startup
setTimeout(seedCache, 10000);

// --- Endpoints ---

// 1. Generate Exam (Cache-First Strategy)
app.post('/api/generate-exam', aiLimiter, async (req, res) => {
    console.log('Received /api/generate-exam request');
    const { topic, difficulty, excludeIds = [] } = req.body;

    if (!topic || !difficulty) {
        return res.status(400).json({ error: 'Topic and difficulty are required' });
    }

    // 1. Check Cache with Exclusion
    const cache = getCache();

    // Find an exam that matches topic/difficulty AND is not in the exclude list
    const exam = cache.find(e =>
        e.topic === topic &&
        e.difficulty === difficulty &&
        !excludeIds.includes(e.id)
    );

    if (exam) {
        console.log(`[Cache] HIT for ${topic}/${difficulty} (ID: ${exam.id})`);

        // Grant 45-minute session-based access for THIS user
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;
        const accessData = grantAccess(ip, exam.id);

        // Return the exam (including ID and access tokens)
        res.json({
            id: exam.id,
            questions: exam.questions,
            topic: exam.topic,
            difficulty: exam.difficulty,
            sessionToken: accessData.sessionToken,
            expiresAt: accessData.expiresAt
        });

        // Trigger background replenishment to keep cache fresh/diverse
        replenishCache(topic, difficulty);
        return;
    }

    console.log(`[Cache] MISS for ${topic}/${difficulty} (Excluding ${excludeIds.length} IDs). Falling back to synchronous generation.`);

    // 2. Fallback: Synchronous Generation
    try {
        const examData = await generateExam(topic, difficulty, process.env.DEEPSEEK_API_KEY);

        // Generate a temporary ID for this live-generated exam
        const newId = Date.now().toString();

        res.json({
            id: newId,
            questions: examData.questions
        });

        // We cache this new exam so OTHERS can use it, but we don't need to "replenish" 
        // because we just made one. However, saving it to cache is good practice.
        const newCacheEntry = {
            id: newId,
            topic,
            difficulty,
            questions: examData.questions,
            timestamp: new Date().toISOString()
        };

        const currentCache = getCache();
        currentCache.push(newCacheEntry);
        saveCache(currentCache);

        // Grant 45-minute session-based access
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;
        const accessData = grantAccess(ip, newId);

        // 4. Return Fresh Exam with Access Info
        return res.json({
            id: newId,
            questions: examData.questions,
            topic,
            difficulty,
            sessionToken: accessData.sessionToken,
            expiresAt: accessData.expiresAt
        });

    } catch (error) {
        console.error('DeepSeek Error:', error);
        const errorMessage = error.message?.includes('rate_limit')
            ? 'AI service temporarily unavailable due to high demand. Please try again in a few minutes.'
            : 'Failed to generate exam. Please try again later.';
        res.status(500).json({ error: errorMessage });
    }
});

// 2. Generate Study Plan (DeepSeek Proxy)
app.post('/api/generate-study-plan', async (req, res) => {
    try {
        const { wrongAnswers } = req.body;

        const wrongText = wrongAnswers.map(q => `- ${q.text} (Risposta corretta: ${q.correctAnswer})`).join('\n');
        const prompt = `
      Analizza questi errori di un aspirante medico nel "Semestre Filtro":
      ${wrongText}
      
      Sei il Primario del reparto.
      1. Umilia lo studente per gli errori concettuali gravi (es. unità di misura, principi base).
      2. Fornisci 3 consigli di studio estremamente pratici e mirati per colmare le lacune.
      3. Usa LaTeX ($...$) per le formule anche qui.
      
      Formatta in markdown.
    `;

        const completion = await deepseek.chat.completions.create({
            messages: [
                { role: "user", content: prompt }
            ],
            model: "deepseek-reasoner",
        });

        res.json({ plan: completion.choices[0].message.content });

    } catch (error) {
        console.error('Study Plan Error:', error);
        res.status(500).json({ error: 'Failed to generate study plan' });
    }
});

// 2.5 Verify Session-Based Access (45-min window)
app.post('/api/verify-access', (req, res) => {
    try {
        const { examId, sessionToken } = req.body;

        if (!examId || !sessionToken) {
            return res.status(400).json({ error: 'examId and sessionToken are required' });
        }

        console.log(`[Access] Checking session access for exam ${examId}`);

        const accessCheck = checkAccess(examId, sessionToken);

        if (accessCheck.hasAccess) {
            // Fetch and return the exam
            const cache = getCache();
            const exam = cache.find(e => e.id === examId);

            if (!exam) {
                return res.status(404).json({ error: 'Exam not found' });
            }

            res.json({
                hasAccess: true,
                expiresAt: accessCheck.expiresAt,
                exam: {
                    id: exam.id,
                    topic: exam.topic,
                    difficulty: exam.difficulty,
                    questions: exam.questions
                }
            });
        } else {
            res.json({ hasAccess: false, expired: accessCheck.expired || false });
        }
    } catch (error) {
        console.error('Access Verification Error:', error);
        res.status(500).json({ error: 'Failed to verify access' });
    }
});

// 3. Create Payment Intent (Stripe)

app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { receipt_email, metadata } = req.body;

        // Get user IP for webhook grant access
        const userIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: 50, // €0.50
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            receipt_email: receipt_email || undefined,
            metadata: {
                // Store metadata for webhook processing
                examId: metadata?.examId || '',
                examType: metadata?.examType || '',
                difficulty: metadata?.difficulty || '',
                topic: metadata?.topic || '',
                userIp: userIp
            }
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3.1 Verify Payment Intent (with rate limiting)
app.get('/api/verify-payment/:id', paymentLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id.length < 10) {
            return res.status(400).json({ error: 'Invalid payment ID' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(id);
        console.log(`[Payment Verify] Intent ${id}: status=${paymentIntent.status}`);

        // Base response includes status
        const responsePayload = { status: paymentIntent.status };

        // If payment succeeded, ensure access is granted
        if (paymentIntent.status === 'succeeded') {
            const examId = paymentIntent.metadata?.examId;

            if (examId) {
                const tokens = getAccessTokens();
                let tokenObj = tokens.find(t => t.examId === examId);

                // CRITICAL FIX: If no token exists, CREATE ONE NOW
                // This handles cases where webhook didn't fire or IP mismatch
                if (!tokenObj) {
                    console.log(`[Payment Verify] No existing token for exam ${examId}, creating now...`);

                    // Get current user IP (may differ from payment IP if multi-device)
                    const currentIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;

                    // Grant access with current IP
                    const accessData = grantAccess(currentIp, examId);
                    console.log(`[Payment Verify] ✅ Created access for exam ${examId}, IP ${currentIp}`);
                    console.log(`[Payment Verify]    Token: ${accessData.sessionToken.slice(0, 8)}...`);
                    console.log(`[Payment Verify]    Expires: ${accessData.expiresAt}`);

                    tokenObj = {
                        sessionToken: accessData.sessionToken,
                        expiresAt: accessData.expiresAt,
                        examId: examId
                    };
                } else {
                    console.log(`[Payment Verify] Found existing token for exam ${examId}`);
                }

                // Return token data to frontend
                responsePayload.sessionToken = tokenObj.sessionToken;
                responsePayload.expiresAt = tokenObj.expiresAt;
                responsePayload.examId = examId;
            } else {
                console.warn('[Payment Verify] ⚠️ Payment succeeded but no examId in metadata');
            }
        }

        res.json(responsePayload);
    } catch (error) {
        console.error('[Payment Verify] Error:', error);
        res.status(500).json({ error: 'Failed to verify payment. Please contact support.' });
    }
});

// 3.2 Stripe Webhook (for reliable payment confirmation)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify webhook signature (critical for security)
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`✅ Payment succeeded webhook: ${paymentIntent.id}`);

        // Extract metadata
        const { examId, userIp } = paymentIntent.metadata || {};

        if (examId && userIp) {
            // Grant 45-minute access (same as generate-exam endpoint)
            try {
                const accessData = grantAccess(userIp, examId);
                console.log(`✅ Webhook: Granted access for exam ${examId} to IP ${userIp}`);
                console.log(`   Session token: ${accessData.sessionToken.slice(0, 8)}...`);
                console.log(`   Expires: ${accessData.expiresAt}`);
            } catch (error) {
                console.error('❌ Webhook: Failed to grant access:', error);
            }
        } else {
            console.warn('⚠️ Webhook: Missing metadata (examId or userIp)');
        }
    }

    // Return 200 to acknowledge receipt
    res.json({ received: true });
});



// Health Check Endpoint (for Render, monitoring, etc.)
app.get('/health', (req, res) => {
    try {
        const cacheSize = getCache().length;
        const accessTokens = getAccessTokens().length;

        // Quick DB health check
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            cache: {
                examsAvailable: cacheSize
            },
            database: {
                accessTokens: accessTokens
            },
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve static files from the React frontend app
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // Temporarily commented out until we build the dist folder
    // app.get('/:path(.*)', (req, res) => {
    //     res.sendFile(path.join(distPath, 'index.html'));
    // });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
