import { useState, useEffect } from 'react';
import {
  BookOpen, Activity, Droplets, Waves, Thermometer, Zap, Play, Brain, User
} from 'lucide-react';
import TerminalLayout from './components/layout/TerminalLayout';
import { PaymentModal } from './components/ui/PaymentModal';
import { AuthModal } from './components/ui/AuthModal';
import { HistoryView } from './components/HistoryView';
import { StartScreen } from './components/views/StartScreen';
import { ExamView } from './components/views/ExamView';
import { ResultsView } from './components/views/ResultsView';
import { useSession } from './hooks/useSession';
import { usePayment } from './hooks/usePayment';
import type { Question, UserState } from './types';

const TOPICS = [
  { id: 'full', name: 'Simulazione Completa', icon: <Brain className="w-5 h-5" />, desc: 'Tutti gli argomenti (31 domande)' },
  { id: 'Introduzione e Metodi', name: 'Introduzione e Metodi', icon: <BookOpen className="w-5 h-5" />, desc: 'Grandezze, Unità, Vettori' },
  { id: 'Meccanica', name: 'Meccanica', icon: <Activity className="w-5 h-5" />, desc: 'Cinematica, Dinamica, Energia' },
  { id: 'Meccanica dei Fluidi', name: 'Meccanica dei Fluidi', icon: <Droplets className="w-5 h-5" />, desc: 'Idrostatica, Idrodinamica' },
  { id: 'Onde Meccaniche', name: 'Onde Meccaniche', icon: <Waves className="w-5 h-5" />, desc: 'Suono, Oscillazioni' },
  { id: 'Termodinamica', name: 'Termodinamica', icon: <Thermometer className="w-5 h-5" />, desc: 'Calore, Gas, Cicli' },
  { id: 'Elettricità e Magnetismo', name: 'Elettricità e Magnetismo', icon: <Zap className="w-5 h-5" />, desc: 'Campi, Circuiti, Induzione' },
  { id: 'Radiazioni e Ottica', name: 'Radiazioni e Ottica', icon: <Play className="w-5 h-5" />, desc: 'Ottica geometrica, Nucleare' },
];

function App() {
  const [mode, setMode] = useState<'start' | 'loading' | 'exam' | 'results'>('start');
  const [examType, setExamType] = useState<'full' | 'topic' | null>('full');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTitleAnimating, setIsTitleAnimating] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('examHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [userState, setUserState] = useState<UserState>({
    currentQuestionIndex: 0,
    answers: {},
    flagged: {},
    score: 0,
    timeRemaining: 0,
    isExamActive: false,
    isExamFinished: false,
    isComplete: false
  });

  const {
    pollForWebhookCompletion
  } = usePayment();

  const {
    timeLeft,
    isExpired,
    clearSession,
    userId,
    nickname,
    setUserId
  } = useSession({
    mode,
    setMode,
    setQuestions,
    setUserState,
    setErrorMsg,
    userState,
    questions
  });

  const handleStartClick = () => {
    if (!examType) return;

    if (examType === 'topic' && !selectedTopic) {
      setErrorMsg('Seleziona un argomento per continuare.');
      return;
    }

    // Store pending exam details
    localStorage.setItem('pendingExamType', examType);
    localStorage.setItem('pendingTopic', selectedTopic);
    localStorage.setItem('pendingDifficulty', difficulty);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (paymentIntent?: any) => {
    setIsPaymentModalOpen(false);

    // 1. Direct Payment Intent (No Redirect)
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      console.log('[App] Payment succeeded immediately:', paymentIntent.id);
      setMode('loading');
      setErrorMsg(null);

      // We need to wait for the token to be generated via webhook or lazy generation
      // Poll for status
      const data = await pollForWebhookCompletion(paymentIntent.id);

      if (data) {
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('currentExamId', data.examId);
        localStorage.setItem('accessExpiresAt', data.expiresAt);

        // Verify Access
        try {
          const accessRes = await fetch('/api/verify-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId: data.examId, sessionToken: data.sessionToken })
          });
          const accessData = await accessRes.json();

          if (accessData.hasAccess && accessData.exam) {
            setQuestions(accessData.exam.questions);

            window.history.replaceState({}, '', window.location.pathname);

            startExam();
            return;
          }
        } catch (e) {
          console.error('[App] ❌ Access verification failed:', e);
          setErrorMsg('Errore nella verifica accesso. Contatta il supporto.');
          setMode('start');
        }
      } else {
        setErrorMsg('Pagamento confermato ma errore nella generazione token. Contatta il supporto.');
        setMode('start');
      }
      return;
    }

    // 2. Check for Redirect (if page reloaded)
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent');
    const redirectStatus = urlParams.get('redirect_status');

    if (paymentIntentId && redirectStatus === 'succeeded') {
      return;
    }

    // 3. Promo Code Flow (Fallback)
    const savedToken = localStorage.getItem('sessionToken');
    const savedExamId = localStorage.getItem('currentExamId');

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

  // --- Effects ---

  // Stop title animation
  useEffect(() => {
    const timer = setTimeout(() => setIsTitleAnimating(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Check for Stripe Redirect
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentId = urlParams.get("payment_intent");
      const redirectStatus = urlParams.get("redirect_status");

      if (paymentIntentId && redirectStatus === 'succeeded') {
        console.log('[App] 💳 Stripe redirect detected:', paymentIntentId);
        setMode('loading'); // Show loading immediately
        setErrorMsg(null);

        try {
          // 1. Verify Payment with Server
          const res = await fetch(`/api/verify-payment/${paymentIntentId}`);
          const data = await res.json();

          console.log('[App] Payment verification result:', data);

          if (data.status === 'succeeded') {
            // 2. If succeeded, we expect a token.
            if (data.sessionToken && data.examId) {
              console.log('[App] ✅ Payment verified, token received');
              localStorage.setItem('sessionToken', data.sessionToken);
              localStorage.setItem('currentExamId', data.examId);
              if (data.expiresAt) {
                localStorage.setItem('accessExpiresAt', data.expiresAt);
              }

              // 3. Verify Access (Double Check)
              try {
                const accessRes = await fetch('/api/verify-access', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ examId: data.examId, sessionToken: data.sessionToken })
                });
                const accessData = await accessRes.json();

                if (accessData.hasAccess && accessData.exam) {
                  setQuestions(accessData.exam.questions);

                  // Restore pending state if available
                  const pendingType = localStorage.getItem('pendingExamType') as 'full' | 'topic' | null;
                  const pendingTopic = localStorage.getItem('pendingTopic');
                  const pendingDifficulty = localStorage.getItem('pendingDifficulty') as 'easy' | 'medium' | 'hard' | null;

                  if (pendingType) setExamType(pendingType);
                  if (pendingTopic) setSelectedTopic(pendingTopic);
                  if (pendingDifficulty) setDifficulty(pendingDifficulty);

                  // Clean URL
                  window.history.replaceState({}, '', window.location.pathname);

                  startExam();
                  return;
                }
              } catch (e) {
                console.error('[App] ❌ Access verification failed:', e);
                setErrorMsg('Errore nella verifica accesso. Contatta il supporto.');
                setMode('start');
              }
            } else {
              // Succeeded but no token? This shouldn't happen with the fix, but if it does, poll.
              console.warn('[App] Payment succeeded but no token. Polling webhook...');
              const pollData = await pollForWebhookCompletion(paymentIntentId);
              if (pollData) {
                localStorage.setItem('sessionToken', pollData.sessionToken);
                localStorage.setItem('currentExamId', pollData.examId);
                window.location.reload();
                return;
              } else {
                setErrorMsg('Pagamento confermato ma errore nella generazione token. Contatta il supporto.');
                setMode('start');
                return;
              }
            }
          } else if (data.status === 'processing') {
            console.log('[App] Payment processing. Polling...');
            const pollData = await pollForWebhookCompletion(paymentIntentId);
            if (pollData) {
              localStorage.setItem('sessionToken', pollData.sessionToken);
              localStorage.setItem('currentExamId', pollData.examId);
              window.location.reload();
              return;
            } else {
              setErrorMsg("Pagamento ancora in elaborazione. Ricarica la pagina tra poco.");
              setMode('start');
            }
          } else {
            setErrorMsg(`Stato pagamento: ${data.status}. Riprova.`);
            setMode('start');
          }
        } catch (e) {
          console.error("Payment verification failed", e);
          setErrorMsg(`Errore verifica pagamento: ${(e as Error).message}.`);
          setMode('start');
        }
      }
    };
    checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save answers periodically
  useEffect(() => {
    const examId = localStorage.getItem('currentExamId');
    if (examId && Object.keys(userState.answers).length > 0) {
      localStorage.setItem(`answers_${examId}`, JSON.stringify(userState.answers));
    }
  }, [userState.answers]);

  const startExam = () => {
    setUserState(prev => ({
      ...prev,
      timeRemaining: examType === 'full' ? 6000 : 3600, // 100 min or 60 min
      isComplete: false,
      answers: {},
      score: 0
    }));
    setMode('exam');
  };

  const handleSubmit = () => {
    let score = 0;
    questions.forEach(q => {
      if (userState.answers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    setUserState(prev => ({ ...prev, score, isComplete: true }));
    setMode('results');

    // Update history
    const newHistoryItem = {
      date: new Date().toISOString(),
      score,
      total: questions.length,
      type: examType,
      topic: selectedTopic,
      difficulty
    };

    const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('examHistory', JSON.stringify(updatedHistory));
  };

  const handleRestart = () => {
    setMode('start');
    setUserState({
      currentQuestionIndex: 0,
      answers: {},
      flagged: {},
      score: 0,
      timeRemaining: 0,
      isExamActive: false,
      isExamFinished: false,
      isComplete: false
    });
    clearSession();
  };

  // --- Render ---

  return (
    <TerminalLayout>
      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          examType={examType}
          topic={selectedTopic}
          difficulty={difficulty}
          userId={userId}
        />
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUserId={userId}
          onLoginSuccess={(newId, newNick) => {
            setUserId(newId, newNick);
          }}
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
          <div className="flex items-center gap-4">
            {/* Auth Button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-terminal-dim/30 hover:border-terminal-green text-terminal-dim hover:text-terminal-green transition-all text-sm font-mono"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{nickname || 'PROFILO'}</span>
            </button>

            <div className="flex items-center gap-2 text-terminal-dim text-sm font-mono">
              <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : 'bg-terminal-green animate-pulse'}`}></div>
              {isExpired ? 'SESSIONE SCADUTA' : 'SISTEMA ATTIVO'}
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
          onFinish={handleSubmit}
          accessTimeLeft={timeLeft}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {mode === 'results' && (
        <ResultsView
          userState={userState}
          questions={questions}
          onRestart={handleRestart}
          history={history}
          examType={examType || 'full'}
          topic={selectedTopic}
          difficulty={difficulty}
        />
      )}
    </TerminalLayout>
  );
}

export default App;
