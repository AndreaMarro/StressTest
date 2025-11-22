import { ReactNode, useState } from 'react';
import { Shield, Cookie } from 'lucide-react';
import PrivacyPolicy from '../PrivacyPolicy';
import CookiePolicy from '../CookiePolicy';

interface TerminalLayoutProps {
    children: ReactNode;
}

export default function TerminalLayout({ children }: TerminalLayoutProps) {
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showCookies, setShowCookies] = useState(false);

    return (
        <div className="min-h-screen bg-terminal-black text-terminal-text font-mono selection:bg-terminal-green selection:text-terminal-black relative overflow-hidden flex flex-col">
            {/* Grid Background */}
            <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none z-0"></div>

            {/* Scanline Effect */}
            <div className="fixed inset-0 scanline pointer-events-none z-50 opacity-50"></div>

            {/* Vignette */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6))] pointer-events-none z-10"></div>

            {/* Main Content */}
            <div className="relative z-20 flex-1 p-4 md:p-8 flex flex-col max-w-7xl mx-auto w-full">
                {children}
            </div>

            {/* Footer */}
            <footer className="relative z-20 border-t border-terminal-dim/30 p-4 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-terminal-dim">
                    <div>
                        <span className="text-terminal-green font-bold">SYSTEM_STATUS:</span> ONLINE // <span className="animate-pulse">MONITORING_ACTIVE</span>
                    </div>
                    <div className="flex gap-6">
                        <button onClick={() => setShowPrivacy(true)} className="hover:text-terminal-green transition-colors flex items-center gap-1">
                            <Shield size={12} /> PRIVACY_PROTOCOL
                        </button>
                        <button onClick={() => setShowCookies(true)} className="hover:text-terminal-green transition-colors flex items-center gap-1">
                            <Cookie size={12} /> COOKIE_DATA
                        </button>
                        <span>© 2025 DM418 // SEMESTRE_FILTRO</span>
                    </div>
                </div>
            </footer>

            {/* Modals */}
            {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
            {showCookies && <CookiePolicy onClose={() => setShowCookies(false)} />}
        </div>
    );
}
