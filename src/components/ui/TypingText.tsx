import React, { useState, useEffect } from 'react';

interface TypingTextProps {
    text: string;
    speed?: number;
    className?: string;
    animate?: boolean;
    onComplete?: () => void;
}

const TypingText: React.FC<TypingTextProps> = ({ text, speed = 30, className = '', animate = true, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, speed, onComplete]);

    return (
        <span className={`${className} border-r-2 border-terminal-green ${animate ? 'animate-blink' : ''}`}>
            {displayedText}
        </span>
    );
};

export default TypingText;
