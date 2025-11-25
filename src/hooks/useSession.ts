import { useState, useEffect, useCallback } from 'react';
import type { Question, UserState } from '../types';

interface UseSessionProps {
    mode: 'start' | 'loading' | 'exam' | 'results';
    setMode: (mode: 'start' | 'loading' | 'exam' | 'results') => void;
    setQuestions: (questions: Question[]) => void;
    userState: UserState;
    setUserState: React.Dispatch<React.SetStateAction<UserState>>;
    questions: Question[];
    setErrorMsg: (msg: string | null) => void;
}

export function useSession({
    mode,
    setMode,
    setQuestions,
    userState,
    setUserState,
    questions,
    setErrorMsg
}: UseSessionProps) {
    // Session access control (45-min window)
    const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(() => {
        return localStorage.getItem('accessExpiresAt');
    });
    const [accessTimeLeft, setAccessTimeLeft] = useState<number | null>(null);

    // Track seen exams to ensure uniqueness
    const [seenExamIds, setSeenExamIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('seenExamIds');
        return saved ? JSON.parse(saved) : [];
    });

    // Save seen exams
    useEffect(() => {
        localStorage.setItem('seenExamIds', JSON.stringify(seenExamIds));
    }, [seenExamIds]);

    // Countdown timer for access
    useEffect(() => {
        if (!accessExpiresAt) {
            setAccessTimeLeft(null);
            return;
        }

        const updateCountdown = () => {
            const now = new Date().getTime();
            const expiry = new Date(accessExpiresAt).getTime();
            const diff = Math.max(0, Math.floor((expiry - now) / 1000));

            setAccessTimeLeft(diff);

            if (diff === 0 && mode === 'exam') {
                console.log('[useSession] Access window expired');
                // We need to handle finish exam here, but it requires more context.
                // Ideally, we expose an "isExpired" flag or callback.
                // For now, let's just clear session and let App handle the UI switch if needed,
                // or we can pass a callback "onSessionExpired".
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [accessExpiresAt, mode]);

    // Persistence Logic (Session Restore)
    useEffect(() => {
        const savedSession = localStorage.getItem('stressTestSession');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
                const totalDuration = 45 * 60;

                if (elapsed < totalDuration || parsed.isExamFinished) {
                    setQuestions(parsed.questions);
                    setUserState((prev) => ({
                        ...prev,
                        ...parsed.userState,
                        timeRemaining: parsed.isExamFinished ? 0 : Math.max(0, totalDuration - elapsed)
                    }));
                    setMode(parsed.isExamFinished ? 'results' : 'exam');
                } else {
                    localStorage.removeItem('stressTestSession');
                }
            } catch (e) {
                console.error("Failed to restore session", e);
                localStorage.removeItem('stressTestSession');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Save session state
    useEffect(() => {
        if (mode === 'exam' || mode === 'results') {
            const sessionData = {
                questions,
                userState,
                startTime: localStorage.getItem('stressTestStartTime') ? parseInt(localStorage.getItem('stressTestStartTime')!) : Date.now(),
                isExamFinished: mode === 'results'
            };
            localStorage.setItem('stressTestSession', JSON.stringify(sessionData));
        }
    }, [userState, questions, mode]);

    // Check for saved session / access link
    useEffect(() => {
        const checkSaved = async () => {
            // PRIORITY 1: Check for ?access= URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const accessParam = urlParams.get('access');

            if (accessParam) {
                console.log('[useSession] Access link detected in URL');
                try {
                    const [sessionToken, examId] = accessParam.split('_');

                    if (sessionToken && examId) {
                        console.log('[useSession] Restoring session from access link');
                        localStorage.setItem('sessionToken', sessionToken);
                        localStorage.setItem('currentExamId', examId);

                        const res = await fetch(`/api/verify-access`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ examId, sessionToken })
                        });
                        const data = await res.json();

                        if (data.hasAccess && data.exam) {
                            console.log('[useSession] ✅ Access link valid!');
                            setQuestions(data.exam.questions);
                            if (data.expiresAt) {
                                setAccessExpiresAt(data.expiresAt);
                                localStorage.setItem('accessExpiresAt', data.expiresAt);
                            }
                            window.history.replaceState({}, '', window.location.pathname);
                            setMode('start');
                            return;
                        } else {
                            console.log('[useSession] ❌ Access link expired or invalid');
                            setErrorMsg('Link di accesso scaduto o non valido.');
                        }
                    }
                } catch (e) {
                    console.error('[useSession] Failed to process access link', e);
                    setErrorMsg('Errore nel processare il link di accesso.');
                }
                window.history.replaceState({}, '', window.location.pathname);
                return;
            }

            // PRIORITY 2: Check localStorage
            const savedToken = localStorage.getItem('sessionToken');
            const savedExamId = localStorage.getItem('currentExamId');
            const savedExpires = localStorage.getItem('accessExpiresAt');

            if (savedToken && savedExamId && savedExpires) {
                const expiresDate = new Date(savedExpires);
                const now = new Date();

                if (now < expiresDate) {
                    setAccessExpiresAt(savedExpires);
                    try {
                        const res = await fetch(`/api/verify-access`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ examId: savedExamId, sessionToken: savedToken })
                        });
                        const data = await res.json();
                        if (data.hasAccess && data.exam) {
                            console.log('[useSession] Restored session from localStorage');
                            setQuestions(data.exam.questions);
                            setMode('start');
                        } else {
                            console.log('[useSession] Saved session no longer valid');
                            localStorage.removeItem('sessionToken');
                            localStorage.removeItem('currentExamId');
                            localStorage.removeItem('accessExpiresAt');
                            setAccessExpiresAt(null);
                        }
                    } catch (e) {
                        console.error('[useSession] Failed to verify saved session', e);
                    }
                }
            }
        };
        checkSaved();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem('currentExamId');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('accessExpiresAt');
        localStorage.removeItem('stressTestSession');
        localStorage.removeItem('stressTestStartTime');
        setAccessExpiresAt(null);
    }, []);

    return {
        accessExpiresAt,
        setAccessExpiresAt,
        accessTimeLeft,
        seenExamIds,
        setSeenExamIds,
        clearSession
    };
}
