require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

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

// --- Endpoints ---

// 1. Generate Exam (DeepSeek Proxy)
app.post('/api/generate-exam', async (req, res) => {
    try {
        const { topic, difficulty } = req.body;

        if (!topic || !difficulty) {
            return res.status(400).json({ error: 'Topic and difficulty are required' });
        }

        const isFullExam = topic === 'full';
        const topicPrompt = isFullExam
            ? "Copri l'intero syllabus del corso (Meccanica, Fluidi, Termo, Elettromagnetismo, Ottica) in modo bilanciato."
            : `Focalizzati esclusivamente sull'argomento: ${topic}.`;

        const systemPrompt = `
      Sei un professore universitario di Fisica per Medicina. Genera una simulazione d'esame rigorosa.
      
      REGOLE FONDAMENTALI:
      1. Genera ESATTAMENTE 31 domande.
      2. STRUTTURA RIGIDA:
         - Domande 1-15: 'multiple_choice' con 5 opzioni (A, B, C, D, E). Una sola corretta.
         - Domande 16-31: 'fill_in_the_blank'. La risposta deve essere un numero o una parola/breve frase concisa.
      3. Usa il formato LaTeX standard per le formule, racchiuso tra dollari singoli (es. $E = mc^2$). NON usare doppio dollaro o parentesi quadre.
      4. Difficoltà: ${difficulty}. 
      5. ${topicPrompt}
      6. Rispondi SOLO con un JSON valido che rispetta questo schema:
      {
        "questions": [
          {
            "text": "Testo della domanda...",
            "type": "multiple_choice" | "fill_in_the_blank",
            "options": ["A...", "B...", "C...", "D...", "E..."], // Solo per multiple_choice
            "correctAnswer": "Risposta esatta",
            "explanation": "Spiegazione dettagliata..."
          }
        ]
      }
    `;

        const completion = await deepseek.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Genera l'esame ora." }
            ],
            model: "deepseek-reasoner",
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        // Clean up potential markdown code blocks
        const jsonStr = content.replace(/```json\n?|\n?```/g, '');
        const parsed = JSON.parse(jsonStr);

        res.json(parsed);

    } catch (error) {
        console.error('DeepSeek Error:', error);
        res.status(500).json({ error: 'Failed to generate exam' });
    }
});

// 2. Generate Study Plan (DeepSeek Proxy)
app.post('/api/generate-study-plan', async (req, res) => {
    try {
        const { wrongAnswers } = req.body;

        const wrongText = wrongAnswers.map(q => `- ${q.text} (Risposta corretta: ${q.correctAnswer})`).join('\n');
        const prompt = `
      Analizza questi errori fatti da uno studente in un esame di fisica per medicina:
      ${wrongText}
      
      Fornisci un piano di studio sintetico e strutturato (massimo 3 punti chiave) per migliorare. 
      Usa un tono incoraggiante e professionale. Formatta usando markdown standard.
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
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 49, // €0.49
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
