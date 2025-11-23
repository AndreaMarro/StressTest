const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');
const fs = require('fs');

const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

const CACHE_FILE = path.join(__dirname, '../data/exam_cache.json');

async function generateSeedExam() {
    const TOPICS = [
        'full',
        'Introduzione e Metodi',
        'Meccanica',
        'Meccanica dei Fluidi',
        'Onde Meccaniche',
        'Termodinamica',
        'Elettricità e Magnetismo',
        'Radiazioni e Ottica'
    ];
    const DIFFICULTIES = ['easy', 'medium', 'hard'];

    console.log(`Starting comprehensive seed generation...`);

    // We want at least one for each combination.
    // To save time, we will prioritize 'full' exams and then do one of each topic.
    // Total combinations: 8 topics * 3 difficulties = 24 exams.
    // We will do a randomized subset or sequential if we have time.
    // Let's do:
    // 1. Full (Easy, Medium, Hard)
    // 2. Then loop through topics with random difficulties or just Medium for now to ensure coverage.

    // Actually, user asked for "at least one test for each topic and difficulty".
    // That is 24 exams. DeepSeek will take time.
    // We will implement the loop but maybe add a check to skip if cache already has it?
    // No, we want to populate.

    const queue = [];
    for (const topic of TOPICS) {
        for (const diff of DIFFICULTIES) {
            queue.push({ topic, diff });
        }
    }

    console.log(`Queue size: ${queue.length} exams.`);

    for (let i = 0; i < queue.length; i++) {
        const { topic, diff } = queue[i];
        console.log(`\n--- Generating Exam ${i + 1}/${queue.length}: ${topic} [${diff}] ---`);

        let topicPrompt = "";
        if (topic === 'full') {
            topicPrompt = "Copri l'intero syllabus del test di medicina (Cinematica, Dinamica, Fluidi, Termodinamica, Elettrostatica, Circuiti, Ottica) in modo bilanciato.";
        } else {
            topicPrompt = `Focalizzati ESCLUSIVAMENTE sull'argomento: ${topic}. Copri tutti i sotto-argomenti pertinenti.`;
        }

        let diffPrompt = "";
        if (diff === 'easy') diffPrompt = "Livello: BASE. Domande concettuali, calcoli immediati.";
        if (diff === 'medium') diffPrompt = "Livello: INTERMEDIO. Richiede ragionamento e calcoli a mente non banali.";
        if (diff === 'hard') diffPrompt = "Livello: AVANZATO/COMPLESSO. Domande trabocchetto, calcoli a più step, concetti profondi.";

        const systemPrompt = `
          Sei un professore universitario d'élite, autore dei test di ammissione a Medicina (TOLC-MED/VET).
          Il tuo obiettivo è creare una simulazione "Semestre Filtro" estremamente rigorosa e selettiva.
          
          REGOLE DI QUALITÀ (CRITICHE):
          1. LIVELLO AVANZATO: Le domande devono essere difficili concettualmente, ma risolvibili a mente.
          2. CONTESTO MEDICO: Dove possibile, applica la fisica al corpo umano.
          3. CALCOLI (NO CALCOLATRICE):
             - Usa SOLO numeri semplici (1, 2, 5, 10) o potenze di 10.
             - Oppure usa calcolo letterale (es. "v = sqrt(2gh)").
             - VIETATO usare numeri complessi (es. 3.14, 1.6x10^-19) se non si semplificano immediatamente.
          4. SARCASMO EDUCATIVO E DETTAGLIO:
             - Sii brutalmente onesto e cinico (stile Dr. House).
             - LE SPIEGAZIONI DEVONO ESSERE DETTAGLIATE E ISTRUTTIVE.
             - Non limitarti a dare la formula. Spiega il *perché* fisico, il ragionamento passo-passo, e perché le alternative errate sono trappole.
             - Includi i passaggi algebrici intermedi.
             - Concludi sempre con un commento sarcastico sulla competenza dello studente.
          
          SYLLABUS OBBLIGATORIO:
          ${topicPrompt}
          
          FORMATTAZIONE MATEMATICA (CRUCIALE):
          1. Usa SEMPRE e SOLO LaTeX per qualsiasi formula, numero con unità o variabile.
          2. Racchiudi il LaTeX tra dollari singoli: $E = mc^2$.
          3. NON usare mai doppi dollari ($$) o parentesi quadre ([\\]).
          4. Esempio corretto: "La velocità è $v = 10 \\text{ m/s}$."
          
          STRUTTURA OUTPUT:
          1. Genera ESATTAMENTE 31 domande.
          2. Domande 1-15: 'multiple_choice' (5 opzioni, 1 corretta).
          3. Domande 16-31: 'fill_in_the_blank' (Risposta secca: numero o parola).
          4. Difficoltà: ${diff}.
          5. ${diffPrompt}
          
          Rispondi SOLO con un JSON valido:
          {
            "questions": [
              {
                "text": "Testo della domanda (CONTESTUALIZZATA) con formule in LaTeX $...$...",
                "type": "multiple_choice" | "fill_in_the_blank",
                "options": ["$A...$", "$B...$", "$C...$", "$D...$", "$E...$"],
                "correctAnswer": "Risposta esatta (es. $10 \\text{ J}$)",
                "explanation": "Spiegazione dettagliata, sarcastica e rigorosa con formule in LaTeX $...$..."
              }
            ]
          }
        `;

        try {
            const completion = await deepseek.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Genera l'esame. Non avere pietà, ma sii didatticamente ineccepibile." }
                ],
                model: "deepseek-reasoner",
                temperature: 0.7,
                response_format: { type: "json_object" },
                timeout: 300000 // 5 minutes
            });

            const content = completion.choices[0].message.content;
            const jsonStr = content.replace(/```json\n?|\n?```/g, '');
            const parsed = JSON.parse(jsonStr);

            // Ensure directory exists
            const dir = path.dirname(CACHE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Read existing cache or init
            let cache = [];
            if (fs.existsSync(CACHE_FILE)) {
                cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            }

            // Add new exam
            cache.push({
                id: Date.now().toString(),
                topic: topic === 'full' ? 'full' : topic, // Ensure consistency
                difficulty: diff,
                questions: parsed.questions,
                timestamp: new Date().toISOString()
            });

            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
            console.log(`✅ Exam ${i + 1} generated and cached successfully! (${topic} - ${diff})`);

        } catch (error) {
            console.error(`❌ Generation failed for Exam ${i + 1} (${topic} - ${diff}):`, error);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n🎉 Completed full cycle of ${queue.length} exams. Restarting generation...\n`);
}

// Run infinitely
(async () => {
    console.log('🔁 Starting INFINITE exam generation loop...\n');
    while (true) {
        await generateSeedExam();
        // Small delay before restarting the cycle
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
})();
