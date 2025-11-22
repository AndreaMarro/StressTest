import { X } from 'lucide-react';

interface Props {
    onClose: () => void;
}

export default function CookiePolicy({ onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 bg-terminal-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-3xl h-[80vh] terminal-box flex flex-col relative border-terminal-green shadow-[0_0_30px_rgba(0,255,0,0.2)]">

                <div className="flex justify-between items-center border-b border-terminal-green/50 pb-4 mb-4">
                    <h2 className="text-2xl font-bold tracking-widest text-terminal-green">COOKIE_PROTOCOL_V.1.0</h2>
                    <button onClick={onClose} className="text-terminal-dim hover:text-terminal-green transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar text-sm font-mono text-terminal-text">
                    <p className="text-terminal-dim">
                        &gt; SCANNING FOR COOKIES...<br />
                        &gt; RESULT: MINIMAL TRACES DETECTED.
                    </p>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">1. Cosa sono i Cookie?</h3>
                        <p>
                            Sono piccoli file di testo che i siti salvano sul tuo computer.
                            Non sono biscotti veri. Ci dispiace.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">2. Cookie Tecnici (Essenziali)</h3>
                        <p>
                            Usiamo solo cookie tecnici strettamente necessari per il funzionamento del "Semestre Filtro":
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2 text-terminal-dim">
                            <li><strong>Stripe</strong>: Per gestire i pagamenti in sicurezza. Senza questi, niente esame.</li>
                            <li><strong>LocalStorage</strong>: Salviamo lo stato del tuo esame nel tuo browser per evitare che tu perda tutto se ricarichi la pagina (siamo sadici, ma non così tanto).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">3. Cookie di Terze Parti</h3>
                        <p>
                            Non usiamo Google Analytics, Facebook Pixel o altre spie.
                            Ci interessa solo la tua performance in fisica, non i tuoi acquisti su Amazon.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-terminal-green font-bold mb-2 uppercase">4. Gestione dei Cookie</h3>
                        <p>
                            Puoi disabilitare i cookie dal tuo browser, ma il sito smetterà di funzionare e non potrai prepararti per il test.
                            A tuo rischio e pericolo.
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
