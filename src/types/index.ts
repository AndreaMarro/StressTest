import type { ReactNode } from 'react';

export type QuestionType = 'multiple_choice' | 'fill_in_the_blank';

export interface Question {
    id: number;
    text: string;
    type: QuestionType;
    options?: string[]; // For MC
    correctAnswer: string;
    explanation: string;
    topic?: string;
}

export interface UserState {
    answers: Record<number, string>;
    flagged: Record<number, boolean>;
    currentQuestionIndex: number;
    timeRemaining: number;
    isExamActive: boolean;
    isExamFinished: boolean;
    score: number;
    isComplete?: boolean;
}

export interface Topic {
    id: string;
    name: string;
    icon: ReactNode;
}
