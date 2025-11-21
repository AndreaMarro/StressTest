import type { Question } from '../types';

export class DeepSeekService {
    // No longer needs API key in constructor
    constructor() { }

    async generateExam(topic: string, difficulty: string): Promise<Question[]> {
        try {
            const response = await fetch('/api/generate-exam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic, difficulty })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server Error: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.questions) throw new Error("Invalid response format");

            return data.questions.map((q: any, index: number) => ({
                ...q,
                id: index + 1,
                options: q.type === 'multiple_choice' ? q.options : undefined
            }));

        } catch (error) {
            console.error("Generation failed:", error);
            throw error;
        }
    }

    async generateStudyPlan(wrongAnswers: Question[]): Promise<string> {
        try {
            const response = await fetch('/api/generate-study-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ wrongAnswers })
            });

            const data = await response.json();
            return data.plan || "Impossibile generare il piano di studio.";
        } catch (error) {
            return "Impossibile generare il piano di studio al momento.";
        }
    }
}
