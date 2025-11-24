const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const OpenAI = require('openai');
const fs = require('fs');

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
});

const OUTPUT_FILE = path.join(__dirname, 'audit_exam.json');

async function generateAuditExam() {
  console.log(`--- Generating Single Audit Exam (Topic: Meccanica, Diff: Medium) ---`);

  const topic = 'Meccanica';
  const diff = 'medium';
  const topicPrompt = `Focalizzati ESCLUSIVAMENTE sull'argomento: ${topic}. Copri tutti i sotto-argomenti pertinenti.`;
  const diffPrompt = "Livello: INTERMEDIO. Richiede ragionamento e calcoli a mente non banali.";

  const systemPrompt = `
      Sei un professore universitario d'élite, autore dei test di ammissione a Medicina (TOLC-MED/VET).
      Il tuo obiettivo è creare una simulazione "Semestre Filtro" estremamente rigorosa e selettiva.
      
      REGOLE DI QUALITÀ (CRITICHE):
      1. LIVELLO AVANZATO:
         - EASY: Applicazione diretta ma con trabocchetti concettuali.
         - MEDIUM: Problemi a DUE STEP (es. trova accelerazione -> poi trova spazio).
         - HARD: Problemi a TRE STEP o che richiedono di combinare due aree della fisica (es. cinematica + dinamica).
      2. CONTESTO MEDICO: Dove possibile, applica la fisica al corpo umano (es. circolazione sanguigna, polmoni, occhio, potenziali membrana).
      3. CALCOLI (NO CALCOLATRICE):
         - Usa SOLO numeri semplici (1, 2, 5, 10) o potenze di 10.
         - Oppure usa calcolo letterale (es. "v = sqrt(2gh)").
         - VIETATO usare numeri complessi (es. 3.14, 1.6x10^-19) se non si semplificano immediatamente.
      4. SARCASMO EDUCATIVO:
         - Sii brutalmente onesto nelle spiegazioni.
         - Varia gli insulti: usa ironia sulla loro futura carriera medica (es. "Se sbagli questo, farai danni in corsia").
         - NON essere ripetitivo con "se... forse...". Sii creativo.
      5. LINGUA:
         - Usa SOLO ITALIANO. Vietato usare connettivi inglesi come "Thus", "So", "Hence".
      6. SPIEGAZIONI ULTRA-DETTAGLIATE (FONDAMENTALE):
         - Mostra OGNI SINGOLO passaggio matematico.
         - Spiega il PERCHÉ di ogni scelta.
         - Se c'è un'approssimazione, DICHIARALA.
         - Anticipa errori comuni e SPIEGA perché sono sbagliati.
         - NESSUN "ovviamente", "chiaramente". SPIEGA TUTTO.
      
      SYLLABUS OBBLIGATORIO:
      ${topicPrompt}
      
      FORMATTAZIONE MATEMATICA (CRUCIALE):
      1. Usa SEMPRE e SOLO LaTeX per qualsiasi formula, numero con unità o variabile.
      2. Racchiudi il LaTeX tra dollari singoli: $E = mc^2$.
      3. NON usare mai doppi dollari ($$) o parentesi quadre ([\\]).
      4. Esempio corretto: "La velocità è $v = 10 \\text{ m/s}$."
      
      STRUTTURA OUTPUT:
      1. Genera ESATTAMENTE 5 domande (per test rapido).
      2. Domande 1-3: 'multiple_choice'.
      3. Domande 4-5: 'fill_in_the_blank'.
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
      timeout: 120000
    });

    const content = completion.choices[0].message.content;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(jsonStr);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2));
    console.log(`✅ Audit Exam generated successfully to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error(`❌ Generation failed:`, error);
  }
}

generateAuditExam();
