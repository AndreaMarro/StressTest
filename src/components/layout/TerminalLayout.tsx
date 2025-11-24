import { useState } from 'react';
import type { ReactNode } from 'react';
import { Shield, Cookie, Sun, Moon } from 'lucide-react';
import PrivacyPolicy from '../PrivacyPolicy';
import CookiePolicy from '../CookiePolicy';

interface TerminalLayoutProps {
    children: ReactNode;
}

export default function TerminalLayout({ children }: TerminalLayoutProps) {
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showCookies, setShowCookies] = useState(false);

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        // Check system preference or saved theme on init
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
            if (savedTheme) {
                document.documentElement.classList.toggle('dark', savedTheme === 'dark');
                return savedTheme;
            }
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
                return 'dark';
            }
        }
        return 'dark'; // Default
    });

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    return (
        <div className="min-h-[100dvh] bg-terminal-black text-terminal-text font-mono selection:bg-terminal-green selection:text-terminal-black relative overflow-hidden flex flex-col transition-colors duration-300 pt-safe">
            {/* Grid Background */}
            <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none z-0"></div>

            {/* Scanline Effect (Only in Dark Mode) */}
            <div className="fixed inset-0 scanline pointer-events-none z-50 opacity-50 hidden dark:block"></div>

            {/* Vignette */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6))] pointer-events-none z-10"></div>

            {/* Theme Toggle (Absolute Top Right) */}
            <button
                onClick={toggleTheme}
                className="fixed top-4 right-4 z-50 p-2 rounded-full border border-terminal-dim text-terminal-dim hover:text-terminal-green hover:border-terminal-green transition-all bg-terminal-black/80 backdrop-blur-sm"
                aria-label="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Main Content */}
            <div className="relative z-20 flex-1 p-4 md:p-8 flex flex-col max-w-7xl mx-auto w-full">
                {children}
            </div>

            {/* Footer */}
            <footer className="relative z-20 border-t border-terminal-dim/30 p-4 pb-24 md:pb-4 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-terminal-dim">
                    <div>
                        <span className="text-terminal-green font-bold">SYSTEM_STATUS:</span> ONLINE // <span className="animate-pulse">MONITORING_ACTIVE</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-2 md:mt-0">
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

            {/* Watermark - Hidden on mobile to prevent overlap with dock */}
            <div className="hidden md:block fixed bottom-1 right-1 text-[10px] text-terminal-dim/20 font-mono pointer-events-none z-[100] select-none">
                ANDREA_MARRO
            </div>
        </div>
    );
}
