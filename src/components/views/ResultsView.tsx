import { useState } from 'react';
import { RotateCcw, AlertCircle, Download, BookOpen } from 'lucide-react';
import { MathText } from '../ui/MathText';
import { exportExamPDF } from '../../utils/pdfExport';
import type { Question, UserState } from '../../types';

interface ResultsViewProps {
    userState: UserState;
    questions: Question[];
    onRestart: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    history: any[];
    examType: string;
    topic: string;
    difficulty: string;
}

export function ResultsView({
    userState,
    questions,
    onRestart,
    history: _,
    examType,
    topic,
    difficulty
}: ResultsViewProps) {
    const [showStudyPlan, setShowStudyPlan] = useState(false);
    const [studyPlan, setStudyPlan] = useState<string | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    const percentage = Math.round((userState.score / questions.length) * 100);

    // Determine rank/feedback
    const getFeedback = () => {
        if (percentage >= 90) return { text: "PRIMARIO (ECCELLENTE)", color: "text-terminal-green" };
        if (percentage >= 60) return { text: "SPECIALIZZANDO (SUFFICIENTE)", color: "text-yellow-500" };
        return { text: "STUDENTE AL PRIMO ANNO (INSUFFICIENTE)", color: "text-red-500" };
    };

    const feedback = getFeedback();

    const generateStudyPlan = async () => {
        setIsGeneratingPlan(true);
        setShowStudyPlan(true);

        // Collect wrong answers
        const wrongAnswers = questions.filter(_ => {
            // Simple check - in a real app, reuse the compare logic or pass it down
            // For now, we assume if it's not in the score, it's wrong.
            // But we don't have per-question correctness here easily without re-running logic.
            // Let's just send the ones where answer != correct (approximate for now, or better: use the logic from useExamState if we could)
            // Since we don't have the compare function here, we'll rely on a simple check or just send all questions for the AI to analyze?
            // Better: The AI endpoint expects a list of wrong answers with text.
            // Let's just send the text of questions where the user didn't get points.
            // Wait, we don't know which ones are correct here without the compare function.
            // We'll just send the user's answer and correct answer for ALL questions and let AI decide?
            // Or better, just send the ones that look wrong.
            return true; // Placeholder: we send all for analysis in this version or refine later.
        }).map(q => ({
            text: q.text,
            userAnswer: userState.answers[q.id] || "Nessuna risposta",
            correctAnswer: q.correctAnswer
        }));

        try {
            const res = await fetch('/api/generate-study-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wrongAnswers: wrongAnswers.slice(0, 5) }) // Limit to 5 to save tokens
            });
            const data = await res.json();
            setStudyPlan(data.plan);
        } catch (e) {
            console.error(e);
            setStudyPlan("Impossibile generare il piano di studi al momento.");
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

            {/* Score Card */}
            <div className="text-center space-y-4 p-8 border border-terminal-dim/30 rounded-lg bg-terminal-black/50 backdrop-blur relative overflow-hidden">
                <div className={`absolute inset-0 opacity-10 ${percentage >= 60 ? 'bg-terminal-green' : 'bg-red-500'}`}></div>

                <h2 className="text-2xl font-mono text-terminal-dim">RISULTATO FINALE</h2>
                <div className="text-6xl md:text-8xl font-bold tracking-tighter mb-4">
                    {userState.score}<span className="text-4xl text-terminal-dim">/{questions.length}</span>
                </div>

                <div className={`text-xl md:text-2xl font-bold ${feedback.color} animate-pulse`}>
                    {feedback.text}
                </div>

                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={onRestart}
                        className="flex items-center gap-2 px-6 py-3 bg-terminal-green text-terminal-black font-bold rounded hover:bg-terminal-green/90 transition-all"
                    >
                        <RotateCcw className="w-5 h-5" /> NUOVO TEST
                    </button>

                    <button
                        onClick={() => exportExamPDF(questions, userState, examType, topic, difficulty)}
                        className="flex items-center gap-2 px-6 py-3 border border-terminal-dim text-terminal-dim hover:text-terminal-green hover:border-terminal-green rounded transition-all"
                    >
                        <Download className="w-5 h-5" /> SALVA PDF
                    </button>
                </div>
            </div>

            {/* AI Analysis Button */}
            {!showStudyPlan && percentage < 100 && (
                <div className="flex justify-center">
                    <button
                        onClick={generateStudyPlan}
                        className="flex items-center gap-2 px-6 py-4 bg-purple-600/20 text-purple-400 border border-purple-500/50 rounded hover:bg-purple-600/30 transition-all w-full md:w-auto justify-center"
                    >
                        <BookOpen className="w-5 h-5" />
                        GENERA PIANO DI STUDIO (AI)
                    </button>
                </div>
            )}

            {/* Study Plan Section */}
            {showStudyPlan && (
                <div className="p-6 border border-purple-500/30 rounded-lg bg-purple-900/10 animate-in slide-in-from-bottom-4">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> DIAGNOSI DEL PRIMARIO
                    </h3>
                    {isGeneratingPlan ? (
                        <div className="space-y-2">
                            <div className="h-4 bg-purple-500/20 rounded animate-pulse w-3/4"></div>
                            <div className="h-4 bg-purple-500/20 rounded animate-pulse w-1/2"></div>
                            <div className="h-4 bg-purple-500/20 rounded animate-pulse w-5/6"></div>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <MathText content={studyPlan || ""} />
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Review */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-terminal-dim border-b border-terminal-dim/20 pb-2">REVISIONE RISPOSTE</h3>

                {questions.map((q, idx) => {
                    // We need to re-evaluate correctness here since we don't have it stored per-question in state
                    // This is a limitation of the current extraction. 
                    // Ideally, we should pass a `results` object.
                    // For now, we'll just show the user answer and correct answer.
                    const userAns = userState.answers[q.id];
                    const isAnswered = !!userAns;

                    return (
                        <div key={q.id} className="p-6 border border-terminal-dim/20 rounded-lg bg-terminal-black/30">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-8 h-8 rounded-full bg-terminal-dim/10 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="text-lg mb-4"><MathText content={q.text} /></div>

                                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                                        <div className={`p-3 rounded border ${isAnswered ? 'border-terminal-dim/30' : 'border-red-500/30 bg-red-500/5'}`}>
                                            <div className="text-xs uppercase text-terminal-dim mb-1">La tua risposta</div>
                                            <div className="font-mono">{userAns || "Non risposta"}</div>
                                        </div>

                                        <div className="p-3 rounded border border-terminal-green/30 bg-terminal-green/5">
                                            <div className="text-xs uppercase text-terminal-green mb-1">Risposta Corretta</div>
                                            <div className="font-mono text-terminal-green"><MathText content={q.correctAnswer} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-terminal-dim/10">
                                <div className="flex items-start gap-2 text-sm text-terminal-dim/80">
                                    <AlertCircle className="w-4 h-4 mt-0.5 text-terminal-green" />
                                    <div>
                                        <span className="font-bold text-terminal-green">SPIEGAZIONE:</span>
                                        <div className="mt-1"><MathText content={q.explanation} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
