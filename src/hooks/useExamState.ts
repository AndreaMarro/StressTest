import { useState, useRef, useEffect } from 'react';
import type { Question, UserState } from '../types';

export function useExamState() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [userState, setUserState] = useState<UserState>({
        answers: {},
        flagged: {},
        currentQuestionIndex: 0,
        timeRemaining: 45 * 60,
        isExamActive: false,
        isExamFinished: false,
        score: 0
    });

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Timer Logic
    useEffect(() => {
        if (userState.isExamActive && !userState.isExamFinished) {
            timerRef.current = setInterval(() => {
                setUserState(prev => {
                    if (prev.timeRemaining <= 0) {
                        finishExam();
                        return prev;
                    }
                    return { ...prev, timeRemaining: prev.timeRemaining - 1 };
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userState.isExamActive, userState.isExamFinished]);

    // Levenshtein distance for fuzzy matching
    const levenshteinDistance = (a: string, b: string): number => {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    };

    const compareAnswers = (user: string, correct: string, type: string) => {
        // If user didn't answer, return false (but DON'T count it in the score)
        if (!user || user.trim() === '') return false;

        if (type === 'multiple_choice') {
            // Exact match or match first letter (A-E)
            const userTrim = user.trim();
            const correctTrim = correct.trim();
            return userTrim === correctTrim ||
                (userTrim.length > 0 && correctTrim.length > 0 && userTrim.charAt(0) === correctTrim.charAt(0));
        } else {
            // Fill in the blank - ADVANCED FUZZY MATCHING

            // === NORMALIZATION ===
            const normalize = (str: string) => {
                return str
                    .toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .trim();
            };

            const userNorm = normalize(user);
            const correctNorm = normalize(correct);

            // === EXACT MATCH ===
            if (userNorm === correctNorm) return true;

            // === NUMBER EXTRACTION ===
            const extractNumber = (str: string) => {
                const match = str.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/);
                return match ? match[0] : null;
            };

            const userNumber = extractNumber(userNorm);
            const correctNumber = extractNumber(correctNorm);

            // If both have numbers, compare numerically ONLY
            // This prevents "130 N" matching "120 N" via Levenshtein
            if (userNumber && correctNumber) {
                const userNum = parseFloat(userNumber.replace(',', '.'));
                const correctNum = parseFloat(correctNumber.replace(',', '.'));

                if (!isNaN(userNum) && !isNaN(correctNum)) {
                    // ±5% tolerance for numbers
                    const tolerance = Math.abs(correctNum * 0.05);
                    return Math.abs(userNum - correctNum) <= tolerance;
                }
            }

            // === TEXT MATCHING ===
            // Remove extra spaces but preserve word boundaries
            // const cleanUserText = userNorm.replace(/\s+/g, ' ').trim(); // Unused
            const cleanCorrectText = correctNorm.replace(/\s+/g, ' ').trim();
            const noSpaceUser = userNorm.replace(/\s+/g, '');
            const noSpaceCorrect = correctNorm.replace(/\s+/g, '');

            // === LEVENSHTEIN DISTANCE (more tolerant) ===
            // Only use Levenshtein for longer answers to avoid false positives on short units/numbers
            if (cleanCorrectText.length > 4) {
                // Allow 30% tolerance or at least 2 edits for longer words
                const maxDistance = Math.max(2, Math.floor(cleanCorrectText.length * 0.3));
                const distance = levenshteinDistance(noSpaceUser, noSpaceCorrect);
                if (distance <= maxDistance) return true;
            }

            return false;
        }
    };

    const finishExam = () => {
        if (timerRef.current) clearInterval(timerRef.current);

        let score = 0;

        questions.forEach(q => {
            const userAns = userState.answers[q.id];

            // Only count answered questions
            if (userAns && userAns.trim() !== '') {
                if (compareAnswers(userAns, q.correctAnswer, q.type)) {
                    score++;
                }
            }
        });

        setUserState(prev => ({ ...prev, isExamActive: false, isExamFinished: true, score }));
        return score;
    };

    const startExam = () => {
        setUserState({
            answers: {},
            flagged: {},
            currentQuestionIndex: 0,
            timeRemaining: 45 * 60,
            isExamActive: true,
            isExamFinished: false,
            score: 0
        });
        localStorage.setItem('stressTestStartTime', Date.now().toString());
    };

    return {
        questions,
        setQuestions,
        userState,
        setUserState,
        startExam,
        finishExam
    };
}
