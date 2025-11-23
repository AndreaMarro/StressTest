import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Question, UserState } from '../types';

// Convert LaTeX to readable Unicode/text
const convertLatexToReadable = (text: string): string => {
    let result = text;

    // Greek letters
    const greekMap: Record<string, string> = {
        '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
        '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
        '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ',
        '\\phi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Omega': 'Ω'
    };

    // Math symbols
    const symbolMap: Record<string, string> = {
        '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
        '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
        '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
        '\\sqrt': '√', '\\int': '∫', '\\sum': 'Σ', '\\prod': 'Π',
        '\\deg': '°', '\\circ': '°'
    };

    // Replace Greek letters
    for (const [latex, unicode] of Object.entries(greekMap)) {
        result = result.replace(new RegExp(latex, 'g'), unicode);
    }

    // Replace math symbols
    for (const [latex, unicode] of Object.entries(symbolMap)) {
        result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
    }

    // Handle fractions: \frac{a}{b} → (a/b)
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

    // Handle sqrt: \sqrt{x} → √(x)
    result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

    // Handle superscripts: ^{2} → ²
    const superscriptMap: Record<string, string> = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '-': '⁻', '+': '⁺'
    };
    result = result.replace(/\^\{([^}]+)\}/g, (_, exp) => {
        return exp.split('').map((c: string) => superscriptMap[c] || c).join('');
    });
    result = result.replace(/\^(\w)/g, (_, exp) => superscriptMap[exp] || `^${exp}`);

    // Handle subscripts: _{1} → ₁
    const subscriptMap: Record<string, string> = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
    };
    result = result.replace(/_\{([^}]+)\}/g, (_, sub) => {
        return sub.split('').map((c: string) => subscriptMap[c] || c).join('');
    });
    result = result.replace(/_(\w)/g, (_, sub) => subscriptMap[sub] || `_${sub}`);

    // Handle \text{...}
    result = result.replace(/\\text\{([^}]+)\}/g, '$1');

    // Remove remaining LaTeX commands
    result = result.replace(/\\[a-zA-Z]+/g, '');

    // Remove dollar signs and braces
    result = result.replace(/\$/g, '');
    result = result.replace(/[{}]/g, '');

    // Clean up spaces
    result = result.replace(/\s+/g, ' ').trim();

    return result;
};

export const exportExamPDF = (
    questions: Question[],
    userState: UserState,
    examType: string,
    topic: string,
    difficulty: string
) => {
    try {
        console.log('[PDF Export] Starting professional PDF generation...');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        let yPos = 20;

        // === HEADER ===
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("StressTest FISICA", pageWidth / 2, yPos, { align: 'center' });

        yPos += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text("Report Risultati Esame - DM418/2025", pageWidth / 2, yPos, { align: 'center' });

        yPos += 10;
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // === EXAM INFO ===
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const infoStartY = yPos;

        doc.setFont('helvetica', 'bold');
        doc.text("Data:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('it-IT', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }), margin + 30, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text("Tipo Esame:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(examType === 'full' ? 'Simulazione Completa (31 domande)' : 'Focus Argomento', margin + 30, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text("Argomento:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(topic, margin + 30, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text("Difficoltà:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        const difficultyText = difficulty === 'easy' ? 'L1 - BASIC' :
            difficulty === 'medium' ? 'L2 - STANDARD' :
                'L3 - NIGHTMARE';
        doc.text(difficultyText, margin + 30, yPos);

        // === SCORE BOX ===
        const scoreBoxX = pageWidth - margin - 50;
        const scoreBoxY = infoStartY - 2;
        const scoreBoxW = 45;
        const scoreBoxH = 22;

        const percentage = Math.round((userState.score / questions.length) * 100);
        const passed = percentage >= 60;

        doc.setFillColor(passed ? 220 : 255, passed ? 250 : 240, passed ? 220 : 240);
        doc.setDrawColor(passed ? 0 : 220, passed ? 128 : 20, passed ? 0 : 60);
        doc.setLineWidth(1);
        doc.rect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 'FD');

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(passed ? 0 : 220, passed ? 128 : 20, passed ? 0 : 60);
        doc.text(`${percentage}%`, scoreBoxX + scoreBoxW / 2, scoreBoxY + 10, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${userState.score}/${questions.length}`, scoreBoxX + scoreBoxW / 2, scoreBoxY + 16, { align: 'center' });
        doc.text(passed ? 'PASSED' : 'FAILED', scoreBoxX + scoreBoxW / 2, scoreBoxY + 20, { align: 'center' });

        yPos += 12;
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // === SUMMARY TABLE ===
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Riepilogo Risposte", margin, yPos);
        yPos += 5;

        const summaryData = questions.map((q, idx) => {
            const userAns = userState.answers[q.id];
            const isCorrect = userAns && compareAnswer(userAns, q.correctAnswer, q.type);

            return [
                `#${idx + 1}`,
                convertLatexToReadable(q.text).substring(0, 55) + '...',
                userAns ? convertLatexToReadable(userAns) : '(non risposto)',
                convertLatexToReadable(q.correctAnswer),
                isCorrect ? '✓' : '✗'
            ];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['N°', 'Domanda', 'Tua Risposta', 'Risposta Corretta', '✓']],
            body: summaryData,
            theme: 'striped',
            headStyles: {
                fillColor: [40, 40, 40],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 70 },
                2: { cellWidth: 35, halign: 'center' },
                3: { cellWidth: 35, halign: 'center' },
                4: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    data.cell.styles.textColor = data.cell.raw === '✓' ? [0, 128, 0] : [220, 20, 60];
                    data.cell.styles.fontSize = 11;
                }
            }
        });

        // === DETAILED QUESTIONS (new page) ===
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Dettaglio Domande e Spiegazioni", margin, yPos);
        yPos += 10;

        questions.forEach((q, idx) => {
            const userAns = userState.answers[q.id];
            const isCorrect = userAns && compareAnswer(userAns, q.correctAnswer, q.type);

            // Check if we need a new page
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            // Question number and status
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`Domanda ${idx + 1}`, margin, yPos);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(isCorrect ? 0 : 220, isCorrect ? 128 : 20, isCorrect ? 0 : 60);
            doc.text(isCorrect ? '✓ CORRETTA' : '✗ ERRATA', pageWidth - margin, yPos, { align: 'right' });
            yPos += 6;

            // Question text
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            const questionText = convertLatexToReadable(q.text);
            const questionLines = doc.splitTextToSize(questionText, pageWidth - 2 * margin);
            doc.text(questionLines, margin, yPos);
            yPos += questionLines.length * 5;

            // Options for multiple choice
            if (q.type === 'multiple_choice' && q.options) {
                yPos += 2;
                doc.setFontSize(8);
                q.options.forEach((opt) => {
                    const optText = convertLatexToReadable(opt);
                    const optLines = doc.splitTextToSize(optText, pageWidth - 2 * margin - 10);
                    doc.text(optLines, margin + 5, yPos);
                    yPos += optLines.length * 4;
                });
            }

            yPos += 2;

            // User answer vs correct
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text("Tua risposta:", margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(isCorrect ? 0 : 220, isCorrect ? 100 : 20, isCorrect ? 0 : 60);
            doc.text(userAns ? convertLatexToReadable(userAns) : '(non risposto)', margin + 25, yPos);
            yPos += 4;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text("Risposta corretta:", margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 128, 0);
            doc.text(convertLatexToReadable(q.correctAnswer), margin + 35, yPos);
            yPos += 6;

            // Explanation
            if (q.explanation) {
                doc.setFillColor(245, 245, 245);
                const explText = convertLatexToReadable(q.explanation);
                const explLines = doc.splitTextToSize(explText, pageWidth - 2 * margin - 4);
                const explHeight = explLines.length * 4 + 4;

                if (yPos + explHeight > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.rect(margin, yPos - 2, pageWidth - 2 * margin, explHeight, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
                doc.text(explLines, margin + 2, yPos + 2);
                yPos += explHeight + 2;
            }

            yPos += 4;

            // Separator
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 8;
        });

        // === FOOTER ON ALL PAGES ===
        const totalPages = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Pagina ${i}/${totalPages} - Generato da StressTest FISICA (DM418/2025)`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        const filename = `stresstest_${examType}_${new Date().toISOString().slice(0, 10)}.pdf`;
        console.log('[PDF Export] Saving professional PDF:', filename);
        doc.save(filename);

        console.log('[PDF Export] ✓ PDF professionale generato con successo');
        return true;

    } catch (error) {
        console.error('[PDF Export] Error:', error);
        alert('⚠️ Errore durante la generazione del PDF. Riprova o contatta il supporto.');
        return false;
    }
};

// Helper to compare answers (copied from App.tsx logic)
const compareAnswer = (user: string, correct: string, type: string): boolean => {
    if (!user) return false;

    if (type === 'multiple_choice') {
        const userTrim = user.trim();
        const correctTrim = correct.trim();
        return userTrim === correctTrim ||
            (userTrim.length > 0 && correctTrim.length > 0 && userTrim.charAt(0) === correctTrim.charAt(0));
    } else {
        const cleanUser = user.toLowerCase().replace(/\s+/g, '').replace(',', '.');
        const cleanCorrect = correct.toLowerCase().replace(/\s+/g, '').replace(',', '.');

        if (cleanUser === cleanCorrect) return true;

        const userNum = parseFloat(cleanUser);
        const correctNum = parseFloat(cleanCorrect);

        if (!isNaN(userNum) && !isNaN(correctNum)) {
            const tolerance = Math.abs(correctNum * 0.05);
            return Math.abs(userNum - correctNum) <= tolerance;
        }

        return false;
    }
};
