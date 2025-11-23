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

// Targeted population for missing topics
const MISSING_TOPICS = [
    { topic: 'Termodinamica', count: 5 },
    { topic: 'Elettromagnetismo', count: 5 },
    { topic: 'Radiazioni', count: 5 }
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

async function run() {
    console.log('\n🎯 Populating cache for MISSING TOPICS');
    console.log('=====================================\n');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.error("❌ DEEPSEEK_API_KEY not found");
        process.exit(1);
    }

    const cache = getCache();
    console.log(`📦 Current cache size: ${cache.length} exams\n`);

    let totalSuccess = 0;
    let totalFail = 0;

    for (const { topic, count } of MISSING_TOPICS) {
        console.log(`\n📚 Generating ${count} exams for: ${topic}`);
        console.log('─'.repeat(50));

        for (let i = 0; i < count; i++) {
            // Distribute difficulties: 2 medium, 2 hard, 1 easy
            const difficulty = i < 2 ? 'medium' : i < 4 ? 'hard' : 'easy';

            console.log(`[${i + 1}/${count}] ${topic} (${difficulty})...`);

            try {
                const startTime = Date.now();
                const examData = await generateExam(topic, difficulty, process.env.DEEPSEEK_API_KEY);
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);

                // Add to cache
                const freshCache = getCache();
                freshCache.push({
                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                    topic: topic,
                    difficulty: difficulty,
                    questions: examData.questions,
                    timestamp: new Date().toISOString()
                });
                saveCache(freshCache);

                console.log(`✅ Generated in ${duration}s (Total: ${freshCache.length})`);
                totalSuccess++;

                // Delay between requests (API courtesy)
                if (i < count - 1) {
                    const delay = 5000 + Math.random() * 3000;
                    console.log(`⏳ Waiting ${Math.round(delay / 1000)}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (e) {
                console.error(`❌ Failed:`, e.message);
                totalFail++;
                // Longer delay on error
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    const finalCache = getCache();
    console.log('\n\n🎉 POPULATION COMPLETE');
    console.log('======================');
    console.log(`✅ Success: ${totalSuccess}`);
    console.log(`❌ Failed: ${totalFail}`);
    console.log(`📦 Final cache size: ${finalCache.length} exams`);

    // Show distribution
    console.log('\n📊 Current Distribution:');
    const dist = {};
    finalCache.forEach(e => {
        const key = e.topic;
        dist[key] = (dist[key] || 0) + 1;
    });
    Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([topic, count]) => {
        console.log(`   ${topic}: ${count}`);
    });
}

run().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Interrupted. Progress saved. Run again to resume.');
    process.exit(0);
});
