import { X } from 'lucide-react';

interface Props {
    onClose: () => void;
}

export default function PrivacyPolicy({ onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 bg-terminal-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-3xl h-[80vh] terminal-box flex flex-col relative border-terminal-green shadow-[0_0_30px_rgba(0,255,0,0.2)]">

                <div className="flex justify-between items-center border-b border-terminal-green/50 pb-4 mb-4">
                    <h2 className="text-2xl font-bold tracking-widest text-terminal-green">PRIVACY_PROTOCOL_V.1.0</h2>
                    <button onClick={onClose} className="text-terminal-dim hover:text-terminal-green transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar text-sm font-mono text-terminal-text">
                    <p className="text-terminal-dim">
                        &gt; INITIATING GDPR COMPLIANCE SUBROUTINE...<br />
                        &gt; STATUS: COMPLIANT (BUT SARCASTIC)
                    </p>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">1. Titolare del Trattamento</h3>
                        <p>
                            Il Titolare del trattamento è "Semestre Filtro" (di seguito "Il Sistema").
                            Contatto per bug e lamentele: <a href="mailto:ermagician@gmail.com" className="text-terminal-green underline">ermagician@gmail.com</a>.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">2. Dati Raccolti</h3>
                        <p>
                            Raccogliamo solo i dati necessari per farti soffrire (didatticamente parlando):
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 text-terminal-dim">
                            <li>Indirizzo IP (per la sicurezza e per bannarti se bari).</li>
                            <li>Dati di pagamento (gestiti interamente da Stripe, noi non vediamo la tua carta).</li>
                            <li>Risposte ai quiz (per generare piani di studio che ti insultano).</li>
                            <li>Messaggi nel "Panic Room" (sono pubblici, non scrivere segreti di stato).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">3. Finalità del Trattamento</h3>
                        <p>
                            I tuoi dati servono a:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 text-terminal-dim">
                            <li>Fornirti il servizio (simulazione esame).</li>
                            <li>Processare i pagamenti (€0.50 per soffrire).</li>
                            <li>Migliorare l'algoritmo sadico dell'AI.</li>
                            <li>Obblighi di legge (purtroppo).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">4. Conservazione dei Dati</h3>
                        <p>
                            I dati della sessione (esame in corso) vengono salvati nel `localStorage` del tuo browser per 45 minuti.
                            I post del forum sono salvati sul server finché non decidiamo di resettare tutto.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">5. I Tuoi Diritti</h3>
                        <p>
                            Hai il diritto di chiedere l'accesso, la rettifica o la cancellazione dei tuoi dati.
                            Ma ricorda: "Verba volant, scripta manent" (soprattutto nel database).
                            Per esercitare i diritti, scrivi a <a href="mailto:ermagician@gmail.com" className="text-terminal-green underline">ermagician@gmail.com</a>.
                        </p>
                    </section>

                    <p className="text-xs text-terminal-dim mt-8 border-t border-terminal-dim/30 pt-4">
                        Ultimo aggiornamento: {new Date().toLocaleDateString()} // SYSTEM_TIME
                    </p>
                </div>
            </div>
        </div>
    );
}
