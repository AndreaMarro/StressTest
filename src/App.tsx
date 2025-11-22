import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Clock, CheckCircle, XCircle, AlertCircle, Play, RotateCcw,
  Brain, ChevronRight, ChevronLeft, Flag, Menu, X, GraduationCap,
  Zap, Thermometer, Droplets, Waves, Activity, Terminal, MessageSquare
} from 'lucide-react';
import TerminalLayout from './components/layout/TerminalLayout';
import TypingText from './components/ui/TypingText';
import { MathText } from './components/ui/MathText';
import { PaymentModal } from './components/ui/PaymentModal';
import Forum from './components/Forum';
import { DeepSeekService } from './services/deepseek';
import type { Question, UserState, Topic } from './types';

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
  const [aiStudyPlan, setAiStudyPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showForum, setShowForum] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deepSeekRef = useRef<DeepSeekService | null>(null);

  // --- Logic ---

  const handleStartClick = () => {
    if (!examType) return;
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    generateQuestions();
  };

  const generateQuestions = async () => {
    setMode('loading');
    setErrorMsg(null);

    // Use backend service
    if (!deepSeekRef.current) {
      deepSeekRef.current = new DeepSeekService();
    }

    try {
      const topicName = examType === 'full' ? 'full' : selectedTopic;
      const generatedQuestions = await deepSeekRef.current.generateExam(topicName, difficulty);

      if (!generatedQuestions || generatedQuestions.length === 0) throw new Error("Nessuna domanda generata");

      setQuestions(generatedQuestions);
      startExam();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Errore durante la generazione. Riprova.");
      setMode('start');
    }
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
    setMode('exam');
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
          setUserState(prev => ({
            ...parsed.userState,
            timeRemaining: parsed.isExamFinished ? 0 : Math.max(0, totalDuration - elapsed)
          }));
          setMode(parsed.isExamFinished ? 'results' : 'exam');
          if (parsed.aiStudyPlan) setAiStudyPlan(parsed.aiStudyPlan);
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
        isExamFinished: mode === 'results',
        aiStudyPlan
      };
      localStorage.setItem('stressTestSession', JSON.stringify(sessionData));
    }
  }, [userState, questions, mode, aiStudyPlan]);

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
  }, [userState.isExamActive, userState.isExamFinished]);

  const finishExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    questions.forEach(q => {
      const userAns = userState.answers[q.id];
      if (compareAnswers(userAns, q.correctAnswer, q.type)) {
        score++;
      }
    });

    setUserState(prev => ({ ...prev, isExamActive: false, isExamFinished: true, score }));
    setMode('results');
  };

  const compareAnswers = (user: string, correct: string, type: string) => {
    if (!user) return false;
    if (type === 'multiple_choice') {
      return user.trim() === correct.trim() || user.startsWith(correct) || correct.startsWith(user);
    } else {
      const cleanUser = user.toLowerCase().replace(/\s+/g, '').replace(',', '.');
      const cleanCorrect = correct.toLowerCase().replace(/\s+/g, '').replace(',', '.');
      return cleanUser === cleanCorrect || cleanUser.includes(cleanCorrect) || cleanCorrect.includes(cleanUser);
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

  const generateStudyPlan = async () => {
    if (!deepSeekRef.current) return;
    setLoadingPlan(true);
    const wrongAnswers = questions.filter(q => !compareAnswers(userState.answers[q.id], q.correctAnswer, q.type));

    try {
      const plan = await deepSeekRef.current.generateStudyPlan(wrongAnswers);
      setAiStudyPlan(plan);
    } catch (e) {
      setAiStudyPlan("Impossibile generare il piano al momento.");
    } finally {
      setLoadingPlan(false);
    }
  };

  // --- Views ---

  const StartView = () => (
    <div className="max-w-4xl mx-auto">
      <header className="mb-12 border-l-2 border-terminal-green pl-6 py-2 flex justify-between items-start">
        <div>
          <div className="text-xs font-bold text-terminal-dim mb-2">SYSTEM_BOOT_SEQUENCE_INIT...</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">
            <TypingText text="SEMESTRE_FILTRO" speed={50} />
          </h1>
          <p className="text-terminal-dim text-lg max-w-2xl">
            Simulazione conforme al protocollo <span className="text-terminal-green">DM418/2025</span>.
            <br />
            Sopravvivi al filtro o cambia facoltà.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowForum(true)}
            className="hidden md:flex flex-col items-center gap-1 text-terminal-red hover:text-red-400 transition-colors animate-pulse"
          >
            <MessageSquare size={32} />
            <span className="text-[10px] font-bold tracking-widest">PANIC_ROOM</span>
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

      <div className="grid md:grid-cols-2 gap-6 mb-12">
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
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
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

      {examType && (
        <div className="terminal-box animate-in fade-in zoom-in duration-300 border-terminal-green">
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
      )}

      {errorMsg && (
        <div className="mt-8 p-4 border border-terminal-red text-terminal-red flex items-center justify-center gap-2 font-bold bg-terminal-red/10">
          <AlertCircle size={20} /> ERROR: {errorMsg}
        </div>
      )}

      {/* Mobile Buttons */}
      <div className="md:hidden fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <a
          href="mailto:ermagician@gmail.com?subject=BUG_REPORT_SEMESTRE_FILTRO&body=DESCRIBE_THE_GLITCH_HERE..."
          className="bg-terminal-black border border-terminal-dim text-terminal-dim p-3 rounded-full shadow-[0_0_15px_rgba(136,136,136,0.3)]"
        >
          <AlertCircle size={24} />
        </a>
        <button
          onClick={() => setShowForum(true)}
          className="bg-terminal-black border border-terminal-red text-terminal-red p-3 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
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
          fixed md:relative z-30 w-64 bg-terminal-black border-r border-terminal-dim h-full transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          top-0 left-0 p-4 md:p-0 md:bg-transparent md:border-r-0
        `}>
          <div className="md:hidden flex justify-end mb-4">
            <button onClick={() => setSidebarOpen(false)}><X className="text-terminal-green" /></button>
          </div>

          <div className="terminal-box h-full overflow-y-auto">
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
              <h2 className="text-xl md:text-2xl font-bold leading-relaxed">
                <MathText content={currentQ.text} />
              </h2>
            </div>

            <div className="space-y-3">
              {currentQ.type === 'multiple_choice' ? (
                currentQ.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full p-4 text-left border transition-all flex items-center gap-4 group
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
                <div className="border border-terminal-dim p-6 bg-terminal-black/50">
                  <label className="block text-xs font-bold text-terminal-green mb-2 uppercase">INPUT_ANSWER:</label>
                  <input
                    type="text"
                    value={userState.answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="_"
                    className="w-full bg-transparent border-b-2 border-terminal-dim focus:border-terminal-green text-xl p-2 outline-none font-mono text-terminal-text placeholder-terminal-dim"
                    autoFocus
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

          <div className="flex justify-center gap-4">
            <button onClick={() => setMode('start')} className="terminal-button border-terminal-dim text-terminal-dim hover:border-terminal-text hover:text-terminal-text">
              <RotateCcw size={16} className="inline mr-2" /> REBOOT
            </button>
            <button
              onClick={generateStudyPlan}
              disabled={loadingPlan || aiStudyPlan !== null}
              className="terminal-button"
            >
              {loadingPlan ? 'PROCESSING...' : 'GENERATE_AI_ANALYSIS'} <Zap size={16} className="inline ml-2" />
            </button>
          </div>

          {aiStudyPlan && (
            <div className="mt-8 text-left border-t border-terminal-dim pt-8 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-terminal-green font-bold mb-4 flex items-center gap-2"><Brain size={16} /> NEURAL_ANALYSIS_LOG</h3>
              <div className="prose prose-invert max-w-none text-sm font-mono text-terminal-text">
                <MathText content={aiStudyPlan} />
              </div>
            </div>
          )}
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
                    {userAns || "NULL"}
                  </div>
                  {!isCorrect && (
                    <div className="p-3 border border-terminal-green/50 text-terminal-green">
                      <span className="block text-[10px] uppercase opacity-70 mb-1">Expected_Output</span>
                      {q.correctAnswer}
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
      />

      {showForum && <Forum onClose={() => setShowForum(false)} />}

      {mode === 'start' && <StartView />}
      {mode === 'loading' && <LoadingView />}
      {mode === 'exam' && <ExamView />}
      {mode === 'results' && <ResultsView />}
    </TerminalLayout>
  );
}
