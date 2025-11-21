import React, { useState, useEffect } from 'react';
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
    onSuccess: () => void;
}

const CheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is not strictly needed for redirect: 'if_required' but good practice
                return_url: window.location.origin,
            },
            redirect: 'if_required',
        });

        if (error) {
            setMessage(error.message || "Qualcosa è andato storto.");
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess();
        } else {
            setMessage("Stato del pagamento imprevisto.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    <><Lock size={18} /> PAGA €0.49</>
                )}
            </NeoButton>

            <p className="text-xs text-center text-gray-500 font-medium flex items-center justify-center gap-1">
                <Lock size={12} /> Pagamento sicuro SSL a 256-bit
            </p>
        </form>
    );
};

export const PaymentModal = ({ isOpen, onClose, onSuccess }: PaymentModalProps) => {
    const [clientSecret, setClientSecret] = useState("");

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <NeoCard className="w-full max-w-md relative animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
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
                    <span className="block text-4xl font-black text-black">€0.49</span>
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
            </NeoCard>
        </div>
    );
};
