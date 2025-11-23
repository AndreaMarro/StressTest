import React from 'react';
import { NeoCard } from './ui/NeoCard';
import { X, Calendar, Target, Activity } from 'lucide-react';

interface HistoryItem {
    id: string;
    date: string;
    score: number;
    totalQuestions: number;
    difficulty: string;
    topic: string;
}

interface HistoryViewProps {
    history: HistoryItem[];
    onClose: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onClose }) => {
    const averageScore = history.length > 0
        ? Math.round(history.reduce((acc, item) => acc + item.score, 0) / history.length)
        : 0;

    const bestScore = history.length > 0
        ? Math.max(...history.map(item => item.score))
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <NeoCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-terminal-dim hover:text-terminal-red transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-black uppercase text-terminal-green mb-2 glitch-text">
                        STORICO SIMULAZIONI
                    </h2>
                    <p className="text-terminal-dim font-mono text-sm">
                        &gt; ANALISI PRESTAZIONI UTENTE
                    </p>
                </div>

                {history.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-terminal-dim rounded-lg">
                        <Activity className="mx-auto text-terminal-dim mb-4" size={48} />
                        <p className="text-terminal-dim font-mono">NESSUN DATO REGISTRATO.</p>
                        <p className="text-xs text-terminal-dim mt-2">Completa una simulazione per vedere i tuoi progressi.</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-terminal-black border border-terminal-dim p-4 rounded text-center">
                                <div className="text-terminal-dim text-xs uppercase mb-1">Simulazioni</div>
                                <div className="text-3xl font-black text-white">{history.length}</div>
                            </div>
                            <div className="bg-terminal-black border border-terminal-dim p-4 rounded text-center">
                                <div className="text-terminal-dim text-xs uppercase mb-1">Media Punteggio</div>
                                <div className={`text-3xl font-black ${averageScore >= 18 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                                    {averageScore}
                                </div>
                            </div>
                            <div className="bg-terminal-black border border-terminal-dim p-4 rounded text-center">
                                <div className="text-terminal-dim text-xs uppercase mb-1">Best Score</div>
                                <div className="text-3xl font-black text-terminal-accent">{bestScore}</div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-3">
                            {history.map((item) => (
                                <div key={item.id} className="border border-terminal-dim p-4 hover:border-terminal-green transition-colors bg-terminal-black/50">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-terminal-green font-bold text-lg">{item.topic}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded border ${item.difficulty === 'hard' ? 'border-terminal-red text-terminal-red' :
                                                    item.difficulty === 'medium' ? 'border-terminal-accent text-terminal-accent' :
                                                        'border-terminal-green text-terminal-green'
                                                    } uppercase`}>
                                                    {item.difficulty}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-terminal-dim font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Target size={12} />
                                                    {item.totalQuestions} Domande
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                            <div className="text-right">
                                                <div className="text-[10px] text-terminal-dim uppercase">Punteggio</div>
                                                <div className={`text-2xl font-black ${item.score >= 18 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                                                    {item.score.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </NeoCard>
        </div>
    );
};
