import { useState, useEffect } from 'react';
import {
  BookOpen, Activity, Droplets, Waves, Thermometer, Zap, Play
} from 'lucide-react';
import TerminalLayout from './components/layout/TerminalLayout';
import { PaymentModal } from './components/ui/PaymentModal';
import { HistoryView } from './components/HistoryView';
import { StartScreen } from './components/views/StartScreen';
import { ExamView } from './components/views/ExamView';
import { ResultsView } from './components/views/ResultsView';
import { useExamState } from './hooks/useExamState';
import { usePayment } from './hooks/usePayment';
import type { Topic } from './types';

// --- Constants ---

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
  // --- State ---
  const [mode, setMode] = useState<'start' | 'loading' | 'exam' | 'results'>('start');
  const [examType, setExamType] = useState<'full' | 'topic' | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>(TOPICS[0].name);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTitleAnimating, setIsTitleAnimating] = useState(true);
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

  // --- Hooks ---
  const {
    questions,
    setQuestions,
    userState,
    setUserState,
    startExam: startExamState,
    finishExam: finishExamState
  } = useExamState();

  const {
    showPayment,
    setShowPayment,
    errorMsg,
    setErrorMsg,
    pollForWebhookCompletion
  } = usePayment();

  // --- Effects ---

  // Save seen exams
  useEffect(() => {
    localStorage.setItem('seenExamIds', JSON.stringify(seenExamIds));
  }, [seenExamIds]);

  // Stop title animation
  useEffect(() => {
    const timer = setTimeout(() => setIsTitleAnimating(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Check for saved session / access link
  useEffect(() => {
    const checkSaved = async () => {
      // PRIORITY 1: Check for ?access= URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const accessParam = urlParams.get('access');

      if (accessParam) {
        console.log('[App] Access link detected in URL');
        try {
          const [sessionToken, examId] = accessParam.split('_');

          if (sessionToken && examId) {
            console.log('[App] Restoring session from access link');
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('currentExamId', examId);

            const res = await fetch(`/api/verify-access`, {
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
              window.history.replaceState({}, '', window.location.pathname);
              setMode('start');
              return;
            } else {
              console.log('[App] ❌ Access link expired or invalid');
              setErrorMsg('Link di accesso scaduto o non valido.');
            }
          }
        } catch (e) {
          console.error('[App] Failed to process access link', e);
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
              console.log('[App] Restored session from localStorage');
              setQuestions(data.exam.questions);
              setMode('start');
            } else {
              console.log('[App] Saved session no longer valid');
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
  }, [setQuestions, setErrorMsg]);

  // Check for Stripe Redirect
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentId = urlParams.get("payment_intent");
      const redirectStatus = urlParams.get("redirect_status");

      if (paymentIntentId && redirectStatus === 'succeeded') {
        console.log('[App] 💳 Stripe redirect detected:', paymentIntentId);

        try {
          const res = await fetch(`/api/verify-payment/${paymentIntentId}`);
          const data = await res.json();

          if (data.status === 'succeeded') {
            const pendingType = localStorage.getItem('pendingExamType') as 'full' | 'topic' | null;
            const pendingTopic = localStorage.getItem('pendingTopic');
            const pendingDifficulty = localStorage.getItem('pendingDifficulty') as 'easy' | 'medium' | 'hard' | null;

            if (data.sessionToken && data.examId) {
              console.log('[App] ✅ Payment verified, token received');
              localStorage.setItem('sessionToken', data.sessionToken);
              localStorage.setItem('currentExamId', data.examId);
              if (data.expiresAt) {
                setAccessExpiresAt(data.expiresAt);
                localStorage.setItem('accessExpiresAt', data.expiresAt);
              }

              try {
                const accessRes = await fetch(`/api/verify-access`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ examId: data.examId, sessionToken: data.sessionToken })
                });
                const accessData = await accessRes.json();

                if (accessData.hasAccess && accessData.exam) {
                  setQuestions(accessData.exam.questions);
                  if (pendingType) setExamType(pendingType);
                  if (pendingTopic) setSelectedTopic(pendingTopic);
                  if (pendingDifficulty) setDifficulty(pendingDifficulty);

                  window.history.replaceState({}, '', window.location.pathname);

                  const accessLink = `${window.location.origin}${window.location.pathname}?access=${data.sessionToken}_${data.examId}`;
                  alert(`✅ Pagamento riuscito!\n\n🔗 Link di accesso (valido 45 min):\n${accessLink}\n\nPuoi usare questo link su qualsiasi dispositivo!`);

                  startExam();
                  return;
                }
              } catch (e) {
                console.error('[App] ❌ Access verification failed:', e);
                setErrorMsg('Errore nella verifica accesso. Riprova.');
              }
            }

            // Fallback
            if (pendingType) {
              setExamType(pendingType);
              if (pendingTopic) setSelectedTopic(pendingTopic);
              if (pendingDifficulty) setDifficulty(pendingDifficulty);
            } else {
              setExamType('full');
            }
            window.history.replaceState({}, '', window.location.pathname);
            triggerExamGeneration(
              pendingType || 'full',
              pendingTopic || 'Introduzione e Metodi',
              pendingDifficulty || 'medium'
            );
          } else if (data.status === 'processing') {
            setErrorMsg("Pagamento in elaborazione. Ricarica la pagina tra poco.");
          } else {
            setErrorMsg(`Pagamento non riuscito: ${data.status}. Riprova.`);
          }
        } catch (e) {
          console.error("Payment verification failed", e);
          setErrorMsg(`Errore verifica pagamento: ${(e as Error).message}.`);
        }
      }
    };
    checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        console.log('[App] Access window expired');
        handleFinishExam();
        localStorage.removeItem('currentExamId');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('accessExpiresAt');
        setAccessExpiresAt(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setUserState(() => ({
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
  }, []);

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

  // Save answers periodically
  useEffect(() => {
    const examId = localStorage.getItem('currentExamId');
    if (examId && Object.keys(userState.answers).length > 0) {
      localStorage.setItem(`answers_${examId} `, JSON.stringify(userState.answers));
    }
  }, [userState.answers]);


  // --- Handlers ---

  const handleStartClick = () => {
    if (!examType) return;
    localStorage.setItem('pendingExamType', examType);
    localStorage.setItem('pendingTopic', selectedTopic);
    localStorage.setItem('pendingDifficulty', difficulty);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);

    // Check for redirect first
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent');
    const redirectStatus = urlParams.get('redirect_status');

    if (paymentIntentId && redirectStatus === 'succeeded') {
      console.log('[Payment] 💳 Stripe redirect detected, starting polling...');
      const data = await pollForWebhookCompletion(paymentIntentId);

      if (data) {
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('currentExamId', data.examId);
        localStorage.setItem('accessExpiresAt', data.expiresAt);
        setAccessExpiresAt(data.expiresAt);

        const accessRes = await fetch(`/api/verify-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: data.examId, sessionToken: data.sessionToken })
        });
        const accessData = await accessRes.json();

        if (accessData.hasAccess && accessData.exam) {
          setQuestions(accessData.exam.questions);
          setSeenExamIds(prev => [...prev, data.examId]);

          const accessLink = `${window.location.origin}${window.location.pathname}?access=${data.sessionToken}_${data.examId}`;
          window.history.replaceState({}, '', window.location.pathname);
          alert(`✅ Pagamento riuscito!\n\n🔗 Link di accesso (valido 45 min):\n${accessLink}\n\nPuoi usare questo link su qualsiasi dispositivo!`);

          startExam();
          return;
        }
      }
      return;
    }

    // Promo code flow
    const savedToken = localStorage.getItem('sessionToken');
    const savedExamId = localStorage.getItem('currentExamId');
    const savedExpires = localStorage.getItem('accessExpiresAt');

    if (savedToken && savedExamId) {
      try {
        setMode('loading');
        setErrorMsg(null);

        const response = await fetch('/api/verify-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: savedExamId, sessionToken: savedToken })
        });

        const data = await response.json();

        if (data.hasAccess && data.exam) {
          setQuestions(data.exam.questions);
          if (savedExpires) setAccessExpiresAt(savedExpires);
          setSeenExamIds(prev => [...prev, savedExamId]);
          startExam();
        } else {
          throw new Error(data.error || 'Access denied');
        }
      } catch (err) {
        console.error('Promo access error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setErrorMsg(`Errore caricamento esame: ${errMsg}. Riprova.`);
        setMode('start');
      }
    }
  };

  const startExam = () => {
    startExamState();
    setMode('exam');
  };

  const handleFinishExam = () => {
    const score = finishExamState();
    setMode('results');

    // Save history
    const newHistoryItem = {
      id: localStorage.getItem('currentExamId') || Date.now().toString(),
      date: new Date().toISOString(),
      score,
      totalQuestions: questions.length,
      difficulty,
      topic: examType === 'full' ? 'Simulazione Completa' : selectedTopic,
      answers: userState.answers
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

  const triggerExamGeneration = async (type: string, topic: string, diff: string) => {
    setMode('loading');
    setErrorMsg(null);

    try {
      const topicToUse = type === 'full' ? 'full' : topic;
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

      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      if (data.id) {
        localStorage.setItem('currentExamId', data.id);
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

  // --- Render ---

  return (
    <TerminalLayout>
      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          isOpen={true}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          examType={examType}
          topic={selectedTopic}
          difficulty={difficulty}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <HistoryView
          history={history}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-full text-white">!</div>
            <span className="font-mono font-bold">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-4 hover:text-white transition-colors">✕</button>
          </div>
        </div>
      )}

      {/* Views */}
      {mode === 'start' && (
        <StartScreen
          onStart={handleStartClick}
          examType={examType}
          setExamType={setExamType}
          selectedTopic={selectedTopic}
          setSelectedTopic={setSelectedTopic}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          isTitleAnimating={isTitleAnimating}
          topics={TOPICS}
          onShowHistory={() => setShowHistory(true)}
        />
      )}

      {mode === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-terminal-dim/30 border-t-terminal-green rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-terminal-green animate-pulse">GENERAZIONE ESAME IN CORSO...</h2>
            <p className="text-terminal-dim text-sm max-w-md">
              Il sistema sta elaborando domande uniche basate sul syllabus DM418.
              <br />
              <span className="text-xs opacity-70">Potrebbe richiedere fino a 30 secondi.</span>
            </p>
          </div>
        </div>
      )}

      {mode === 'exam' && (
        <ExamView
          questions={questions}
          userState={userState}
          setUserState={setUserState}
          onFinish={handleFinishExam}
          accessTimeLeft={accessTimeLeft}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {mode === 'results' && (
        <ResultsView
          userState={userState}
          questions={questions}
          onRestart={() => {
            // Clear session data to prevent auto-restore
            localStorage.removeItem('stressTestSession');
            localStorage.removeItem('stressTestStartTime');
            setMode('start');
          }}
          history={history}
          examType={examType || 'full'}
          topic={selectedTopic}
          difficulty={difficulty}
        />
      )}
    </TerminalLayout>
  );
}
