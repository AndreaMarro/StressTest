import { Menu, X, AlertCircle, Clock, Flag, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { MathText } from '../ui/MathText';
import { BugReportButton } from '../ui/BugReportButton';
import type { Question, UserState } from '../../types';


interface ExamViewProps {
    questions: Question[];
    userState: UserState;
    setUserState: React.Dispatch<React.SetStateAction<UserState>>;
    onFinish: () => void;
    accessTimeLeft: number | null;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function ExamView({
    questions,
    userState,
    setUserState,
    onFinish,
    accessTimeLeft,
    sidebarOpen,
    setSidebarOpen
}: ExamViewProps) {
    const currentQ = questions[userState.currentQuestionIndex];

    // Helper for time formatting
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (value: string) => {
        setUserState(prev => ({
            ...prev,
            answers: { ...prev.answers, [currentQ.id]: value }
        }));
    };

    const toggleFlag = () => {
        setUserState(prev => ({
            ...prev,
            flagged: { ...prev.flagged, [currentQ.id]: !prev.flagged[currentQ.id] }
        }));
    };

    const navigate = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next'
            ? userState.currentQuestionIndex + 1
            : userState.currentQuestionIndex - 1;

        if (newIndex >= 0 && newIndex < questions.length) {
            setUserState(prev => ({ ...prev, currentQuestionIndex: newIndex }));
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header Bar */}
            <div className="flex justify-between items-center mb-6 p-4 border border-terminal-dim/30 rounded bg-terminal-black/50 backdrop-blur sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden p-2 text-terminal-green border border-terminal-green rounded"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="text-xl font-bold text-terminal-green">
                        Q.{userState.currentQuestionIndex + 1}<span className="text-terminal-dim text-sm">/{questions.length}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Access Timer (if applicable) */}
                    {accessTimeLeft !== null && (
                        <div className={`flex items-center gap-2 font-mono text-sm ${accessTimeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>
                            <Clock className="w-4 h-4" />
                            <span>SESSIONE: {formatTime(accessTimeLeft)}</span>
                        </div>
                    )}

                    <div className={`flex items-center gap-2 font-mono text-xl ${userState.timeRemaining < 300 ? 'text-red-500 animate-pulse' : 'text-terminal-green'}`}>
                        <Clock className="w-5 h-5" />
                        {formatTime(userState.timeRemaining)}
                    </div>

                    <button
                        onClick={onFinish}
                        className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded hover:bg-red-500/30 transition-colors text-sm font-bold uppercase"
                    >
                        Termina
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden relative">
                {/* Sidebar (Questions List) */}
                <div className={`
          absolute md:relative z-20 inset-y-0 left-0 w-64 bg-terminal-black md:bg-transparent border-r md:border-r-0 border-terminal-dim/30 p-4 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
                    <div className="grid grid-cols-4 gap-2 content-start overflow-y-auto max-h-full pr-2 custom-scrollbar">
                        {questions.map((q, idx) => {
                            const isAnswered = !!userState.answers[q.id];
                            const isFlagged = !!userState.flagged[q.id];
                            const isCurrent = idx === userState.currentQuestionIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => {
                                        setUserState(prev => ({ ...prev, currentQuestionIndex: idx }));
                                        setSidebarOpen(false);
                                    }}
                                    className={`
                    aspect-square flex items-center justify-center text-xs font-bold rounded border relative
                    ${isCurrent ? 'border-terminal-green bg-terminal-green text-terminal-black' :
                                            isAnswered ? 'border-terminal-green/50 text-terminal-green bg-terminal-green/10' :
                                                'border-terminal-dim/30 text-terminal-dim hover:border-terminal-green/50'}
                  `}
                                >
                                    {idx + 1}
                                    {isFlagged && (
                                        <div className="absolute -top-1 -right-1">
                                            <Flag className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Question Area */}
                <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-y-auto custom-scrollbar pb-20">
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 key={currentQ.id}">

                        {/* Question Text */}
                        <div className="p-6 border border-terminal-dim/30 rounded-lg bg-terminal-dim/5 relative group">
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={toggleFlag} className="text-terminal-dim hover:text-yellow-500">
                                    <Flag className={`w-5 h-5 ${userState.flagged[currentQ.id] ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                </button>
                            </div>
                            <div className="text-lg md:text-xl leading-relaxed">
                                <MathText content={currentQ.text} />
                            </div>
                        </div>

                        {/* Answers Area */}
                        <div className="space-y-3">
                            {currentQ.type === 'multiple_choice' ? (
                                <div className="grid gap-3">
                                    {currentQ.options?.map((opt) => {
                                        const isSelected = userState.answers[currentQ.id] === opt;
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => handleAnswer(opt)}
                                                className={`
                          w-full p-4 text-left rounded border transition-all flex items-start gap-3 group
                          ${isSelected
                                                        ? 'border-terminal-green bg-terminal-green/10 text-terminal-green shadow-[0_0_10px_rgba(0,255,0,0.1)]'
                                                        : 'border-terminal-dim/30 hover:border-terminal-green/50 text-terminal-dim hover:text-terminal-text'}
                        `}
                                            >
                                                <div className={`
                          w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5
                          ${isSelected ? 'border-terminal-green bg-terminal-green text-terminal-black' : 'border-terminal-dim group-hover:border-terminal-green'}
                        `}>
                                                    {isSelected && <div className="w-2 h-2 bg-black rounded-full" />}
                                                </div>
                                                <div className="text-base">
                                                    <MathText content={opt} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <label className="text-sm text-terminal-dim uppercase tracking-wider">La tua risposta:</label>
                                    <input
                                        type="text"
                                        value={userState.answers[currentQ.id] || ''}
                                        onChange={(e) => handleAnswer(e.target.value)}
                                        placeholder="Inserisci valore o testo..."
                                        className="w-full p-4 bg-terminal-black border border-terminal-dim/50 rounded text-lg focus:border-terminal-green focus:ring-1 focus:ring-terminal-green outline-none transition-all placeholder:text-terminal-dim/30"
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2 text-xs text-terminal-dim">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Per i numeri, usa il punto per i decimali (es. 9.81). Le unità di misura sono opzionali ma consigliate.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Navigation Footer */}
                    <div className="mt-8 flex justify-between items-center pt-6 border-t border-terminal-dim/20">
                        <button
                            onClick={() => navigate('prev')}
                            disabled={userState.currentQuestionIndex === 0}
                            className="flex items-center gap-2 px-4 py-2 text-terminal-dim hover:text-terminal-green disabled:opacity-30 disabled:hover:text-terminal-dim transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" /> Precedente
                        </button>

                        {userState.currentQuestionIndex === questions.length - 1 ? (
                            <button
                                onClick={onFinish}
                                className="flex items-center gap-2 px-6 py-2 bg-terminal-green text-terminal-black font-bold rounded hover:bg-terminal-green/90 transition-all shadow-[0_0_15px_rgba(0,255,0,0.3)]"
                            >
                                <CheckCircle className="w-5 h-5" /> CONSEGNA
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('next')}
                                className="flex items-center gap-2 px-6 py-2 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green/10 transition-all"
                            >
                                Successiva <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bug Report Button (Floating) */}
            <BugReportButton
                questionIndex={userState.currentQuestionIndex}
                examId={typeof window !== 'undefined' ? localStorage.getItem('currentExamId') : null}
            />
        </div>
    );
}
