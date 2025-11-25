import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, AlertCircle } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoCard } from './NeoCard';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (paymentIntent?: any) => void;
    examType?: 'full' | 'topic' | null;
    topic?: string;
    difficulty?: string;
    excludeIds?: string[];
}

const CheckoutForm = ({ onSuccess }: { onSuccess: (paymentIntent?: any) => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);
        setMessage(null);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin,
                    payment_method_data: {
                        billing_details: {
                            email: email || undefined,
                        },
                    },
                    receipt_email: email || undefined,
                },
                redirect: 'if_required',
            });

            if (error) {
                setMessage(error.message || "Qualcosa è andato storto.");
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess(paymentIntent);
            } else {
                setMessage(`Stato del pagamento imprevisto: ${paymentIntent?.status}`);
            }
        } catch (err) {
            console.error("Payment error:", err);
            setMessage("Errore tecnico durante il pagamento. Riprova.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Email per ricevuta (opzionale)</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full p-2 border border-gray-300 rounded focus:border-black outline-none transition-colors"
                />
            </div>

            <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />

            {message && (
                <div className="p-3 bg-red-100 border-2 border-red-500 rounded text-red-700 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> {message}
                </div>
            )}

            <NeoButton
                type="submit"
                className="w-full"
                disabled={isLoading || !stripe || !elements}
            >
                {isLoading ? (
                    <span className="animate-pulse">ELABORAZIONE...</span>
                ) : (
                    <><Lock size={18} /> PAGA €0.50</>
                )}
            </NeoButton>

            <p className="text-xs text-center text-gray-500 font-medium flex items-center justify-center gap-1">
                <Lock size={12} /> Pagamento sicuro SSL a 256-bit
            </p>
        </form>
    );
};

export const PaymentModal = ({ isOpen, onClose, onSuccess, examType, topic, difficulty, excludeIds = [] }: PaymentModalProps) => {
    const [clientSecret, setClientSecret] = useState("");
    const [showPromo, setShowPromo] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [promoError, setPromoError] = useState<string | null>(null);
    const [isPromoLoading, setIsPromoLoading] = useState(false);

    const handlePromoRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoCode.trim()) return;
        setIsPromoLoading(true);
        setPromoError(null);

        try {
            const res = await fetch('/api/redeem-promo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: promoCode.trim(),
                    examType,
                    topic,
                    difficulty,
                    excludeIds
                })
            });
            const data = await res.json();

            if (data.success) {
                // Save session info
                if (data.sessionToken) localStorage.setItem('sessionToken', data.sessionToken);
                if (data.expiresAt) localStorage.setItem('accessExpiresAt', data.expiresAt);
                if (data.examId) localStorage.setItem('currentExamId', data.examId);

                onSuccess();
            } else {
                setPromoError(data.error || "Codice non valido");
            }
        } catch (err) {
            setPromoError("Errore di connessione");
        } finally {
            setIsPromoLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Create PaymentIntent as soon as the modal opens
            fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            })
                .then((res) => res.json())
                .then((data) => setClientSecret(data.clientSecret))
                .catch((err) => console.error("Error fetching payment intent:", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Portal to body to avoid z-index/stacking context issues */}
            {typeof document !== 'undefined' && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
                    <NeoCard className="w-full max-w-md relative animate-in fade-in zoom-in duration-300 max-h-[90dvh] overflow-y-auto pb-safe bg-white shadow-2xl my-auto">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-black uppercase">Sblocca Simulazione</h2>
                            <p className="text-gray-600 font-medium mt-2">Accesso completo al test generato dall'IA.</p>
                        </div>

                        <div className="bg-neo-bg p-4 rounded-lg border-2 border-black mb-6 text-center">
                            <span className="block text-sm font-bold text-gray-500 uppercase">Totale da pagare</span>
                            <span className="block text-4xl font-black text-black">€0.50</span>
                        </div>

                        {clientSecret ? (
                            <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
                                <CheckoutForm onSuccess={onSuccess} />
                            </Elements>
                        ) : (
                            <div className="py-12 text-center">
                                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
                                <p className="mt-4 font-bold text-gray-500">Caricamento Stripe...</p>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                            {!showPromo ? (
                                <button
                                    onClick={() => setShowPromo(true)}
                                    className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider transition-colors"
                                >
                                    Hai un codice promo?
                                </button>
                            ) : (
                                <form onSubmit={handlePromoRedeem} className="animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            placeholder="CODICE PROMO"
                                            className="flex-1 p-2 border-2 border-black rounded font-mono text-base uppercase outline-none focus:bg-gray-50"
                                            disabled={isPromoLoading}
                                        />
                                        <NeoButton
                                            type="submit"
                                            disabled={isPromoLoading || !promoCode}
                                            className="px-4 py-2 text-xs"
                                        >
                                            {isPromoLoading ? '...' : 'APPLICA'}
                                        </NeoButton>
                                    </div>
                                    {promoError && (
                                        <p className="text-xs text-red-600 font-bold mt-2 text-left flex items-center gap-1">
                                            <AlertCircle size={12} /> {promoError}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                    </NeoCard>
                </div>,
                document.body
            )}
        </>
    );
};
