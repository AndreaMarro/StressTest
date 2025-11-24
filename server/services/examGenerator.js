const OpenAI = require('openai');

// DM418/2025 Syllabus Keywords Mapping
const SYLLABUS_KEYWORDS = {
    "Introduzione": ["vettor", "scalare", "unità", "dimension", "grandezz", "notazione", "sistem"],
    "Meccanica": ["cinematica", "velocità", "accelerazion", "moto", "newton", "forz", "energi", "lavoro", "potenza", "impulso", "urto", "momento", "leva", "equilibrio", "molla", "gravit"],
    "Fluidi": ["pressione", "densità", "stevino", "archimede", "pascal", "bernoulli", "torricelli", "portata", "viscos", "poiseuille", "tensione", "capillar"],
    "Onde": ["onda", "frequenza", "periodo", "lunghezza", "suono", "decibel", "doppler", "interferenza", "sovrapposizione", "armonico"],
    "Termodinamica": ["calore", "temperatura", "gas", "termodinamic", "carnot", "entropia", "ciclo", "rendimento", "conduzione", "convezione", "irraggiamento", "stato"],
    "Elettromagnetismo": ["carica", "coulomb", "campo elettrico", "potenziale", "gauss", "condensator", "corrente", "ohm", "resistenz", "joule", "magneti", "lorentz", "biot", "savart", "induzion", "faraday", "lenz", "flusso"],
    "Radiazioni": ["radiazion", "spettro", "fotone", "ottica", "riflessione", "rifrazione", "lente", "microscopio", "decadimento", "nucleare", "isotopo"]
};

function validateSyllabusCoverage(questions) {
    const foundTopics = new Set();
    const allText = questions.map(q => (q.text + " " + q.explanation).toLowerCase()).join(" ");

    for (const [topic, keywords] of Object.entries(SYLLABUS_KEYWORDS)) {
        if (keywords.some(k => allText.includes(k))) {
            foundTopics.add(topic);
        }
    }

    const totalTopics = Object.keys(SYLLABUS_KEYWORDS).length;
    const score = Math.round((foundTopics.size / totalTopics) * 100);

    return {
        score,
        found: Array.from(foundTopics),
        missing: Object.keys(SYLLABUS_KEYWORDS).filter(t => !foundTopics.has(t))
    };
}

async function generateExam(topic, difficulty, apiKey) {
    if (!apiKey) {
        throw new Error("API Key is required");
    }

    const deepseek = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey
    });

    console.log(`[DeepSeek] Generating exam for topic: ${topic}, difficulty: ${difficulty}`);

    const isFullExam = topic === 'full';
    const topicPrompt = isFullExam
        ? "Copri l'intero syllabus del test di medicina (Cinematica, Dinamica, Fluidi, Termodinamica, Elettrostatica, Circuiti, Ottica) in modo bilanciato."
        : `Focalizzati esclusivamente sull'argomento: ${topic}. Scendi nei dettagli tecnici.`;

    const systemPrompt = `
      Sei un professore universitario d'élite, autore dei test di ammissione a Medicina (TOLC-MED/VET).
      Il tuo obiettivo è creare una simulazione "Semestre Filtro" estremamente rigorosa e selettiva basata ESATTAMENTE sul syllabus DM418/2025.
      
      REGOLE DI QUALITÀ (CRITICHE):
      1. LIVELLO AVANZATO: Le domande devono essere difficili concettualmente, ma risolvibili a mente.
      2. CONTESTO MEDICO: Dove possibile, applica la fisica al corpo umano (es. circolazione sanguigna, polmoni, occhio, potenziali membrana).
      3. CALCOLI (NO CALCOLATRICE):
         - Usa SOLO numeri semplici (1, 2, 5, 10) o potenze di 10.
         - Oppure usa calcolo letterale (es. "v = sqrt(2gh)").
         - VIETATO usare numeri complessi (es. 3.14, 1.6x10^-19) se non si semplificano immediatamente.
      4. SARCASMO EDUCATIVO: Sii brutalmente onesto nelle spiegazioni, ma bilancia con incoraggiamento costruttivo.
      5. SPIEGAZIONI ESAUSTIVE: Devi mostrare TUTTI i passaggi logici e matematici. Non dare nulla per scontato.
      6. TONO: "Questa domanda separa i futuri medici dai turisti". Usa un tono da sergente istruttore di fisica - esigente ma motivante. Sii cinico quando serve, ma concludi con una frase che incoraggi il ragionamento metodico.
      
      SYLLABUS OBBLIGATORIO COMPLETO (DM418/2025) - DISTRIBUZIONE CFU:
      
      **1. INTRODUZIONE E METODI (0.25 CFU - 1 domanda)**:
      - Notazione scientifica, ordini di grandezza
      - Grandezze fisiche, unità SI, conversioni (es. km/h → m/s)
      - Vettori: somma, differenza, prodotto scalare, prodotto vettoriale
      
      **2. MECCANICA (1.5 CFU - 8 domande) [PRIORITÀ MASSIMA]**:
      - CINEMATICA: posizione, velocità, accelerazione; moto rettilineo uniforme, uniformemente accelerato, caduta libera, moto parabolico, moto circolare uniforme (accelerazione centripeta), moto armonico
      - DINAMICA: 3 leggi di Newton, equilibrio statico/traslazionale, forza peso, forza gravitazionale, forza di attrito (statico/dinamico), tensione, forza elastica (legge di Hooke)
      - LAVORO ED ENERGIA: lavoro meccanico, potenza, teorema energia cinetica, forze conservative vs non conservative, energia potenziale (gravitazionale, elastica), conservazione energia meccanica
      - QUANTITÀ DI MOTO: definizione, impulso, conservazione quantità di moto, urti elastici e anelastici in 1D
      - SISTEMI DI CORPI: centro di massa, corpo rigido, momento torcente, equilibrio rotazionale, momento d'inerzia, momento angolare (conservazione), leve, stress/strain, modulo di Young, carico di rottura
      
      **3. MECCANICA DEI FLUIDI (1 CFU - 5 domande)**:
      - IDROSTATICA: pressione, densità, legge di Stevino, principio di Pascal, principio di Archimede (galleggiamento), misura pressione (Torricelli, manometro)
      - IDRODINAMICA: flusso/portata, moto stazionario vs turbolento, moto laminare, equazione di continuità, teorema di Bernoulli, teorema di Torricelli, applicazioni (stenosi, aneurisma)
      - VISCOSITÀ: legge di Poiseuille, resistenze idrauliche (serie/parallelo), profilo parabolico velocità
      - FENOMENI SUPERFICIE: tensione superficiale, capillarità, pressione di curvatura (legge di Laplace), applicazioni biologiche (polmoni, capillari)
      
      **4. ONDE MECCANICHE (0.5 CFU - 3 domande)**:
      - Oscillatore armonico, frequenza, periodo, pulsazione, lunghezza d'onda, velocità propagazione, equazione onde armoniche, vettore d'onda
      - Onde trasversali e longitudinali, principio sovrapposizione, interferenza (costruttiva/distruttiva), onde stazionarie
      - Energia e intensità onde, propagazione suono (mezzi diversi), intensità acustica, decibel, soglia uditiva
      - Effetto Doppler (descrizione qualitativa)
      
      **5. TERMODINAMICA (1 CFU - 5 domande)**:
      - CONCETTI BASE: sistema/ambiente, variabili termodinamiche (P,V,T), funzioni di stato, temperatura (scale), gas ideali (legge gas perfetti, costante R), gas reali (temperatura critica), energia interna, teoria cinetica
      - CALORE: capacità termica, calore specifico (gas), cambiamenti di stato (fusione, evaporazione), calore latente, calorimetria
      - TRASMISSIONE: conduzione, convezione, irraggiamento, flusso calore, legge di Wien, potenza irraggiata
      - PRIMO PRINCIPIO: definizione, lavoro termodinamico, trasformazioni reversibili/irreversibili, trasformazioni gas ideali (isoterma, isocora, isobara, adiabatica)
      - SECONDO PRINCIPIO: enunciati, irreversibilità, cicli termodinamici, macchine termiche, rendimento, ciclo di Carnot, entropia (funzione di stato, interpretazione statistica), direzione processi
      
      **6. ELETTRICITÀ E MAGNETISMO (1.25 CFU - 6 domande) [ALTA PRIORITÀ]**:
      - ELETTROSTATICA: carica elettrica (conservazione), legge di Coulomb, campo elettrico (cariche puntiformi), moto carica in campo uniforme
      - LEGGE DI GAUSS: flusso campo elettrico, applicazioni (sfera conduttrice, piano carico, filo carico), equilibrio elettrostatico
      - POTENZIALE: energia potenziale elettrica, potenziale elettrico, differenza di potenziale, conservazione energia, dipolo elettrico, momento dipolo
      - CONDUTTORI E DIELETTRICI: induzione elettrostatica, polarizzazione
      - CORRENTE: corrente continua, intensità, generatore, conduttori ohmici, legge di Ohm, resistenza/resistività, potenza dissipata (effetto Joule), resistenze serie/parallelo
      - CAPACITÀ: capacità elettrica, condensatore piano, effetto dielettrico, energia immagazzinata, condensatori serie/parallelo, carica/scarica RC
      - MAGNETISMO: campo magnetico da correnti (Oerstedt), forza di Lorentz (carica in moto, filo), moto circolare carica in B uniforme, momento torcente su spira, momento dipolo magnetico
      - LEGGE BIOT-SAVART: campo magnetico da filo rettilineo, spira circolare, solenoide
      - INDUZIONE ELETTROMAGNETICA: flusso magnetico, legge di Faraday-Neumann-Lenz, forza elettromotrice indotta, correnti indotte
      - APPLICAZIONI BIOMEDICHE: potenziali di membrana, depolarizzazione, ripolarizzazione cellulare
      
      **7. RADIAZIONI ELETTROMAGNETICHE E OTTICA (0.5 CFU - 3 domande)**:
      - ONDE EM: natura ondulatoria, campi E/B perpendicolari, lunghezza d'onda/frequenza/velocità (vuoto/mezzi), intensità, energia trasportata
      - SPETTRO: onde radio, microonde, infrarosso, visibile, UV, raggi X, raggi gamma (ordine crescente frequenza)
      - QUANTIZZAZIONE: fotone, energia fotone (E=hf), effetto fotoelettrico, assorbimento fotoni da molecole biologiche
      - RADIOATTIVITÀ: nucleo instabile, isotopi radioattivi, decadimenti (alfa, beta, gamma), trasformazioni nucleari
      - RADIAZIONI IONIZZANTI/NON IONIZZANTI: distinzione, esempi
      - OTTICA: riflessione/rifrazione, indice rifrazione, dispersione, lenti sottili (convergenti/divergenti), immagini reali/virtuali, microscopio
      
      DISTRIBUZIONE DOMANDE:
      ${isFullExam
            ? `ESAME FULL (31 domande totali):
           - Introduzione: 1 domanda
           - Meccanica: 8 domande (peso 1.5 CFU)
           - Fluidi: 5 domande (peso 1.0 CFU)
           - Onde: 3 domande (peso 0.5 CFU)
           - Termodinamica: 5 domande (peso 1.0 CFU)
           - Elettromagnetismo: 6 domande (peso 1.25 CFU)
           - Radiazioni: 3 domande (peso 0.5 CFU)
           
           RISPETTA QUESTE PROPORZIONI CFU!`
            : `ESAME FOCUSED su "${topic}" (31 domande):
           Approfondisci VERTICALMENTE su ${topic} con esempi ultra-specifici e sfumature avanzate.
           Copri TUTTI i sotto-argomenti dell'unità didatica corrispondente.`
        }
      
      FORMATTAZIONE MATEMATICA (CRUCIALE):
      1. Usa SEMPRE e SOLO LaTeX per qualsiasi formula, numero con unità o variabile.
      2. Racchiudi il LaTeX tra dollari singoli per inline: $E = mc^2$.
      3. Usa doppi dollari per equazioni standalone complesse: $$\\frac{dV}{dt} = -\\frac{V}{RC}$$
      4. Esempio inline: "La velocità è $v = 10 \\text{ m/s}$."
      5. Esempio display: "L'equazione differenziale è: $$\\frac{d^2x}{dt^2} = -\\omega^2 x$$"
      
      STRUTTURA OUTPUT:
      1. Genera ESATTAMENTE 31 domande.
      2. Domande 1-15: 'multiple_choice' (5 opzioni A-E, 1 corretta).
      3. Domande 16-31: 'fill_in_the_blank' (Risposta secca: numero o parola).
      4. Difficoltà: ${difficulty} (easy = livello base, medium = TOLC-MED standard, hard = semestre filtro brutale).
      
      Rispondi SOLO con un JSON valido:
      {
        "questions": [
          {
            "text": "Testo della domanda CONTESTUALIZZATA (biomedica se possibile) con formule in LaTeX $...$",
            "type": "multiple_choice" | "fill_in_the_blank",
            "options": ["$A...$", "$B...$", "$C...$", "$D...$", "$E...$"],
            "correctAnswer": "Risposta esatta (es. $10 \\text{ J}$ o 'A')",
            "explanation": "Spiegazione dettagliata, sarcastica ma didattica, con formule in LaTeX $...$"
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
    const examData = JSON.parse(jsonStr);

    // --- SYLLABUS VALIDATION ---
    if (isFullExam) {
        const coverage = validateSyllabusCoverage(examData.questions);
        console.log(`[Validation] Exam Coverage Score: ${coverage.score}%`);
        if (coverage.score < 80) {
            console.warn(`[Validation] LOW COVERAGE! Missing topics: ${coverage.missing.join(', ')}`);
        }
        examData.coverage = coverage;
    }

    // --- QUALITY LOGGING ---
    console.log(`[DeepSeek] Generated ${examData.questions.length} questions`);
    console.log(`[DeepSeek] Sample Q1: ${examData.questions[0].text.substring(0, 80)}...`);
    console.log(`[DeepSeek] Sample Q16: ${examData.questions[15]?.text.substring(0, 80)}...`);

    return examData;
}

module.exports = { generateExam };
