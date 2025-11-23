const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { generateExam } = require('../services/examGenerator');

const CACHE_FILE = path.join(__dirname, '../data/exam_cache.json');

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

const TARGETS = [
    { topic: 'Termodinamica', difficulty: 'medium' },
    { topic: 'Elettricità e Magnetismo', difficulty: 'medium' },
    { topic: 'Radiazioni e Ottica', difficulty: 'medium' },
    { topic: 'full', difficulty: 'medium' }
];

async function run() {
    console.log("Starting batch generation...");

    if (!process.env.DEEPSEEK_API_KEY) {
        console.error("DEEPSEEK_API_KEY not found in environment variables.");
        process.exit(1);
    }

    for (const target of TARGETS) {
        console.log(`Generating ${target.topic}...`);
        try {
            const examData = await generateExam(target.topic, target.difficulty, process.env.DEEPSEEK_API_KEY);

            const cache = getCache();
            cache.push({
                id: Date.now().toString(),
                topic: target.topic,
                difficulty: target.difficulty,
                questions: examData.questions,
                timestamp: new Date().toISOString()
            });
            saveCache(cache);
            console.log(`Saved ${target.topic} to cache.`);

            // Wait a bit to avoid hitting strict rate limits
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (e) {
            console.error(`Failed to generate ${target.topic}:`, e.message);
        }
    }

    console.log("Batch generation complete.");
}

run();
