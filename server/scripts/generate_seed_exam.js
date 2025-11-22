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
    const NUM_EXAMS = 3;
    console.log(`Starting batch generation of ${NUM_EXAMS} exams (Timeout: 5 mins each)...`);

    for (let i = 0; i < NUM_EXAMS; i++) {
        console.log(`\n--- Generating Exam ${i + 1}/${NUM_EXAMS} ---`);

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
          4. Difficoltà: medium.
          5. Copri l'intero syllabus del test di medicina (Cinematica, Dinamica, Fluidi, Termodinamica, Elettrostatica, Circuiti, Ottica) in modo bilanciato.
          
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
                topic: 'full',
                difficulty: 'medium',
                questions: parsed.questions,
                timestamp: new Date().toISOString()
            });

            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
            console.log(`✅ Exam ${i + 1} generated and cached successfully!`);

        } catch (error) {
            console.error(`❌ Generation failed for Exam ${i + 1}:`, error);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

generateSeedExam();
