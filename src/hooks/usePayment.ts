import { useState } from 'react';

export function usePayment() {
    const [showPayment, setShowPayment] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const pollForWebhookCompletion = async (paymentIntentId: string) => {
        const maxAttempts = 15; // 15 seconds

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                console.log(`[Payment] Poll attempt ${attempt + 1}/${maxAttempts}...`);

                const res = await fetch(`/api/poll-payment-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentIntentId })
                });

                const data = await res.json();

                if (data.ready && data.sessionToken && data.examId) {
                    console.log('[Payment] ✅ Webhook completed!');
                    return data;
                }

                // Wait 1 second before next attempt
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.error('[Payment] Poll error:', e);
            }
        }

        // Timeout
        console.error('[Payment] ❌ Webhook timeout');
        setErrorMsg('Pagamento in elaborazione. Ricarica la pagina tra 10 secondi.');
        return null;
    };

    return {
        showPayment,
        setShowPayment,
        errorMsg,
        setErrorMsg,
        pollForWebhookCompletion
    };
}
