
// Verification Script for StressTest Fixes

// --- 1. Score Calculation Logic (Copied from App.tsx/pdfExport.ts) ---
const levenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

const compareAnswer = (user, correct) => {
    if (!user || user.trim() === '') return false;

    // Normalize
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const userNorm = normalize(user);
    const correctNorm = normalize(correct);

    // Exact Match
    if (userNorm === correctNorm) return true;

    // Number Extraction
    const extractNumber = (str) => {
        const match = str.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/);
        return match ? match[0] : null;
    };
    const userNumber = extractNumber(userNorm);
    const correctNumber = extractNumber(correctNorm);

    // If both have numbers, compare numerically ONLY
    if (userNumber && correctNumber) {
        const userNum = parseFloat(userNumber.replace(',', '.'));
        const correctNum = parseFloat(correctNumber.replace(',', '.'));
        if (!isNaN(userNum) && !isNaN(correctNum)) {
            const tolerance = Math.abs(correctNum * 0.05);
            return Math.abs(userNum - correctNum) <= tolerance;
        }
    }

    // Text Matching
    const cleanUserText = userNorm.replace(/\s+/g, ' ').trim();
    const cleanCorrectText = correctNorm.replace(/\s+/g, ' ').trim();
    const noSpaceUser = userNorm.replace(/\s+/g, '');
    const noSpaceCorrect = correctNorm.replace(/\s+/g, '');

    // Levenshtein (Strict for short, tolerant for long)
    if (cleanCorrectText.length > 4) {
        const maxDistance = Math.max(2, Math.floor(cleanCorrectText.length * 0.3));
        const distance = levenshteinDistance(noSpaceUser, noSpaceCorrect);
        if (distance <= maxDistance) return true;
    }

    // Partial Match
    if (cleanCorrectText.length > 3 && cleanUserText.includes(cleanCorrectText)) return true;
    if (cleanUserText.length > 3 && cleanCorrectText.includes(cleanUserText)) return true;

    return false;
};

// --- 2. PDF Text Cleaning (Copied from pdfExport.ts) ---
const convertLatexToReadable = (text) => {
    let result = text;

    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
    result = result.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
    result = result.replace(/\^\{([^}]+)\}/g, '^($1)');
    result = result.replace(/\^(\w)/g, '^$1');
    result = result.replace(/_\{([^}]+)\}/g, '_($1)');
    result = result.replace(/_(\w)/g, '_$1');
    result = result.replace(/\\text\{([^}]+)\}/g, '$1');

    const greekMap = {
        '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
        '\\epsilon': 'epsilon', '\\theta': 'theta', '\\lambda': 'lambda', '\\mu': 'mu',
        '\\pi': 'pi', '\\rho': 'rho', '\\sigma': 'sigma', '\\tau': 'tau',
        '\\phi': 'phi', '\\omega': 'omega', '\\Delta': 'Delta', '\\Omega': 'Ohm'
    };
    const symbolMap = {
        '\\times': 'x', '\\div': '/', '\\pm': '+/-', '\\mp': '-/+',
        '\\leq': '<=', '\\geq': '>=', '\\neq': '!=', '\\approx': '~',
        '\\infty': 'infinity', '\\partial': 'd', '\\nabla': 'del',
        '\\sqrt': 'sqrt', '\\int': 'integral', '\\sum': 'sum', '\\prod': 'prod',
        '\\deg': 'deg', '\\circ': 'deg', '\\cdot': '*'
    };

    for (const [latex, replacement] of Object.entries(greekMap)) {
        const escapedLatex = latex.replace(/\\/g, '\\\\');
        result = result.replace(new RegExp(escapedLatex, 'g'), replacement);
    }
    for (const [latex, replacement] of Object.entries(symbolMap)) {
        const escapedLatex = latex.replace(/\\/g, '\\\\');
        result = result.replace(new RegExp(escapedLatex, 'g'), ` ${replacement} `);
    }

    result = result.replace(/\\[a-zA-Z]+/g, '');
    result = result.replace(/\$/g, '');
    result = result.replace(/[{}]/g, '');
    result = result.replace(/\s+/g, ' ').trim();
    return result;
};

// --- TESTS ---
console.log("=== 1. SCORE LOGIC TESTS ===");
const scoreTests = [
    { user: "8 s", correct: "6 N", expected: false, desc: "Short wrong answer (Levenshtein should fail)" },
    { user: "8 s", correct: "8 s", expected: true, desc: "Short correct answer" },
    { user: "120 N", correct: "120 N", expected: true, desc: "Exact number match" },
    { user: "120", correct: "120 N", expected: true, desc: "Number match without unit" },
    { user: "125 N", correct: "120 N", expected: true, desc: "Number match within 5% tolerance (120*1.05=126)" },
    { user: "130 N", correct: "120 N", expected: false, desc: "Number match outside tolerance" },
    { user: "impiega", correct: "impiega", expected: true, desc: "Exact text match" },
    { user: "impeiga", correct: "impiega", expected: true, desc: "Typo in long word (Levenshtein should pass)" },
    { user: "pippo", correct: "pluto", expected: false, desc: "Completely wrong long word" }
];

let scorePass = 0;
scoreTests.forEach(t => {
    const result = compareAnswer(t.user, t.correct);
    const status = result === t.expected ? "PASS" : "FAIL";
    if (status === "PASS") scorePass++;
    console.log(`[${status}] ${t.desc}: User="${t.user}", Correct="${t.correct}" -> Result=${result}`);
});

console.log(`\n=== 2. PDF CLEANING TESTS ===`);
const pdfTests = [
    { input: "10^{34}", expected: "10^(34)", desc: "Superscript" },
    { input: "\\pi r^2", expected: "pi r^2", desc: "Greek + Superscript" },
    { input: "\\sqrt{x}", expected: "sqrt(x)", desc: "Square root" },
    { input: "a \\times b", expected: "a x b", desc: "Multiplication" },
    { input: "10^{-34}", expected: "10^(-34)", desc: "Negative exponent" }
];

let pdfPass = 0;
pdfTests.forEach(t => {
    const result = convertLatexToReadable(t.input);
    // Loose check for spacing
    const cleanResult = result.replace(/\s+/g, '');
    const cleanExpected = t.expected.replace(/\s+/g, '');
    const status = cleanResult === cleanExpected ? "PASS" : "FAIL";
    if (status === "PASS") pdfPass++;
    console.log(`[${status}] ${t.desc}: Input="${t.input}" -> Output="${result}"`);
});

console.log("\n=== SUMMARY ===");
console.log(`Score Logic: ${scorePass} / ${scoreTests.length} Passed`);
console.log(`PDF Cleaning: ${pdfPass} / ${pdfTests.length} Passed`);

if (scorePass === scoreTests.length && pdfPass === pdfTests.length) {
    console.log("\n✅ ALL CHECKS PASSED");
} else {
    console.log("\n❌ SOME CHECKS FAILED");
}
