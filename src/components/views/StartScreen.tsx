import { Brain, ChevronRight, GraduationCap, Trophy, AlertCircle, Clock } from 'lucide-react';
import TypingText from '../ui/TypingText';
import type { Topic } from '../../types';

interface StartScreenProps {
    onStart: () => void;
    examType: 'full' | 'topic' | null;
    setExamType: (type: 'full' | 'topic' | null) => void;
    selectedTopic: string;
    setSelectedTopic: (topic: string) => void;
    difficulty: 'easy' | 'medium' | 'hard';
    setDifficulty: (diff: 'easy' | 'medium' | 'hard') => void;
    isTitleAnimating: boolean;
    topics: Topic[];
    onShowHistory: () => void;
}

export function StartScreen({
    onStart,
    examType,
    setExamType,
    selectedTopic,
    setSelectedTopic,
    difficulty,
    setDifficulty,
    isTitleAnimating,
    topics,
    onShowHistory
}: StartScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-8 animate-in fade-in zoom-in duration-500">

            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-2xl">
                <div className="relative inline-block">
                    <div className="absolute -inset-1 bg-terminal-green/20 blur-xl rounded-full animate-pulse"></div>
                    <Brain className="w-20 h-20 text-terminal-green relative z-10 mx-auto mb-4" />
                </div>

                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-2 glitch-text" data-text="STRESSTEST_FISICA">
                    STRESSTEST_FISICA
                </h1>

                <div className="h-8 md:h-10 flex items-center justify-center">
                    {isTitleAnimating ? (
                        <TypingText
                            text="SIMULAZIONE ADATTIVA // SEMESTRE FILTRO"
                            className="text-lg md:text-xl text-terminal-dim font-mono"
                            speed={50}
                        />
                    ) : (
                        <div className="flex items-center gap-2 text-terminal-dim font-mono text-lg md:text-xl animate-pulse">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            <span>SYSTEM_READY</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Menu */}
            <div className="w-full max-w-md space-y-4 bg-terminal-black/50 p-6 rounded-lg border border-terminal-dim/30 backdrop-blur-sm shadow-2xl">

                {/* Mode Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setExamType('full')}
                        className={`p-4 rounded border transition-all flex flex-col items-center gap-2 ${examType === 'full'
                            ? 'border-terminal-green bg-terminal-green/10 text-terminal-green shadow-[0_0_15px_rgba(0,255,0,0.2)]'
                            : 'border-terminal-dim/50 text-terminal-dim hover:border-terminal-green/50 hover:text-terminal-green/80'
                            }`}
                    >
                        <GraduationCap className="w-6 h-6" />
                        <span className="font-bold">SIMULAZIONE COMPLETA</span>
                        <span className="text-[10px] opacity-70">31 Domande • 45 Min</span>
                    </button>

                    <button
                        onClick={() => setExamType('topic')}
                        className={`p-4 rounded border transition-all flex flex-col items-center gap-2 ${examType === 'topic'
                            ? 'border-terminal-green bg-terminal-green/10 text-terminal-green shadow-[0_0_15px_rgba(0,255,0,0.2)]'
                            : 'border-terminal-dim/50 text-terminal-dim hover:border-terminal-green/50 hover:text-terminal-green/80'
                            }`}
                    >
                        <Brain className="w-6 h-6" />
                        <span className="font-bold">ALLENAMENTO MIRATO</span>
                        <span className="text-[10px] opacity-70">Focus su Argomento</span>
                    </button>
                </div>

                {/* Topic Selector (Only if Topic Mode) */}
                {examType === 'topic' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-xs text-terminal-dim uppercase tracking-widest">Seleziona Modulo</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {topics.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTopic(t.name)}
                                    className={`flex items-center gap-3 p-3 rounded border text-sm transition-all text-left ${selectedTopic === t.name
                                        ? 'border-terminal-green bg-terminal-green/10 text-terminal-green'
                                        : 'border-terminal-dim/30 text-terminal-dim hover:border-terminal-green/30'
                                        }`}
                                >
                                    {t.icon}
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Difficulty Selector */}
                {examType && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-xs text-terminal-dim uppercase tracking-widest">Livello Difficoltà</label>
                        <div className="flex gap-2">
                            {(['easy', 'medium', 'hard'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`flex-1 py-2 text-xs uppercase tracking-wider border rounded transition-all ${difficulty === d
                                        ? d === 'hard'
                                            ? 'border-red-500 text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(255,0,0,0.2)]'
                                            : 'border-terminal-green text-terminal-green bg-terminal-green/10'
                                        : 'border-terminal-dim/30 text-terminal-dim hover:border-terminal-dim'
                                        }`}
                                >
                                    {d === 'hard' ? 'Semestre Filtro' : d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Start Button */}
                <button
                    onClick={onStart}
                    disabled={!examType}
                    className={`w-full py-4 mt-4 font-bold text-lg tracking-widest uppercase transition-all relative overflow-hidden group ${examType
                        ? 'bg-terminal-green text-terminal-black hover:bg-terminal-green/90 shadow-[0_0_20px_rgba(0,255,0,0.4)]'
                        : 'bg-terminal-dim/20 text-terminal-dim cursor-not-allowed'
                        }`}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        Inizia Test <ChevronRight className={`w-5 h-5 ${examType ? 'group-hover:translate-x-1 transition-transform' : ''}`} />
                    </span>
                    {examType && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
                </button>

                <div className="pt-4 border-t border-terminal-dim/20 flex justify-between items-center">
                    <button
                        onClick={onShowHistory}
                        className="text-xs text-terminal-dim hover:text-terminal-green flex items-center gap-1 transition-colors"
                    >
                        <Trophy className="w-3 h-3" /> STORICO ESAMI
                    </button>
                    <div className="flex items-center gap-1 text-xs text-terminal-dim">
                        <Clock className="w-3 h-3" /> v2.1.0
                    </div>
                </div>

            </div>

            {/* Warning */}
            <div className="flex items-center gap-2 text-xs text-terminal-dim/60 max-w-md text-center">
                <AlertCircle className="w-3 h-3" />
                <span>Il timer non si ferma. Non ricaricare la pagina durante il test.</span>
            </div>
        </div>
    );
}
