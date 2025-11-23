const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { generateExam } = require('../services/examGenerator');

const CACHE_FILE = path.join(__dirname, '../data/exam_cache.json');
// Checkpoint file to resume progress
const CHECKPOINT_FILE = path.join(__dirname, '../data/populate_cache_checkpoint.json');


// Helper per leggere/scrivere con un minimo di sicurezza (anche se in questo script siamo sequenziali)
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

// Configurazione Target Massivo
const TARGETS = [];

// 1. Full Exams (Alta priorità - ne servono tanti per le simulazioni complete)
for (let i = 0; i < 10; i++) {
    TARGETS.push({ topic: 'full', difficulty: 'medium' });
}

// 2. Meccanica (Topic più grosso - servono variazioni)
for (let i = 0; i < 5; i++) {
    TARGETS.push({ topic: 'Meccanica', difficulty: 'medium' });
}

// 3. Altri Topic (Copertura base robusta)
const OTHER_TOPICS = [
    'Introduzione e Metodi',
    'Meccanica dei Fluidi',
    'Onde Meccaniche',
    'Termodinamica',
    'Elettricità e Magnetismo',
    'Radiazioni e Ottica'
];

OTHER_TOPICS.forEach(topic => {
    for (let i = 0; i < 3; i++) {
        TARGETS.push({ topic, difficulty: 'medium' });
    }
});

// Shuffle targets per varietà immediata se si interrompe
TARGETS.sort(() => Math.random() - 0.5);

// Load checkpoint if exists
let startIndex = 0;
if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
        const checkpointData = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
        if (typeof checkpointData.lastIndex === 'number') {
            startIndex = checkpointData.lastIndex + 1; // resume after last completed
        }
    } catch (e) {
        console.error('Error reading checkpoint file:', e);
    }
}


async function run() {
    console.log(`Starting MASSIVE cache population. Target: ${TARGETS.length} exams.`);
    console.log("Estimated time: ~30-40 minutes.");

    if (!process.env.DEEPSEEK_API_KEY) {
        console.error("DEEPSEEK_API_KEY not found in environment variables.");
        process.exit(1);
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = startIndex; i < TARGETS.length; i++) {
        const target = TARGETS[i];
        console.log(`[${i + 1}/${TARGETS.length}] Generating ${target.topic} (${target.difficulty})...`);

        try {
            const startTime = Date.now();
            const examData = await generateExam(target.topic, target.difficulty, process.env.DEEPSEEK_API_KEY);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            // Rileggi cache fresca prima di scrivere
            const cache = getCache();
            cache.push({
                id: Date.now().toString(),
                topic: target.topic,
                difficulty: target.difficulty,
                questions: examData.questions,
                timestamp: new Date().toISOString(),
                coverage: examData.coverage // Salviamo anche i dati di coverage se presenti
            });
            saveCache(cache);

            console.log(`✅ Saved ${target.topic} in ${duration}s. (Total Cache: ${cache.length})`);
            successCount++;

            // Update checkpoint after successful generation
            try {
                fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ lastIndex: i }, null, 2));
            } catch (e) {
                console.error('Error writing checkpoint file:', e);
            }

            // Delay adattivo: 5s base + random 0-5s per sembrare più naturale e far respirare l'API
            const delay = 5000 + Math.random() * 5000;
            console.log(`Waiting ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (e) {
            console.error(`❌ Failed to generate ${target.topic}:`, e.message);
            failCount++;
            // Wait longer on error
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    console.log(`\nMassive generation complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    // Cleanup checkpoint after completion
    if (fs.existsSync(CHECKPOINT_FILE)) {
        fs.unlinkSync(CHECKPOINT_FILE);
    }
}

run();

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Exiting gracefully...');
    // Optionally, could write current index to checkpoint here if needed
    process.exit(0);
});
