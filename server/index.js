require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Trust Proxy for Render/Heroku
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || '*', // Restrict in production
    methods: ['GET', 'POST']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json());

// DeepSeek Configuration
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// --- Data & Caching Helpers ---

const FORUM_FILE = path.join(__dirname, 'data', 'forum.json');
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

const getPosts = () => {
    try {
        if (!fs.existsSync(FORUM_FILE)) return [];
        const data = fs.readFileSync(FORUM_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading forum data:", e);
        return [];
    }
};

const savePosts = (posts) => {
    try {
        fs.writeFileSync(FORUM_FILE, JSON.stringify(posts, null, 2));
    } catch (e) {
        console.error("Error saving forum data:", e);
    }
};

// --- Core Logic ---

async function generateExamFromDeepSeek(topic, difficulty) {
    console.log(`[DeepSeek] Generating exam for topic: ${topic}, difficulty: ${difficulty}`);

    const isFullExam = topic === 'full';
    const topicPrompt = isFullExam
        ? "Copri l'intero syllabus del test di medicina (Cinematica, Dinamica, Fluidi, Termodinamica, Elettrostatica, Circuiti, Ottica) in modo bilanciato."
        : `Focalizzati esclusivamente sull'argomento: ${topic}. Scendi nei dettagli tecnici.`;

    const systemPrompt = `
      Sei un professore universitario d'élite, autore dei test di ammissione a Medicina (TOLC-MED/VET).
      Il tuo obiettivo è creare una simulazione "Semestre Filtro" estremamente rigorosa e selettiva.
      
      REGOLE DI QUALITÀ:
      1. Le domande devono essere di livello "Test di Ammissione Medicina" o superiore. Niente banalità.
      2. I calcoli devono essere fattibili senza calcolatrice (ma non banali), basati su ragionamento e stima.
      3. SARCASMO EDUCATIVO: Nelle spiegazioni ("explanation"), sii brutalmente onesto ma estremamente preciso. 
         Esempio: "Hai dimenticato di convertire le unità? Grave. In corsia questo uccide i pazienti. La risposta corretta deriva da..."
      
      FORMATTAZIONE MATEMATICA (CRUCIALE):
      1. Usa SEMPRE e SOLO LaTeX per qualsiasi formula, numero con unità o variabile.
      2. Racchiudi il LaTeX tra dollari singoli: $E = mc^2$.
      3. NON usare mai doppi dollari ($$) o parentesi quadre ([\\]).
      4. Esempio corretto: "La velocità è $v = 10 \\text{ m/s}$."
      
      STRUTTURA OUTPUT:
      1. Genera ESATTAMENTE 31 domande.
      2. Domande 1-15: 'multiple_choice' (5 opzioni, 1 corretta).
      3. Domande 16-31: 'fill_in_the_blank' (Risposta secca: numero o parola).
      4. Difficoltà: ${difficulty}.
      5. ${topicPrompt}
      
      Rispondi SOLO con un JSON valido:
      {
        "questions": [
          {
            "text": "Testo della domanda con formule in LaTeX $...$...",
            "type": "multiple_choice" | "fill_in_the_blank",
            "options": ["$A...$", "$B...$", "$C...$", "$D...$", "$E...$"],
            "correctAnswer": "Risposta esatta (es. $10 \\text{ J}$)",
            "explanation": "Spiegazione dettagliata, sarcastica e rigorosa con formule in LaTeX $...$..."
          }
        ]
      }
    `;

    const completion = await deepseek.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Genera l'esame. Non avere pietà, ma sii didatticamente ineccepibile." }
        ],
        model: "deepseek-reasoner",
        temperature: 0.7,
        response_format: { type: "json_object" },
        timeout: 120000 // 2 minutes timeout
    });

    const content = completion.choices[0].message.content;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '');
    return JSON.parse(jsonStr);
}

async function replenishCache(topic, difficulty) {
    console.log(`[Cache] Triggering background replenishment for ${topic}/${difficulty}`);
    try {
        const examData = await generateExamFromDeepSeek(topic, difficulty);

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

// --- Endpoints ---

// 1. Generate Exam (Cache-First Strategy)
app.post('/api/generate-exam', async (req, res) => {
    console.log('Received /api/generate-exam request');
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
        return res.status(400).json({ error: 'Topic and difficulty are required' });
    }

    // 1. Check Cache
    const cache = getCache();
    const cachedIndex = cache.findIndex(e => e.topic === topic && e.difficulty === difficulty);

    if (cachedIndex !== -1) {
        console.log(`[Cache] HIT for ${topic}/${difficulty}`);
        const exam = cache[cachedIndex];

        // Remove from cache (consume it)
        cache.splice(cachedIndex, 1);
        saveCache(cache);

        // Return immediately
        res.json({ questions: exam.questions });

        // Trigger background replenishment
        replenishCache(topic, difficulty);
        return;
    }

    console.log(`[Cache] MISS for ${topic}/${difficulty}. Falling back to synchronous generation.`);

    // 2. Fallback: Synchronous Generation
    try {
        const examData = await generateExamFromDeepSeek(topic, difficulty);
        res.json(examData);

        // Optionally cache this one too? No, it's consumed immediately.
        // But we should trigger a replenishment for NEXT time.
        replenishCache(topic, difficulty);

    } catch (error) {
        console.error('DeepSeek Error:', error);
        res.status(500).json({ error: 'Failed to generate exam. Please try again later.' });
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

// 3. Create Payment Intent (Stripe)
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 50, // €0.50
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3.1 Verify Payment Intent
app.get('/api/verify-payment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const paymentIntent = await stripe.paymentIntents.retrieve(id);
        res.json({ status: paymentIntent.status });
    } catch (error) {
        console.error('Stripe Verification Error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// 4. Forum Endpoints
app.get('/api/forum/posts', (req, res) => {
    const posts = getPosts();
    res.json(posts.reverse());
});

app.post('/api/forum/posts', (req, res) => {
    const { author, content, tag } = req.body;
    if (!content || !author) return res.status(400).json({ error: 'Content and author are required' });

    const posts = getPosts();
    const newPost = {
        id: Date.now().toString(),
        author,
        content,
        tag: tag || 'GENERAL',
        timestamp: new Date().toISOString(),
        likes: 0
    };

    posts.push(newPost);
    savePosts(posts);
    res.json(newPost);
});

app.post('/api/forum/posts/:id/like', (req, res) => {
    const { id } = req.params;
    const posts = getPosts();
    const postIndex = posts.findIndex(p => p.id === id);

    if (postIndex === -1) return res.status(404).json({ error: 'Post not found' });

    posts[postIndex].likes = (posts[postIndex].likes || 0) + 1;
    savePosts(posts);
    res.json(posts[postIndex]);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
