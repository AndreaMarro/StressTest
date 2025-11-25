import React, { useState } from 'react';
import { X, User, Lock, LogIn, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
    onLoginSuccess: (userId: string, nickname: string) => void;
}

export function AuthModal({ isOpen, onClose, currentUserId, onLoginSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>('register');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const payload = mode === 'register'
            ? { nickname, password, currentUserId }
            : { nickname, password };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Errore durante l\'autenticazione');
            }

            onLoginSuccess(data.userId, data.nickname);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-terminal-black border border-terminal-green/30 w-full max-w-md p-6 rounded-lg shadow-2xl relative"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-terminal-dim hover:text-terminal-green transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-terminal-green mb-2 flex items-center gap-2">
                            {mode === 'register' ? <Save className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                            {mode === 'register' ? 'SALVA PROGRESSI' : 'RECUPERA ACCOUNT'}
                        </h2>

                        <p className="text-terminal-dim mb-6 text-sm">
                            {mode === 'register'
                                ? "Crea un account per salvare i tuoi acquisti e la tua storia. Potrai recuperarli su qualsiasi dispositivo."
                                : "Accedi per ripristinare i tuoi acquisti e la tua storia su questo dispositivo."}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-mono text-terminal-dim mb-1">NICKNAME</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full bg-black/50 border border-terminal-dim/30 rounded p-2 pl-10 text-terminal-green focus:border-terminal-green focus:outline-none font-mono"
                                        placeholder="Il tuo nickname"
                                        required
                                        minLength={3}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-mono text-terminal-dim mb-1">PASSWORD</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-black/50 border border-terminal-dim/30 rounded p-2 pl-10 text-terminal-green focus:border-terminal-green focus:outline-none font-mono"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-terminal-green text-terminal-black font-bold py-3 rounded hover:bg-terminal-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {loading ? 'ELABORAZIONE...' : (mode === 'register' ? 'CREA ACCOUNT' : 'ACCEDI')}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-terminal-dim">
                            {mode === 'register' ? (
                                <>
                                    Hai già un account?{' '}
                                    <button
                                        onClick={() => setMode('login')}
                                        className="text-terminal-green hover:underline font-bold"
                                    >
                                        ACCEDI
                                    </button>
                                </>
                            ) : (
                                <>
                                    Non hai un account?{' '}
                                    <button
                                        onClick={() => setMode('register')}
                                        className="text-terminal-green hover:underline font-bold"
                                    >
                                        REGISTRATI
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
