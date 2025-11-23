import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NeoCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    active?: boolean;
}

export const NeoCard = ({ children, className, onClick, active = false }: NeoCardProps) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-white border-2 border-black rounded-xl p-4 md:p-6 transition-all duration-200",
            onClick && "cursor-pointer hover:-translate-y-1 hover:translate-x-1",
            active ? "shadow-none translate-x-[4px] translate-y-[4px] bg-indigo-50" : "shadow-neo",
            className
        )}
    >
        {children}
    </div>
);
