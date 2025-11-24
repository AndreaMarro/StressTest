const fs = require('fs');
const path = require('path');
const http = require('http');

const ACCESS_FILE = path.join(__dirname, '../data/access_tokens.json');
const API_URL = 'http://localhost:3000/api/verify-access';

const CACHE_FILE = path.join(__dirname, '../data/exam_cache.json');

// 1. Get a real exam ID
let realExamId = 'test_exam_' + Date.now();
if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (cache.length > 0) {
        realExamId = cache[0].id;
        console.log(`Using existing exam ID: ${realExamId}`);
    } else {
        console.warn('Warning: Cache is empty, test might fail with 404');
    }
}

const fakeSessionToken = 'test_token_' + Date.now();
const now = new Date();
const expiresAt = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

const fakeEntry = {
    ip: '1.2.3.4', // Different IP than localhost
    examId: realExamId,
    sessionToken: fakeSessionToken,
    purchaseTimestamp: now.toISOString(),
    expiresAt: expiresAt
};

console.log('--- Starting Verification ---');
console.log('1. Adding fake token to access_tokens.json');
console.log(`   ExamID: ${realExamId}`);
console.log(`   Token: ${fakeSessionToken}`);

let tokens = [];
if (fs.existsSync(ACCESS_FILE)) {
    tokens = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
}
tokens.push(fakeEntry);
fs.writeFileSync(ACCESS_FILE, JSON.stringify(tokens, null, 2));

// 2. Call verify-access
console.log('2. Calling verify-access endpoint...');

const postData = JSON.stringify({
    examId: realExamId,
    sessionToken: fakeSessionToken
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/verify-access',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`   Status Code: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('   Response:', data);
        const response = JSON.parse(data);

        // 3. Verify result
        if (response.hasAccess === true) {
            console.log('✅ SUCCESS: Access granted with valid token despite IP mismatch (simulated)');
        } else {
            console.error('❌ FAILURE: Access denied');
        }

        // 4. Cleanup
        console.log('3. Cleaning up fake token...');
        const currentTokens = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
        const filtered = currentTokens.filter(t => t.sessionToken !== fakeSessionToken);
        fs.writeFileSync(ACCESS_FILE, JSON.stringify(filtered, null, 2));
        console.log('--- Verification Complete ---');
    });
});

req.on('error', (e) => {
    console.error(`❌ Problem with request: ${e.message}`);
    // Cleanup on error too
    const currentTokens = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
    const filtered = currentTokens.filter(t => t.sessionToken !== fakeSessionToken);
    fs.writeFileSync(ACCESS_FILE, JSON.stringify(filtered, null, 2));
});

req.write(postData);
req.end();
