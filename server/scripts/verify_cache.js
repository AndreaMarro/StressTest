const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/exam_cache.json');

try {
    if (!fs.existsSync(CACHE_FILE)) {
        console.log("Cache file not found.");
        process.exit(0);
    }
    const data = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(data);

    console.log(`Total Exams: ${cache.length}`);

    const distribution = {};
    const difficultyDist = {};

    cache.forEach(exam => {
        // Topic count
        distribution[exam.topic] = (distribution[exam.topic] || 0) + 1;

        // Difficulty count per topic
        if (!difficultyDist[exam.topic]) {
            difficultyDist[exam.topic] = { easy: 0, medium: 0, hard: 0 };
        }
        if (exam.difficulty) {
            difficultyDist[exam.topic][exam.difficulty] = (difficultyDist[exam.topic][exam.difficulty] || 0) + 1;
        }
    });

    console.log("\nTopic Distribution:");
    Object.entries(distribution).forEach(([topic, count]) => {
        console.log(`- ${topic}: ${count}`);
        if (difficultyDist[topic]) {
            console.log(`  (Easy: ${difficultyDist[topic].easy}, Medium: ${difficultyDist[topic].medium}, Hard: ${difficultyDist[topic].hard})`);
        }
    });

} catch (e) {
    console.error("Error:", e.message);
}
