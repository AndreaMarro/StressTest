import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'dark' | 'danger' | 'info';
}

export const NeoButton = ({
    children,
    className,
    variant = 'primary',
    disabled,
    ...props
}: NeoButtonProps) => {
    const variants = {
        primary: "bg-neo-lime text-black hover:bg-[#84cc16]",
        secondary: "bg-white text-black hover:bg-gray-50",
        dark: "bg-black text-white hover:bg-gray-900",
        danger: "bg-neo-red text-black hover:bg-[#ef4444]",
        info: "bg-neo-blue text-black hover:bg-[#3b82f6]"
    };

    return (
        <button
            disabled={disabled}
            className={cn(
                "px-6 py-3 font-bold border-2 border-black rounded-lg shadow-neo transition-all",
                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0",
                "flex items-center justify-center gap-2",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
