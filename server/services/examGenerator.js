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

function sanitizeJson(jsonStr) {
    console.log('[JSON Sanitizer] Starting sanitization...');

    // 1. Remove markdown code blocks
    let clean = jsonStr.replace(/```json\n?|\n?```/g, '').trim();

    // 2. Fix common LaTeX formatting issues BEFORE parsing

    // Fix \cdotp (wrong) → \cdot (correct)
    clean = clean.replace(/\\cdotp/g, '\\cdot');

    // Fix \text{...} spacing
    clean = clean.replace(/(\d)(\\text\{)/g, '$1 $2');
    clean = clean.replace(/(\\text\{)([A-Za-z])/g, '$1 $2');

    // CRITICAL: Fix backslashes that are NOT valid JSON escapes
    // We want to preserve LaTeX commands like \frac, \text, etc.
    // But in JSON, "\" must be "\\".
    // So we replace single backslashes with double backslashes, 
    // UNLESS they are already part of a valid JSON escape sequence like \n, \t, \", \\.

    // Strategy:
    // 1. Replace double backslashes with a placeholder (to protect them)
    // 2. Replace remaining single backslashes with double backslashes
    // 3. Restore placeholders

    // However, the AI might output mixed content. 
    // A safer approach for "Bad escaped character":
    // Find backslashes that are followed by a character that is NOT a valid escape char.
    // Valid JSON escapes: " \ / b f n r t u

    // Regex: Backslash followed by NOT ["\/bfnrtu]
    // We use 4 backslashes in regex to match 1 literal backslash in string
    clean = clean.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');

    // Fix: Unescaped quotes inside strings
    // This is hard to do perfectly without a parser, but we can try to catch common cases
    // e.g. "explanation": "L'errore è "stupido"" -> "L'errore è \"stupido\""
    // This is risky, skipping for now to avoid breaking valid structure.

    console.log('[JSON Sanitizer] Applied LaTeX formatting fixes');

    return clean;
}

function repairAndParse(jsonStr) {
    // Attempt 1: Standard parse
    try {
        const result = JSON.parse(jsonStr);
        console.log('[JSON Parser] ✅ Standard parse successful');
        return result;
    } catch (e) {
        console.warn('[JSON Parser] ⚠️ Standard parse failed:', e.message);
    }

    // Attempt 2: Fix invalid escape sequences (Aggressive)
    try {
        let repaired = jsonStr;

        // Re-apply the backslash fix aggressively
        repaired = repaired.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');

        // Fix: Remove control characters
        repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        const result = JSON.parse(repaired);
        console.log('[JSON Parser] ✅ Repair attempt 1 successful');
        return result;
    } catch (e2) {
        console.warn('[JSON Parser] ⚠️ Repair attempt 1 failed:', e2.message);
    }

    // Attempt 3: "json5-like" relaxation (very aggressive)
    try {
        let cleaned = jsonStr;

        // Try to fix unescaped double quotes inside values
        // Look for: "key": "value with "quote" inside"
        // This is extremely hard. 
        // Alternative: Remove all backslashes that are causing issues?
        // cleaned = cleaned.replace(/\\/g, ''); // Too destructive for LaTeX

        // Try removing the specific offending sequence if possible?
        // No, we don't know where it is easily.

        console.log('[JSON Parser] Attempting aggressive cleaning...');

        // Last resort: If it's just a few bad chars, maybe we can strip them?
        // Let's try to parse with a permissive library if we had one.
        // Since we don't, let's try to fix the specific error "Bad escaped character"
        // by replacing ALL single backslashes with double, blindly, except for known good ones.

        cleaned = cleaned.replace(/\\/g, '\\\\'); // Double everything
        // Now fix the ones that were already good? 
        // \\" -> \\\\" (too many)
        // This is messy.

        // Let's rely on the previous fix being good enough for 99% of cases.
        // If we are here, it's FUBAR.

        throw new Error("Aggressive repair not implemented safely.");

    } catch (e3) {
        console.error('[JSON Parser] ❌ All repair attempts failed');
        console.error('[JSON Parser] Original error:', e3.message);
        // Log less to avoid massive logs, but enough to debug
        console.error('[JSON Parser] Input snippet (around error):', jsonStr.substring(Math.max(0, 30500), Math.min(jsonStr.length, 30700)));

        const detailedError = new Error(
            `JSON parsing failed. The AI generated invalid JSON. ` +
            `Error: ${e3.message}`
        );
        detailedError.name = 'JSONParseError';
        throw detailedError;
    }
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
      1. LIVELLO AVANZATO:
         - EASY: Applicazione diretta ma con trabocchetti concettuali.
         - MEDIUM: Problemi a DUE STEP (es. trova accelerazione -> poi trova spazio).
         - HARD: Problemi a TRE STEP o che richiedono di combinare due aree della fisica (es. cinematica + dinamica).
      2. CONTESTO MEDICO: Dove possibile, applica la fisica al corpo umano (es. circolazione sanguigna, polmoni, occhio, potenziali membrana).
      3. CALCOLI (NO CALCOLATRICE):
         - Usa SOLO numeri semplici (1, 2, 5, 10) o potenze di 10.
         - Oppure usa calcolo letterale (es. "v = sqrt(2gh)").
         - VIETATO usare numeri complessi (es. 3.14, 1.6x10^-19) se non si semplificano immediatamente.
       4. SARCASMO EDUCATIVO (CREATIVITÀ OBBLIGATORIA):
          - Sii brutalmente onesto nelle spiegazioni, ma VARIA il tipo di sarcasmo.
          - VIETATO usare formule ripetitive tipo "Se... forse...". Usa questi modelli:
            
            **Esempi di Sarcasmo Variato** (ruotali):
            1. "Errore da specializzando del primo anno ubriaco dopo il turno di notte."
            2. "Se applichi [risposta sbagliata], il paziente muore per [conseguenza fisica assurda]. Complimenti."
            3. "Hai confuso X con Y come confonderesti un cuore con un fegato. Torna sui libri di anatomia."
            4. "Questo calcolo è talmente sbagliato che violeresti le leggi della termodinamica. Impressionante."
            5. "Con questa logica, faresti esplodere un termometro provando a misurare la febbre."
            6. "Errore elementare. Questa la sapeva anche mio nonno, e non era medico."
            7. "Se curassi i pazienti come risolvi le equazioni, avremmo le celle frigorifere piene."
            8. "Risposta sbagliata. Ma almeno hai dimostrato creatività nell'ignorare la fisica."
            9. "Questo errore è classificabile come 'negligenza medica preventiva'."
            10. "Hai scelto l'opzione peggiore con la sicurezza di un chirurgo che tiene il bisturi al contrario."
            11. "Se questa fosse una domanda d'esame reale, saresti già bocciato e sotto inchiesta."
            12. "Complimenti, hai violato simultaneamente Newton, Bernoulli e il buonsenso."
          
          - Inserisci il sarcasmo IN MODO NATURALE nella spiegazione, non come appendice.
          - Varia il tono: cinico, ironico, freddo, sardonico. MAI gentile o incoraggiante.
          
       5. LINGUA:
          - Usa SOLO ITALIANO. Vietato usare connettivi inglesi come "Thus", "So", "Hence".
          
       6. SPIEGAZIONI ULTRA-DETTAGLIATE (FONDAMENTALE - MASSIMA PRIORITÀ):
          
          **Ogni spiegazione DEVE contenere**:
          
          a) **Setup Concettuale** (2-3 righe):
             - Identifica il principio fisico coinvolto
             - Dichiara esplicitamente le grandezze note e incognite
             - Esempio: "Problema di dinamica rotazionale. Noto: momento d'inerzia $I$, velocità angolare $\\omega$. Incognito: energia cinetica rotazionale."
          
          b) **Derivazione Formule** (se applicabile):
             - NON scrivere formule "dal nulla". Derival sempre.
             - Esempio SBAGLIATO: "Usiamo $E_k = \\frac{1}{2}mv^2$"
             - Esempio CORRETTO: "Dal teorema del lavoro-energia: $L = \\Delta E_k$. Per una forza costante: $L = F \\cdot s = ma \\cdot s$. Sostituendo $a = \\frac{v^2}{2s}$ (da cinematica): otteniamo $E_k = \\frac{1}{2}mv^2$."
          
          c) **Passaggi Algebrici Espliciti** (TUTTI):
             - Mai saltare steps. Mostra OGNI sostituzione, semplificazione, raccoglimento.
             - Esempio: Se vai da $F = ma$ a $a = \\frac{F}{m}$, scrivi: "Dividiamo entrambi i membri per $m$: $$F = ma \\Rightarrow \\frac{F}{m} = a$$"
             - Se sostituisci valori numerici, mostra il calcolo intermedio:
               Esempio: "$v = \\sqrt{2gh} = \\sqrt{2 \\cdot 10 \\cdot 5} = \\sqrt{100} = 10 \\text{ m/s}$"
          
          d) **Giustificazioni Fisiche**:
             - Spiega PERCHÉ usi una formula e non un'altra.
             - Esempio: "Usiamo conservazione dell'energia (non dinamica) perché le forze dissipative sono assenti."
          
          e) **Errori Comuni e Trappole**:
             - Anticipa almeno 1-2 errori che uno studente potrebbe fare.
             - Esempio: "ATTENZIONE: NON confondere velocità angolare $\\omega$ (rad/s) con frequenza $f$ (Hz). La relazione è $\\omega = 2\\pi f$."
          
          f) **Approssimazioni Dichiarate**:
             - Se usi $g = 10 \\text{ m/s}^2$ invece di $9.81$, scrivi: "Approssimazione standard: $g \\approx 10 \\text{ m/s}^2$"
             - Se trascuri l\\'attrito: "Assumiamo superficie priva di attrito (idealizzazione)."
          
          g) **Verifica Dimensionale** (opzionale ma apprezzata):
             - Esempio: "Verifica unità: $[E] = [m][v]^2 = \\text{kg} \\cdot (\\text{m/s})^2 = \\text{J}$ ✓"
          
          **LUNGHEZZA TARGET**: Ogni spiegazione dovrebbe essere 15-25 righe di testo formattato.
          **VIETATO**: "Ovviamente", "Chiaramente", "Banalmente", "Si vede facilmente", "Come è noto".
          **OBBLIGATORIO**: Trattare lo studente come se fosse lento ma recuperabile con pazienza (cinica).
       
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
      
      FORMATTAZIONE MATEMATICA (CRUCIALE - ATTENZIONE AI DETTAGLI):
      1. Usa SEMPRE e SOLO LaTeX per qualsiasi formula, numero con unità o variabile.
      2. Racchiudi il LaTeX tra dollari singoli per inline: $E = mc^2$.
      3. Usa doppi dollari per equazioni standalone complesse: $$\\frac{dV}{dt} = -\\frac{V}{RC}$$
      4. **UNITÀ DI MISURA**: Usa SEMPRE \\text{...} per le unità. MAI mescolare unità con comandi LaTeX.
         - ✅ CORRETTO: $v = 10 \\text{ m/s}$, $R = 0.08 \\text{ L}\\cdot\\text{atm}/\\text{mol}\\cdot\\text{K}$
         - ❌ SBAGLIATO: $v = 10 m/s$, $R = 0.08 L\\cdotpatm/mol\\cdotpK$
      5. **MOLTIPLICAZIONE**: Usa \\cdot (punto centrato) per moltiplicazioni, MAI \\cdotp.
      6. Esempio display: "L'equazione differenziale è: $$\\frac{d^2x}{dt^2} = -\\omega^2 x$$"
      
      STRUTTURA OUTPUT:
      1. Genera ESATTAMENTE 31 domande.
      2. Domande 1-15: 'multiple_choice' (5 opzioni A-E, 1 corretta).
      3. Domande 16-31: 'fill_in_the_blank' (Risposta secca: numero o parola).
      4. Difficoltà: ${difficulty === 'easy' ? 'easy = livello base MA comunque rigoroso e impegnativo' : difficulty === 'medium' ? 'medium = TOLC-MED standard PLUS (più elaborato e concettuale)' : 'hard = semestre filtro estremo, massima profondità concettuale'}.
      
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
    const cleanJson = sanitizeJson(content);
    const examData = repairAndParse(cleanJson);

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
