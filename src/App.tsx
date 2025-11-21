import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Clock, CheckCircle, XCircle, AlertCircle, Play, RotateCcw,
  Brain, ChevronRight, ChevronLeft, Flag, Menu, X, GraduationCap,
  Zap, Thermometer, Droplets, Waves, Activity
} from 'lucide-react';
import { NeoButton } from './components/ui/NeoButton';
import { NeoCard } from './components/ui/NeoCard';
import { MathText } from './components/ui/MathText';
import { PaymentModal } from './components/ui/PaymentModal';
import { DeepSeekService } from './services/deepseek';
import type { Question, UserState, Topic } from './types';

// --- Constants ---

const TOPICS: Topic[] = [
  { id: 'intro', name: "Introduzione e Metodi", icon: <BookOpen className="w-5 h-5" /> },
  { id: 'mechanics', name: "Meccanica", icon: <Activity className="w-5 h-5" /> },
  { id: 'fluids', name: "Meccanica dei Fluidi", icon: <Droplets className="w-5 h-5" /> },
  { id: 'waves', name: "Onde Meccaniche", icon: <Waves className="w-5 h-5" /> },
  { id: 'thermo', name: "Termodinamica", icon: <Thermometer className="w-5 h-5" /> },
  { id: 'electromag', name: "Elettricità e Magnetismo", icon: <Zap className="w-5 h-5" /> },
  { id: 'radiation', name: "Radiazioni e Ottica", icon: <Play className="w-5 h-5" /> }
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
    setMode('exam');
  };

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
    <div className="max-w-5xl mx-auto px-4 py-12 font-sans">
      <header className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-block bg-black text-white px-4 py-1 mb-4 font-mono text-sm font-bold tracking-widest border-2 border-black shadow-neo transform -rotate-1">
          TEST AMMISSIONE MEDICINA 2025
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter mb-6 drop-shadow-[4px_4px_0px_rgba(163,230,53,1)]">
          StressTest<span className="italic font-serif font-normal text-gray-800">Fisica</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-800 font-medium max-w-2xl mx-auto border-l-4 border-black pl-6 text-left bg-white p-6 shadow-neo rounded-r-xl">
          La simulazione definitiva per aspiranti medici.
          <br />
          <span className="text-base font-normal text-gray-600 mt-2 block">
            Algoritmi DeepSeek Reasoner per domande di livello universitario.
          </span>
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <NeoCard
          onClick={() => { setExamType('full'); }}
          active={examType === 'full'}
          className={examType === 'full' ? 'bg-neo-blue/20 ring-2 ring-black' : 'bg-white hover:bg-gray-50'}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-black text-white rounded-lg border-2 border-black shadow-neo-sm">
              <GraduationCap size={32} />
            </div>
            {examType === 'full' && <CheckCircle className="text-black" size={24} />}
          </div>
          <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Simulazione Completa</h3>
          <p className="text-gray-700 mb-4 font-medium">31 Domande (15 Inedite + 16 Fill) su tutto il programma ministeriale. 45 Minuti.</p>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
            <div className="h-full bg-neo-blue w-full striped-bar"></div>
          </div>
          <p className="text-xs font-mono font-bold mt-2 text-right uppercase">Syllabus Completo</p>
        </NeoCard>

        <NeoCard
          onClick={() => { setExamType('topic'); }}
          active={examType === 'topic'}
          className={examType === 'topic' ? 'bg-neo-purple/20 ring-2 ring-black' : 'bg-white hover:bg-gray-50'}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-black text-white rounded-lg border-2 border-black shadow-neo-sm">
              <Brain size={32} />
            </div>
            {examType === 'topic' && <CheckCircle className="text-black" size={24} />}
          </div>
          <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Focus Verticale</h3>
          <p className="text-gray-700 mb-4 font-medium">Allenamento mirato per colmare le lacune specifiche prima del test.</p>

          {examType === 'topic' && (
            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-3 rounded-lg border-2 border-black bg-white font-bold focus:shadow-neo outline-none transition-all cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {TOPICS.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </NeoCard>
      </div>

      {examType && (
        <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-300">
          <div className="bg-neo-red/10 p-6 border-2 border-black shadow-neo-lg rounded-xl">
            <label className="block text-sm font-black text-black mb-3 uppercase tracking-wider">Livello di Difficoltà</label>
            <div className="flex gap-2 mb-6">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`
                    flex-1 py-2 text-sm font-bold border-2 border-black rounded-lg transition-all uppercase
                    ${difficulty === level
                      ? 'bg-black text-white shadow-neo-sm translate-x-[1px] translate-y-[1px]'
                      : 'bg-white text-black hover:bg-gray-100 shadow-neo'}
                  `}
                >
                  {level === 'easy' ? 'Base' : level === 'medium' ? 'Std' : 'Pro'}
                </button>
              ))}
            </div>

            <NeoButton onClick={handleStartClick} className="w-full text-lg">
              <Play size={24} strokeWidth={3} /> AVVIA SIMULAZIONE (€0.49)
            </NeoButton>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-8 p-4 bg-neo-red text-black border-2 border-black shadow-neo rounded-lg flex items-center justify-center gap-2 font-bold">
          <AlertCircle size={24} /> {errorMsg}
        </div>
      )}
    </div>
  );

  const LoadingView = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-8 border-black rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-4xl font-black text-black uppercase tracking-tight">Generazione in Corso</h2>
      <p className="text-xl font-mono text-gray-600 mt-4 bg-gray-100 px-4 py-1 border-2 border-black shadow-neo">
        DeepSeek sta preparando il test...
      </p>
    </div>
  );

  const ExamView = () => {
    const currentQ = questions[userState.currentQuestionIndex];
    const isFlagged = userState.flagged[currentQ.id];

    return (
      <div className="flex h-screen bg-neo-bg overflow-hidden font-sans text-black">
        <aside className={`
          fixed md:relative z-30 w-80 h-full bg-white border-r-2 border-black transform transition-transform duration-300 ease-in-out flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 border-b-2 border-black flex justify-between items-center bg-neo-lime">
            <div>
              <h2 className="font-black text-xl uppercase tracking-tight">Navigazione</h2>
              <p className="font-mono text-xs font-bold mt-1">Q. {userState.currentQuestionIndex + 1} / {questions.length}</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden border-2 border-black p-1 bg-white rounded hover:bg-gray-100"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-green-50">
            <div className="grid grid-cols-4 gap-3">
              {questions.map((q, idx) => {
                const isAnswered = !!userState.answers[q.id];
                const isCurrent = idx === userState.currentQuestionIndex;
                const isFlaggedQ = userState.flagged[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setUserState(p => ({ ...p, currentQuestionIndex: idx }))}
                    className={`
                      relative h-12 rounded-lg font-bold text-sm transition-all border-2 border-black
                      ${isCurrent ? 'bg-black text-white shadow-none translate-x-[2px] translate-y-[2px]' :
                        isAnswered ? 'bg-neo-blue text-black shadow-neo-sm' : 'bg-white text-gray-500 hover:bg-gray-50 shadow-neo-sm'}
                    `}
                  >
                    {idx + 1}
                    {isFlaggedQ && <div className="absolute -top-2 -right-2 w-4 h-4 bg-neo-red rounded-full border-2 border-black" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t-2 border-black bg-white">
            <NeoButton variant="dark" onClick={finishExam} className="w-full">
              CONSEGNA ESAME
            </NeoButton>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <header className="h-20 bg-white border-b-2 border-black flex items-center justify-between px-6 shadow-sm z-20">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden border-2 border-black p-2 rounded bg-gray-100"><Menu /></button>
            <div className={`flex items-center space-x-3 px-6 py-2 rounded-full border-2 border-black font-mono font-bold text-lg shadow-neo ${userState.timeRemaining < 300 ? 'bg-neo-red animate-pulse' : 'bg-neo-yellow'}`}>
              <Clock size={24} strokeWidth={2.5} />
              <span>{formatTime(userState.timeRemaining)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFlag}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-black font-bold transition-all
                  ${isFlagged ? 'bg-neo-red text-black shadow-none translate-x-[2px] translate-y-[2px]' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-neo'}
                `}
              >
                <Flag size={20} fill={isFlagged ? "currentColor" : "none"} />
                <span className="hidden sm:inline">{isFlagged ? 'SEGNALATA' : 'SEGNALA'}</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-neo-bg">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block px-3 py-1 bg-black text-white text-xs font-bold font-mono uppercase tracking-widest border border-black">
                    DOMANDA {currentQ.id}
                  </span>
                  <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest border-2 border-black rounded-full ${currentQ.type === 'multiple_choice' ? 'bg-neo-blue/50' : 'bg-neo-purple/50'}`}>
                    {currentQ.type === 'multiple_choice' ? 'Scelta Multipla' : 'Completamento'}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-black leading-snug bg-white border-2 border-black p-6 shadow-neo-lg rounded-xl">
                  <MathText content={currentQ.text} />
                </h2>
              </div>

              <div className="space-y-4 pl-2">
                {currentQ.type === 'multiple_choice' ? (
                  <div className="grid gap-4">
                    {currentQ.options?.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        className={`w-full p-5 text-left rounded-xl border-2 border-black transition-all group relative flex items-center
                          ${userState.answers[currentQ.id] === opt
                            ? 'bg-neo-purple shadow-none translate-x-[4px] translate-y-[4px]'
                            : 'bg-white hover:bg-neo-purple/20 shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm'}
                        `}
                      >
                        <div className={`
                          w-10 h-10 flex items-center justify-center rounded-lg border-2 border-black mr-5 font-black text-lg font-mono
                          ${userState.answers[currentQ.id] === opt ? 'bg-black text-white' : 'bg-gray-100 text-black group-hover:bg-white'}
                        `}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className="flex-1 text-lg font-medium"><MathText content={opt} /></div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-xl border-2 border-black shadow-neo-lg">
                    <label className="block text-lg font-black text-black mb-4 uppercase">La tua risposta:</label>
                    <input
                      type="text"
                      value={userState.answers[currentQ.id] || ''}
                      onChange={(e) => handleAnswer(e.target.value)}
                      placeholder="Scrivi qui..."
                      className="w-full p-4 text-xl font-mono border-2 border-black rounded-lg bg-gray-50 focus:bg-white focus:ring-0 focus:shadow-neo outline-none transition-all placeholder:text-gray-400"
                    />
                    <p className="mt-4 text-sm font-bold text-gray-500 flex items-center gap-2">
                      <Zap size={16} /> Risposta concisa richiesta (numero o parola).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="bg-white border-t-2 border-black p-6 flex justify-between items-center max-w-full z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <NeoButton
              variant="secondary"
              onClick={() => setUserState(p => ({ ...p, currentQuestionIndex: Math.max(0, p.currentQuestionIndex - 1) }))}
              disabled={userState.currentQuestionIndex === 0}
            >
              <ChevronLeft size={20} strokeWidth={3} /> PRECEDENTE
            </NeoButton>

            {userState.currentQuestionIndex < questions.length - 1 ? (
              <NeoButton
                variant="primary"
                onClick={() => setUserState(p => ({ ...p, currentQuestionIndex: Math.min(questions.length - 1, p.currentQuestionIndex + 1) }))}
              >
                SUCCESSIVA <ChevronRight size={20} strokeWidth={3} />
              </NeoButton>
            ) : (
              <NeoButton
                variant="dark"
                onClick={finishExam}
              >
                TERMINA <CheckCircle size={20} strokeWidth={3} />
              </NeoButton>
            )}

          </footer>
        </main>
      </div>
    );
  };

  const ResultsView = () => {
    const percentage = Math.round((userState.score / questions.length) * 100);
    const passed = percentage >= 60;

    return (
      <div className="min-h-screen bg-neo-bg py-12 px-4 font-sans text-black">
        <div className="max-w-5xl mx-auto space-y-12">

          <div className="bg-white rounded-2xl shadow-neo-lg p-8 md:p-12 text-center border-2 border-black relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-4 border-b-2 border-black ${passed ? 'bg-neo-lime' : 'bg-neo-red'}`}></div>
            <h2 className="text-4xl md:text-5xl font-black text-black mb-2 uppercase tracking-tight">Report Esame</h2>

            <div className="flex justify-center items-center my-8">
              <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-4 border-black bg-white shadow-neo">
                <div className="text-center z-10">
                  <span className={`text-6xl font-black ${passed ? 'text-[#65a30d]' : 'text-[#dc2626]'}`}>{percentage}%</span>
                  <p className="text-sm font-bold font-mono uppercase tracking-widest mt-1">Punteggio</p>
                </div>
              </div>
            </div>

            <p className="text-2xl font-bold mb-8">
              Risultato: <span className={`px-3 py-1 text-white border-2 border-black rounded ${passed ? 'bg-[#65a30d]' : 'bg-[#dc2626]'}`}>{passed ? 'SUPERATO' : 'NON SUPERATO'}</span>
              <br />
              <span className="text-lg font-medium text-gray-600 mt-2 block">Hai risposto correttamente a {userState.score} su {questions.length} domande.</span>
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <NeoButton variant="dark" onClick={() => setMode('start')}>
                <RotateCcw size={18} strokeWidth={3} /> NUOVA SIMULAZIONE
              </NeoButton>
              <NeoButton
                variant="info"
                onClick={generateStudyPlan}
                disabled={loadingPlan || aiStudyPlan !== null}
              >
                {loadingPlan ? 'ELABORAZIONE...' : 'PIANO DI STUDIO IA'} <Zap size={18} strokeWidth={3} />
              </NeoButton>
            </div>

            {aiStudyPlan && (
              <div className="mt-12 text-left bg-blue-50 p-8 rounded-xl border-2 border-black shadow-neo animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-black text-2xl mb-4 flex items-center uppercase"><Brain className="mr-3" strokeWidth={3} /> Analisi IA</h3>
                <div className="prose prose-lg max-w-none font-medium text-gray-800">
                  <MathText content={aiStudyPlan} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-3xl font-black text-black border-b-4 border-black inline-block pb-2 uppercase">Dettaglio Risposte</h3>
            {questions.map((q, idx) => {
              const userAns = userState.answers[q.id];
              const isCorrect = compareAnswers(userAns, q.correctAnswer, q.type);
              return (
                <div key={q.id} className={`bg-white rounded-xl shadow-neo border-2 border-black p-6 md:p-8 relative overflow-hidden group hover:translate-x-1 hover:-translate-y-1 transition-transform`}>
                  <div className={`absolute top-0 left-0 w-2 h-full border-r-2 border-black ${isCorrect ? 'bg-neo-lime' : 'bg-neo-red'}`}></div>
                  <div className="pl-4">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <span className="inline-block px-2 py-1 rounded border-2 border-black text-xs font-bold bg-gray-100 mb-3 font-mono">DOMANDA {idx + 1}</span>
                        <h4 className="text-xl font-bold text-black leading-relaxed"><MathText content={q.text} /></h4>
                      </div>
                      <div className="ml-6 p-2 border-2 border-black rounded-lg bg-white">
                        {isCorrect ? <CheckCircle className="text-[#65a30d]" size={32} strokeWidth={3} /> : <XCircle className="text-[#dc2626]" size={32} strokeWidth={3} />}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6 text-base">
                      <div className={`p-4 rounded-lg border-2 border-black ${isCorrect ? 'bg-lime-100' : 'bg-red-100'}`}>
                        <span className="font-black text-xs uppercase tracking-wider block mb-2 text-gray-700">La tua risposta</span>
                        <span className="font-mono font-bold text-lg">{userAns || "---"}</span>
                      </div>
                      {!isCorrect && (
                        <div className="p-4 rounded-lg border-2 border-black bg-green-100">
                          <span className="font-black text-xs uppercase tracking-wider block mb-2 text-gray-700">Risposta Corretta</span>
                          <span className="font-mono font-bold text-lg">{q.correctAnswer}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-6 border-t-2 border-black border-dashed">
                      <p className="text-gray-800 leading-relaxed font-medium">
                        <span className="font-black text-black uppercase mr-2 bg-neo-yellow px-2 border border-black text-sm">Spiegazione</span>
                        <MathText content={q.explanation} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neo-bg text-black font-sans selection:bg-neo-yellow">
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />

      {mode === 'start' && <StartView />}
      {mode === 'loading' && <LoadingView />}
      {mode === 'exam' && <ExamView />}
      {mode === 'results' && <ResultsView />}
    </div>
  );
}
