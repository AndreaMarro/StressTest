import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Clock, CheckCircle, XCircle, AlertCircle, Play, RotateCcw,
  Brain, ChevronRight, ChevronLeft, Flag, Menu, X, GraduationCap,
  Zap, Thermometer, Droplets, Waves, Activity, Terminal, Trophy
} from 'lucide-react';
import TerminalLayout from './components/layout/TerminalLayout';
import TypingText from './components/ui/TypingText';
import { MathText } from './components/ui/MathText';
import { PaymentModal } from './components/ui/PaymentModal';
import { HistoryView } from './components/HistoryView';
import { exportExamPDF } from './utils/pdfExport';
import type { Question, UserState, Topic } from './types';

// ... existing imports ...

// --- Constants ---

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOPICS: Topic[] = [
  { id: 'intro', name: "Introduzione e Metodi", icon: <BookOpen className="w-4 h-4" /> },
  { id: 'mechanics', name: "Meccanica", icon: <Activity className="w-4 h-4" /> },
  { id: 'fluids', name: "Meccanica dei Fluidi", icon: <Droplets className="w-4 h-4" /> },
  { id: 'waves', name: "Onde Meccaniche", icon: <Waves className="w-4 h-4" /> },
  { id: 'thermo', name: "Termodinamica", icon: <Thermometer className="w-4 h-4" /> },
  { id: 'electromag', name: "Elettricità e Magnetismo", icon: <Zap className="w-4 h-4" /> },
  { id: 'radiation', name: "Radiazioni e Ottica", icon: <Play className="w-4 h-4" /> }
];

// --- Main Component ---

export default function App() {
  // State
  const [mode, setMode] = useState<'start' | 'loading' | 'exam' | 'results'>('start');
  const [examType, setExamType] = useState<'full' | 'topic' | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>(TOPICS[0].name);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTitleAnimating, setIsTitleAnimating] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('examHistory');
    return saved ? JSON.parse(saved) : [];
  });

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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save seen exams to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('seenExamIds', JSON.stringify(seenExamIds));
  }, [seenExamIds]);

  // --- Logic ---

  const handleStartClick = () => {
    if (!examType) return;
    // Save pending state in case of redirect
    localStorage.setItem('pendingExamType', examType);
    localStorage.setItem('pendingTopic', selectedTopic);
    localStorage.setItem('pendingDifficulty', difficulty);
    setShowPayment(true);
  };

  useEffect(() => {
    const checkSaved = async () => {
      // PRIORITY 1: Check for ?access= URL parameter (shareable link)
      const urlParams = new URLSearchParams(window.location.search);
      const accessParam = urlParams.get('access');

      if (accessParam) {
        console.log('[App] Access link detected in URL');
        try {
          // Decode access parameter: format is "sessionToken_examId"
          const [sessionToken, examId] = accessParam.split('_');

          if (sessionToken && examId) {
            console.log('[App] Restoring session from access link');

            // Save to localStorage
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('currentExamId', examId);

            // Verify access
            const res = await fetch(`${API_URL}/api/verify-access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ examId, sessionToken })
            });
            const data = await res.json();

            if (data.hasAccess && data.exam) {
              console.log('[App] ✅ Access link valid!');
              setQuestions(data.exam.questions);
              if (data.expiresAt) {
                setAccessExpiresAt(data.expiresAt);
                localStorage.setItem('accessExpiresAt', data.expiresAt);
              }
              // Clean URL
              window.history.replaceState({}, '', window.location.pathname);
              setMode('start');
              return; // Exit early, don't check localStorage
            } else {
              console.log('[App] ❌ Access link expired or invalid');
              setErrorMsg('Link di accesso scaduto o non valido.');
            }
          }
        } catch (e) {
          console.error('[App] Failed to process access link', e);
          setErrorMsg('Errore nel processare il link di accesso.');
        }

        // Clean URL even if failed
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // PRIORITY 2: Check localStorage (existing session)
      const savedToken = localStorage.getItem('sessionToken');
      const savedExamId = localStorage.getItem('currentExamId');
      const savedExpires = localStorage.getItem('accessExpiresAt');

      if (savedToken && savedExamId && savedExpires) {
        // Check if access still valid
        const expiresDate = new Date(savedExpires);
        const now = new Date();

        if (now < expiresDate) {
          setAccessExpiresAt(savedExpires);
          try {
            const res = await fetch(`${API_URL}/api/verify-access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ examId: savedExamId, sessionToken: savedToken })
            });
            const data = await res.json();
            if (data.hasAccess && data.exam) {
              console.log('[App] Restored session from localStorage');
              setQuestions(data.exam.questions);
              setMode('start');
            } else {
              console.log('[App] Saved session no longer valid');
              // Clean up invalid session
              localStorage.removeItem('sessionToken');
              localStorage.removeItem('currentExamId');
              localStorage.removeItem('accessExpiresAt');
              setAccessExpiresAt(null);
            }
          } catch (e) {
            console.error('[App] Failed to verify saved session', e);
          }
        }
      }
    };
    checkSaved();
  }, []); // Run only once on mount

  const handlePaymentSuccess = async () => {
    setShowPayment(false);

    // Check if we have sessionToken from promo code
    const savedToken = localStorage.getItem('sessionToken');
    const savedExamId = localStorage.getItem('currentExamId');
    const savedExpires = localStorage.getItem('accessExpiresAt');

    if (savedToken && savedExamId) {
      // Promo code flow: verify access and fetch the exam
      try {
        setMode('loading');
        setErrorMsg(null);

        // Use relative path to ensure consistency with PaymentModal and Vercel proxy
        const response = await fetch('/api/verify-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: savedExamId,
            sessionToken: savedToken
          })
        });

        const data = await response.json();

        if (data.hasAccess && data.exam) {
          setQuestions(data.exam.questions);
          if (savedExpires) setAccessExpiresAt(savedExpires);
          setSeenExamIds(prev => [...prev, savedExamId]);
          startExam();
        } else {
          throw new Error(data.error || 'Access denied or exam not found');
        }
      } catch (err) {
        console.error('Promo access error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setErrorMsg(`Errore caricamento esame: ${errMsg}. Riprova.`);
        setMode('start');
      }
    } else {
      // Normal payment flow: generate new exam
      handleStartExam();
    }
  };

  const handleStartExam = async () => {
    setMode('loading');
    setErrorMsg(null);

    try {
      const topicToUse = examType === 'full' ? 'full' : selectedTopic;

      console.log('Requesting exam with excludeIds:', seenExamIds);

      // Use relative path to ensure consistency with Vercel proxy
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          difficulty,
          excludeIds: seenExamIds
        })
      });

      if (!response.ok) throw new Error('Failed to fetch exam');

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions received');
      }

      // Save session token and access info
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }
      if (data.expiresAt) {
        setAccessExpiresAt(data.expiresAt);
        localStorage.setItem('accessExpiresAt', data.expiresAt);
      }
      if (data.id) {
        localStorage.setItem('currentExamId', data.id);
      }

      // Track this exam ID
      if (data.id) {
        setSeenExamIds(prev => [...prev, data.id]);
      }

      setQuestions(data.questions);
      startExam();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      setErrorMsg(message || "Errore nel caricamento del test. Riprova.");
      setMode('start');
    }
  };

  // Debug: log exam when it changes
  useEffect(() => {
    if (questions.length > 0) {
      console.log('[App] Exam loaded with', questions.length, 'questions');
    }
  }, [questions]);

  // Stop title animation after 6 seconds (not panic button)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTitleAnimating(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Check for saved session on mount (auto-resume if within 45 min)
  useEffect(() => {
    const checkSavedAccess = async () => {
      const savedExamId = localStorage.getItem('currentExamId');
      const savedToken = localStorage.getItem('sessionToken');

      if (!savedExamId || !savedToken) return;

      console.log('[App] Checking session access for exam:', savedExamId);
      console.log('[App] Saved Token:', savedToken);

      try {
        const res = await fetch(`${API_URL}/api/verify-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: savedExamId,
            sessionToken: savedToken
          })
        });

        const data = await res.json();

        if (data.hasAccess && data.exam) {
          console.log('[App] Access granted, loading saved exam');

          // Restore access expiration
          if (data.expiresAt) {
            setAccessExpiresAt(data.expiresAt);
            localStorage.setItem('accessExpiresAt', data.expiresAt);
          }

          // Restore questions
          setQuestions(data.exam.questions);

          // Restore user answers if saved
          const savedAnswers = localStorage.getItem(`answers_${savedExamId}`);
          if (savedAnswers) {
            const parsedAnswers = JSON.parse(savedAnswers);
            setUserState(prev => ({
              ...prev,
              answers: parsedAnswers
            }));
          }

          startExam();
        } else if (data.expired) {
          console.log('[App] Access expired, clearing session. ExpiresAt:', data.expiresAt || 'unknown');
          localStorage.removeItem('currentExamId');
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('accessExpiresAt');
          setAccessExpiresAt(null);
        }
      } catch (err) {
        console.error('[App] Failed to check access:', err);
      }
    };

    checkSavedAccess();
  }, []);

  // Countdown timer for 45-min access window
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
        // Access expired during exam
        console.log('[App] Access window expired');
        finishExam();

        // Clear session
        localStorage.removeItem('currentExamId');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('accessExpiresAt');
        setAccessExpiresAt(null);
      }
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessExpiresAt, mode]);

  // Save user answers periodically for recovery
  useEffect(() => {
    const examId = localStorage.getItem('currentExamId');
    if (examId && Object.keys(userState.answers).length > 0) {
      localStorage.setItem(`answers_${examId}`, JSON.stringify(userState.answers));
    }
  }, [userState.answers]);

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
    setMode('exam');
  };

  // Check for Stripe Redirect
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const paymentIntentId = new URLSearchParams(window.location.search).get(
        "payment_intent"
      );

      if (paymentIntentId) {
        try {
          // Verify with backend
          const res = await fetch(`${API_URL}/api/verify-payment/${paymentIntentId}`);
          const data = await res.json();

          if (data.status === 'succeeded') {
            // Store pending UI state
            const pendingType = localStorage.getItem('pendingExamType') as 'full' | 'topic' | null;
            const pendingTopic = localStorage.getItem('pendingTopic');
            const pendingDifficulty = localStorage.getItem('pendingDifficulty') as 'easy' | 'medium' | 'hard' | null;

            // If backend provided session token and examId, use them directly
            if (data.sessionToken && data.examId) {
              // Save session info
              localStorage.setItem('sessionToken', data.sessionToken);
              localStorage.setItem('currentExamId', data.examId);
              if (data.expiresAt) {
                setAccessExpiresAt(data.expiresAt);
                localStorage.setItem('accessExpiresAt', data.expiresAt);
              }
              // Verify access and fetch exam
              try {
                const accessRes = await fetch(`${API_URL}/api/verify-access`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ examId: data.examId, sessionToken: data.sessionToken })
                });
                const accessData = await accessRes.json();
                if (accessData.hasAccess && accessData.exam) {
                  setQuestions(accessData.exam.questions);
                  // Restore UI selections
                  if (pendingType) setExamType(pendingType);
                  if (pendingTopic) setSelectedTopic(pendingTopic);
                  if (pendingDifficulty) setDifficulty(pendingDifficulty);
                  // Clear URL
                  window.history.replaceState({}, '', window.location.pathname);

                  // Generate shareable access link
                  const accessLink = `${window.location.origin}${window.location.pathname}?access=${data.sessionToken}_${data.examId}`;
                  console.log('[App] 🔗 Shareable access link:', accessLink);

                  // Show link to user (optional: could show in UI)
                  alert(`✅ Pagamento riuscito!\n\n🔗 Link di accesso (valido 45 min):\n${accessLink}\n\nPuoi usare questo link su qualsiasi dispositivo!`);

                  startExam();
                  return;
                }
              } catch (e) {
                console.error('Access verification failed after payment', e);
              }
            }

            // Fallback: generate a new exam as before
            if (pendingType) {
              setExamType(pendingType);
              if (pendingTopic) setSelectedTopic(pendingTopic);
              if (pendingDifficulty) setDifficulty(pendingDifficulty);
            } else {
              setExamType('full');
            }

            // Clear URL
            window.history.replaceState({}, '', window.location.pathname);

            triggerExamGeneration(
              pendingType || 'full',
              pendingTopic || 'Introduzione e Metodi',
              pendingDifficulty || 'medium'
            );
          } else if (data.status === 'processing') {
            setErrorMsg("Pagamento in elaborazione. Ricarica la pagina tra poco.");
          } else {
            setErrorMsg(`Pagamento non riuscito: ${data.status || 'Errore sconosciuto'}. Riprova.`);
          }
        } catch (e) {
          console.error("Payment verification failed", e);
          setErrorMsg(`Errore verifica pagamento: ${(e as Error).message}. Contatta il supporto.`);
        }
      }
    };

    checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to trigger generation with explicit params (bypassing async state issues)
  const triggerExamGeneration = async (type: string, topic: string, diff: string) => {
    setMode('loading');
    setErrorMsg(null);

    try {
      const topicToUse = type === 'full' ? 'full' : topic;

      // Use relative path to ensure consistency with Vercel proxy
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          difficulty: diff,
          excludeIds: seenExamIds
        })
      });

      if (!response.ok) throw new Error('Failed to fetch exam');

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions received');
      }

      // Save session token if provided (critical for access check)
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      if (data.id) {
        localStorage.setItem('currentExamId', data.id);

        // Fix: Use consistent key 'accessExpiresAt' and update state
        if (data.expiresAt) {
          localStorage.setItem('accessExpiresAt', data.expiresAt);
          setAccessExpiresAt(data.expiresAt);
        }

        const newSeenIds = [...seenExamIds, data.id];
        setSeenExamIds(newSeenIds);
        localStorage.setItem('seenExamIds', JSON.stringify(newSeenIds));
      }

      setQuestions(data.questions);
      startExam();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      setErrorMsg(message || "Errore nel caricamento del test. Riprova.");
      setMode('start');
    }
  };

  // Persistence Logic
  useEffect(() => {
    const savedSession = localStorage.getItem('stressTestSession');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
        const totalDuration = 45 * 60;

        if (elapsed < totalDuration || parsed.isExamFinished) {
          // Restore session if within 45 mins OR if exam is already finished (to see results)
          setQuestions(parsed.questions);
          setUserState(() => ({
            ...parsed.userState,
            timeRemaining: parsed.isExamFinished ? 0 : Math.max(0, totalDuration - elapsed)
          }));
          setMode(parsed.isExamFinished ? 'results' : 'exam');
        } else {
          // Session expired
          localStorage.removeItem('stressTestSession');
        }
      } catch (e) {
        console.error("Failed to restore session", e);
        localStorage.removeItem('stressTestSession');
      }
    }
  }, []);

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

  const finishExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    let answeredCount = 0;

    questions.forEach(q => {
      const userAns = userState.answers[q.id];

      // Only count answered questions
      if (userAns && userAns.trim() !== '') {
        answeredCount++;
        if (compareAnswers(userAns, q.correctAnswer, q.type)) {
          score++;
        }
      }
    });

    const finalScore = score; // Use the calculated score
    setUserState(prev => ({ ...prev, isExamActive: false, isExamFinished: true, score: finalScore }));
    setMode('results');

    // Save to history
    const newHistoryItem = {
      id: localStorage.getItem('currentExamId') || Date.now().toString(),
      date: new Date().toISOString(),
      score: finalScore,
      totalQuestions: questions.length,
      difficulty,
      topic: examType === 'full' ? 'Simulazione Completa' : selectedTopic,
      answers: userState.answers // Save answers for PDF export
    };

    const updatedHistory = [newHistoryItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('examHistory', JSON.stringify(updatedHistory));

    // Clear session
    localStorage.removeItem('currentExamId');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('accessExpiresAt');
    setAccessExpiresAt(null);
  };

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
      const cleanUserText = userNorm.replace(/\s+/g, ' ').trim();
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

      // === PARTIAL MATCH (contains correct answer) ===
      if (cleanCorrectText.length > 3 && cleanUserText.includes(cleanCorrectText)) return true;
      if (cleanUserText.length > 3 && cleanCorrectText.includes(cleanUserText)) return true;

      return false;
    }
  };

  const handleAnswer = (val: string) => {
    setUserState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questions[prev.currentQuestionIndex].id]: val }
    }));
  };

  const toggleFlag = () => {
    const qId = questions[userState.currentQuestionIndex].id;
    setUserState(prev => ({
      ...prev,
      flagged: { ...prev.flagged, [qId]: !prev.flagged[qId] }
    }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };



  // --- Views ---

  const StartView = () => (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6 md:mb-12 border-l-2 border-terminal-green pl-4 md:pl-6 py-1 md:py-2 flex justify-between items-start">
        <div>
          <div className="text-[10px] md:text-xs font-bold text-terminal-dim mb-1 md:mb-2">SYSTEM_BOOT_SEQUENCE_INIT...</div>
          <h1 className="text-2xl md:text-6xl font-bold mb-2 md:mb-4 tracking-tighter">
            <TypingText text="SEMESTRE_FILTRO" speed={50} animate={isTitleAnimating} />
          </h1>
          <p className="text-terminal-dim text-sm md:text-lg max-w-2xl leading-tight">
            Simulazione conforme al protocollo <span className="text-terminal-green">DM418/2025</span>.
            <br className="hidden md:block" /> Sopravvivi al filtro o cambia facoltà.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowHistory(true)}
            className="hidden md:flex flex-col items-center gap-1 text-terminal-green hover:text-green-400 transition-colors"
          >
            <Trophy size={24} />
            <span className="text-[10px] font-bold tracking-widest">STORICO</span>
          </button>
          <a
            href="mailto:ermagician@gmail.com?subject=BUG_REPORT_SEMESTRE_FILTRO&body=DESCRIBE_THE_GLITCH_HERE..."
            className="hidden md:flex flex-col items-center gap-1 text-terminal-dim hover:text-terminal-green transition-colors"
          >
            <AlertCircle size={24} />
            <span className="text-[10px] font-bold tracking-widest">REPORT_BUG</span>
          </a>
        </div>
      </header>



      <div className="grid md:grid-cols-2 gap-3 md:gap-6 mb-32 md:mb-12">
        <div
          onClick={() => setExamType('full')}
          className={`terminal-box cursor-pointer transition-all hover:border-terminal-green group
            ${examType === 'full' ? 'border-terminal-green bg-terminal-green/10' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            <GraduationCap className={`w-8 h-8 ${examType === 'full' ? 'text-terminal-green' : 'text-terminal-dim'}`} />
            {examType === 'full' && <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>}
          </div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-terminal-green">FULL_SYSTEM_SCAN</h3>
          <p className="text-sm text-terminal-dim mb-4">31 Domande. Syllabus completo. Modalità "O la va o la spacca".</p>
          <div className="w-full h-1 bg-terminal-dark overflow-hidden">
            <div className="h-full bg-terminal-green w-full animate-pulse"></div>
          </div>
        </div>

        <div
          onClick={() => setExamType('topic')}
          className={`terminal-box cursor-pointer transition-all hover:border-terminal-green group
            ${examType === 'topic' ? 'border-terminal-green bg-terminal-green/10' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            <Brain className={`w-8 h-8 ${examType === 'topic' ? 'text-terminal-green' : 'text-terminal-dim'}`} />
            {examType === 'topic' && <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>}
          </div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-terminal-green">TARGETED_DIAGNOSTIC</h3>
          <p className="text-sm text-terminal-dim mb-4">Focus verticale. Scopri dove sei carente prima che sia troppo tardi.</p>

          {examType === 'topic' && (
            <div className="mt-4 animate-in fade-in duration-300">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-terminal-black border border-terminal-green text-terminal-green p-2 text-sm outline-none focus:ring-1 focus:ring-terminal-green font-mono"
                onClick={(e) => e.stopPropagation()}
              >
                {TOPICS.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {
        examType && (
          <div className="terminal-box animate-in fade-in duration-300 border-terminal-green">
            <div className="flex items-center gap-2 mb-4 text-terminal-green">
              <Terminal size={16} />
              <span className="text-sm font-bold">CONFIGURE_DIFFICULTY_LEVEL</span>
            </div>

            <div className="flex gap-2 mb-6">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`
                  flex-1 py-2 text-xs font-bold border transition-all uppercase tracking-wider
                  ${difficulty === level
                      ? 'bg-terminal-green text-terminal-black border-terminal-green'
                      : 'bg-transparent text-terminal-dim border-terminal-dim hover:border-terminal-green hover:text-terminal-green'}
                `}
                >
                  {level === 'easy' ? 'L1_BASIC' : level === 'medium' ? 'L2_STD' : 'L3_NIGHTMARE'}
                </button>
              ))}
            </div>

            <button onClick={handleStartClick} className="terminal-button w-full flex items-center justify-center gap-2">
              <Play size={16} /> INITIATE_SEQUENCE (€0.50)
            </button>
          </div>
        )
      }

      {
        errorMsg && (
          <div className="mt-8 p-4 border border-terminal-red text-terminal-red flex flex-col md:flex-row items-center justify-center gap-4 font-bold bg-terminal-red/10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} /> ERROR: {errorMsg}
            </div>
            {errorMsg.includes("pagamento") && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1 bg-terminal-red text-terminal-black hover:bg-red-400 transition-colors text-sm uppercase"
              >
                Riprova Verifica
              </button>
            )}
          </div>
        )
      }

      {/* Mobile Bottom Dock - Fixed App-like Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-terminal-black border-t border-terminal-dim p-2 flex justify-around items-center z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <a
          href="mailto:ermagician@gmail.com?subject=BUG_REPORT_SEMESTRE_FILTRO&body=DESCRIBE_THE_GLITCH_HERE..."
          className="flex flex-col items-center gap-1 text-terminal-dim active:text-terminal-green p-2"
        >
          <AlertCircle size={20} />
          <span className="text-[10px] font-bold uppercase">Report</span>
        </a>

        <div className="w-px h-8 bg-terminal-dim/30"></div>

        <button
          onClick={() => setShowHistory(true)}
          className="flex flex-col items-center gap-1 text-terminal-green active:scale-95 transition-transform p-2"
        >
          <Trophy size={20} />
          <span className="text-[10px] font-bold uppercase">Storico</span>
        </button>
      </div>
    </div >
  );

  const LoadingView = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="font-mono text-terminal-green text-center">
        <div className="mb-4 text-4xl animate-spin">
          <RotateCcw />
        </div>
        <h2 className="text-2xl font-bold mb-2">GENERATING_EXAM_DATA...</h2>
        <p className="text-terminal-dim text-sm animate-pulse">
          &gt; Accessing neural network...<br />
          &gt; Compiling physics problems...<br />
          &gt; Optimizing difficulty parameters...
        </p>
      </div>
    </div>
  );

  const ExamView = () => {
    const currentQ = questions[userState.currentQuestionIndex];
    const isFlagged = userState.flagged[currentQ.id];

    return (
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <aside className={`
          fixed md:relative z-40 w-72 md:w-64 bg-terminal-black border-r border-terminal-dim h-full transform transition-transform duration-300 shadow-2xl md:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          top-0 left-0 p-4 md:p-0 md:bg-transparent md:border-r-0
        `}>
          <div className="md:hidden flex justify-end mb-4">
            <button onClick={() => setSidebarOpen(false)}><X className="text-terminal-green" /></button>
          </div>

          <div className="terminal-box h-full overflow-y-auto stable-layout scrollbar-thin scrollbar-smooth">
            <h3 className="text-xs font-bold text-terminal-dim mb-4 uppercase tracking-widest border-b border-terminal-dim pb-2">
              Question_Matrix
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!userState.answers[q.id];
                const isCurrent = idx === userState.currentQuestionIndex;
                const isFlaggedQ = userState.flagged[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setUserState(p => ({ ...p, currentQuestionIndex: idx }))}
                    className={`
                        relative h-8 text-xs font-bold transition-all border
                        ${isCurrent ? 'bg-terminal-green text-terminal-black border-terminal-green' :
                        isAnswered ? 'bg-terminal-dim/20 text-terminal-green border-terminal-green' : 'text-terminal-dim border-terminal-dim hover:border-terminal-green'}
                      `}
                  >
                    {idx + 1}
                    {isFlaggedQ && <div className="absolute -top-1 -right-1 w-2 h-2 bg-terminal-red rounded-full" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-4 border-t border-terminal-dim">
              <button onClick={finishExam} className="terminal-button w-full text-xs">
                TERMINATE_SESSION
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="flex items-center justify-between mb-6">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-terminal-green"><Menu /></button>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-1 border border-terminal-green rounded text-terminal-green font-mono ${userState.timeRemaining < 300 ? 'animate-pulse text-terminal-red border-terminal-red' : ''}`}>
                <Clock size={16} />
                <span>{formatTime(userState.timeRemaining)}</span>
              </div>

              {/* 45-min Access Window Countdown */}
              {accessTimeLeft !== null && (
                <div className={`flex items-center gap-2 px-3 py-1 border text-xs font-mono ${accessTimeLeft < 600 // Less than 10 min
                  ? 'border-terminal-red text-terminal-red animate-pulse'
                  : 'border-terminal-dim text-terminal-dim'
                  }`}>
                  <AlertCircle size={14} />
                  <span>Accesso: {formatTime(accessTimeLeft)}</span>
                </div>
              )}

              <button
                onClick={toggleFlag}
                className={`flex items-center gap-2 px-3 py-1 border text-xs font-bold uppercase transition-all
                  ${isFlagged ? 'bg-terminal-red text-terminal-black border-terminal-red' : 'border-terminal-dim text-terminal-dim hover:text-terminal-red hover:border-terminal-red'}
                `}
              >
                <Flag size={14} /> {isFlagged ? 'FLAGGED' : 'FLAG'}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto terminal-box relative">
            <div className="absolute top-0 left-0 px-2 py-1 bg-terminal-green text-terminal-black text-[10px] font-bold uppercase">
              Q_ID: {currentQ.id} // TYPE: {currentQ.type}
            </div>

            <div className="mt-6 mb-8">
              <h2 className="text-lg md:text-2xl font-bold leading-relaxed">
                <MathText content={currentQ.text} />
              </h2>
            </div>

            <div className="space-y-3">
              {currentQ.type === 'multiple_choice' ? (
                currentQ.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full p-3 md:p-4 text-left border transition-all flex items-center gap-3 md:gap-4 group
                       ${userState.answers[currentQ.id] === opt
                        ? 'bg-terminal-green/10 border-terminal-green text-terminal-green'
                        : 'border-terminal-dim hover:border-terminal-green hover:text-terminal-green'}
                     `}
                  >
                    <div className={`
                       w-6 h-6 flex items-center justify-center border text-xs font-bold
                       ${userState.answers[currentQ.id] === opt ? 'bg-terminal-green text-terminal-black border-terminal-green' : 'border-terminal-dim group-hover:border-terminal-green'}
                     `}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1"><MathText content={opt} /></div>
                  </button>
                ))
              ) : (
                <div className="border border-terminal-dim p-6 bg-terminal-black/50 relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-terminal-green uppercase">INPUT_ANSWER:</label>
                    {userState.answers[currentQ.id] && (
                      <div className="flex items-center gap-1 text-terminal-green animate-in fade-in duration-300">
                        <CheckCircle size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">SAVED</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={userState.answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="_"
                    className="w-full bg-transparent border-b-2 border-terminal-dim focus:border-terminal-green text-xl p-2 outline-none font-mono text-terminal-text placeholder-terminal-dim transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setUserState(p => ({ ...p, currentQuestionIndex: Math.max(0, p.currentQuestionIndex - 1) }))}
              disabled={userState.currentQuestionIndex === 0}
              className="text-terminal-dim hover:text-terminal-green disabled:opacity-50 flex items-center gap-1 text-sm font-bold uppercase"
            >
              <ChevronLeft size={16} /> PREV
            </button>

            {userState.currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setUserState(p => ({ ...p, currentQuestionIndex: Math.min(questions.length - 1, p.currentQuestionIndex + 1) }))}
                className="text-terminal-green hover:text-terminal-accent flex items-center gap-1 text-sm font-bold uppercase"
              >
                NEXT <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={finishExam} className="text-terminal-red hover:text-red-400 flex items-center gap-1 text-sm font-bold uppercase">
                FINISH <CheckCircle size={16} />
              </button>
            )}
          </div>
        </main>
      </div>
    );
  };

  const ResultsView = () => {
    const percentage = Math.round((userState.score / questions.length) * 100);
    const passed = percentage >= 60;

    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="terminal-box text-center mb-12 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${passed ? 'bg-terminal-green' : 'bg-terminal-red'}`}></div>

          <h2 className="text-3xl font-bold mb-8 mt-4 tracking-widest">SESSION_REPORT</h2>

          <div className="flex justify-center mb-8">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${passed ? 'border-terminal-green text-terminal-green' : 'border-terminal-red text-terminal-red'}`}>
              <span className="text-4xl font-bold">{percentage}%</span>
            </div>
          </div>

          <p className="text-xl mb-8">
            STATUS: <span className={`font-bold ${passed ? 'text-terminal-green' : 'text-terminal-red'}`}>{passed ? 'PASSED' : 'FAILED'}</span>
            <br />
            <span className="text-sm text-terminal-dim block mt-2">SCORE: {userState.score}/{questions.length}</span>
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <button onClick={() => setMode('start')} className="terminal-button border-terminal-dim text-terminal-dim hover:border-terminal-text hover:text-terminal-text">
              <RotateCcw size={16} className="inline mr-2" /> REBOOT
            </button>
            <button
              onClick={() => exportExamPDF(questions, userState, examType || 'topic', selectedTopic, difficulty)}
              className="terminal-button border-terminal-accent text-terminal-accent hover:bg-terminal-accent/10"
            >
              DOWNLOAD_REPORT.PDF <GraduationCap size={16} className="inline ml-2" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-terminal-dim uppercase tracking-widest text-sm mb-4 border-b border-terminal-dim pb-2">Detailed_Logs</h3>
          {questions.map((q, idx) => {
            const userAns = userState.answers[q.id];
            const isCorrect = compareAnswers(userAns, q.correctAnswer, q.type);
            return (
              <div key={q.id} className={`terminal-box p-6 group hover:border-terminal-dim transition-all ${isCorrect ? 'border-terminal-green/30' : 'border-terminal-red/30'}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-terminal-dim">LOG_ENTRY_#{idx + 1}</span>
                  {isCorrect ? <CheckCircle className="text-terminal-green w-5 h-5" /> : <XCircle className="text-terminal-red w-5 h-5" />}
                </div>

                <h4 className="text-lg font-bold mb-4"><MathText content={q.text} /></h4>

                <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                  <div className={`p-3 border ${isCorrect ? 'border-terminal-green/50 text-terminal-green' : 'border-terminal-red/50 text-terminal-red'}`}>
                    <span className="block text-[10px] uppercase opacity-70 mb-1">User_Input</span>
                    <MathText content={userAns || "NULL"} />
                  </div>
                  {!isCorrect && (
                    <div className="p-3 border border-terminal-green/50 text-terminal-green">
                      <span className="block text-[10px] uppercase opacity-70 mb-1">Expected_Output</span>
                      <MathText content={q.correctAnswer} />
                    </div>
                  )}
                </div>

                <div className="text-xs text-terminal-dim border-t border-terminal-dim/30 pt-4 mt-4">
                  <span className="text-terminal-green font-bold mr-2">&gt; ANALYSIS:</span>
                  <MathText content={q.explanation} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <TerminalLayout>
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        topic={examType === 'full' ? 'full' : selectedTopic}
        difficulty={difficulty}
        excludeIds={seenExamIds}
      />

      {showHistory && (
        <HistoryView
          history={history}
          onClose={() => setShowHistory(false)}
        />
      )}

      {mode === 'start' && <StartView />}
      {mode === 'loading' && <LoadingView />}
      {mode === 'exam' && <ExamView />}
      {mode === 'results' && <ResultsView />}
    </TerminalLayout>
  );
}
