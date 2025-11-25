import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, X, Send } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoCard } from './NeoCard';

interface BugReportButtonProps {
    questionIndex: number;
    examId: string | null;
}

export const BugReportButton: React.FC<BugReportButtonProps> = ({ questionIndex, examId }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [issueType, setIssueType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);

    const issueTypes = [
        'Errore matematico',
        'LaTeX non renderizzato',
        'Risposta ambigua',
        'Sarcasmo offensivo',
        'Altro'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!issueType) {
            setSubmitMessage('Seleziona un tipo di problema.');
            return;
        }

        setIsSubmitting(true);
        setSubmitMessage(null);

        try {
            const response = await fetch('/api/report-bug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: examId || 'unknown',
                    questionIndex,
                    issueType,
                    description: description.trim() || null,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubmitMessage(data.message || '✅ Segnalazione ricevuta. Se hai ragione, correggerò. Se ti sbagli, peggio per te.');
                setTimeout(() => {
                    setIsModalOpen(false);
                    setIssueType('');
                    setDescription('');
                    setSubmitMessage(null);
                }, 3000);
            } else {
                setSubmitMessage(data.error || 'Errore nell\'invio. Riprova.');
            }
        } catch (err) {
            console.error('Bug report error:', err);
            setSubmitMessage('Errore di connessione. Riprova più tardi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-yellow-400 hover:bg-yellow-500 text-black p-4 rounded-full shadow-2xl border-4 border-black transition-all hover:scale-110 active:scale-95 animate-bounce"
                style={{ animationDuration: '3s' }}
                title="Segnala errore in questa domanda"
            >
                <AlertTriangle size={24} className="animate-pulse" />
            </button>

            {/* Modal */}
            {isModalOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <NeoCard className="w-full max-w-md relative animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                                <AlertTriangle className="text-yellow-500" />
                                Segnala Bug
                            </h2>
                            <p className="text-gray-600 font-medium mt-2">
                                Domanda #{questionIndex + 1}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Tipo di problema *
                                </label>
                                <select
                                    value={issueType}
                                    onChange={(e) => setIssueType(e.target.value)}
                                    className="w-full p-3 border-2 border-black rounded-lg font-bold bg-white focus:bg-gray-50 outline-none transition-colors"
                                    required
                                >
                                    <option value="">-- Seleziona --</option>
                                    {issueTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Descrizione (opzionale)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Es: La formula di Hooke ha il segno sbagliato..."
                                    className="w-full p-3 border-2 border-black rounded-lg font-mono text-sm resize-none focus:bg-gray-50 outline-none transition-colors"
                                    rows={4}
                                    maxLength={500}
                                />
                                <p className="text-xs text-gray-400 mt-1">{description.length}/500 caratteri</p>
                            </div>

                            {submitMessage && (
                                <div className={`p-3 rounded-lg border-2 font-bold text-sm ${submitMessage.startsWith('✅')
                                        ? 'bg-green-100 border-green-500 text-green-700'
                                        : 'bg-red-100 border-red-500 text-red-700'
                                    }`}>
                                    {submitMessage}
                                </div>
                            )}

                            <NeoButton
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting || !issueType}
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">INVIO IN CORSO...</span>
                                ) : (
                                    <>
                                        <Send size={18} /> INVIA SEGNALAZIONE
                                    </>
                                )}
                            </NeoButton>
                        </form>

                        <div className="mt-4 p-3 bg-gray-100 rounded border-2 border-black text-xs font-mono text-gray-600">
                            <strong>Il Primario:</strong> "Segnalazione ricevuta. Se hai ragione, correggerò. Se ti sbagli, peggio per te."
                        </div>
                    </NeoCard>
                </div>,
                document.body
            )}
        </>
    );
};
