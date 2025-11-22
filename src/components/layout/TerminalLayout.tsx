import React from 'react';

interface TerminalLayoutProps {
    children: React.ReactNode;
}

const TerminalLayout: React.FC<TerminalLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-terminal-black text-terminal-text font-mono relative overflow-hidden selection:bg-terminal-green selection:text-terminal-black">
            {/* Grid Background Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-20"></div>

            {/* CRT Scanline Effect */}
            <div className="scanline"></div>

            {/* Vignette Effect */}
            <div className="fixed inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]"></div>

            {/* Main Content Container */}
            <div className="relative z-20 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header / Top Bar */}
                <header className="flex justify-between items-center mb-12 border-b border-terminal-dim pb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-terminal-red rounded-full animate-pulse"></div>
                        <h1 className="text-xl font-bold tracking-widest uppercase">
                            STRESSTEST<span className="text-terminal-green">_OS</span> v2.0
                        </h1>
                    </div>
                    <div className="text-xs text-terminal-dim">
                        SYS.STATUS: <span className="text-terminal-green">ONLINE</span>
                    </div>
                </header>

                <main>
                    {children}
                </main>

                {/* Footer */}
                <footer className="mt-16 text-center text-xs text-terminal-dim border-t border-terminal-dim pt-8">
                    <p>COPYRIGHT (C) 2025 DM418 CORP. ALL RIGHTS RESERVED.</p>
                    <p className="mt-2">UNAUTHORIZED ACCESS WILL BE LOGGED.</p>
                </footer>
            </div>
        </div>
    );
};

export default TerminalLayout;
