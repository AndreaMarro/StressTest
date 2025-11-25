import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Question, UserState } from '../types';

// Convert LaTeX to readable ASCII/text for PDF
const convertLatexToReadable = (text: string): string => {
    let result = text;

    // Handle fractions: \frac{a}{b} → (a/b)
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

    // Handle sqrt: \sqrt{x} → sqrt(x)
    result = result.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');

    // Handle superscripts: ^{...} → ^(...)
    result = result.replace(/\^\{([^}]+)\}/g, '^($1)');
    result = result.replace(/\^(\w)/g, '^$1');

    // Handle subscripts: _{...} → _(...)
    result = result.replace(/_\{([^}]+)\}/g, '_($1)');
    result = result.replace(/_(\w)/g, '_$1');

    // Handle \text{...}
    result = result.replace(/\\text\{([^}]+)\}/g, '$1');

    // Greek letters - Map to text names for PDF safety
    const greekMap: Record<string, string> = {
        '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
        '\\epsilon': 'epsilon', '\\theta': 'theta', '\\lambda': 'lambda', '\\mu': 'mu',
        '\\pi': 'pi', '\\rho': 'rho', '\\sigma': 'sigma', '\\tau': 'tau',
        '\\phi': 'phi', '\\omega': 'omega', '\\Delta': 'Delta', '\\Omega': 'Ohm'
    };

    // Math symbols - Map to ASCII equivalents
    const symbolMap: Record<string, string> = {
        '\\times': 'x', '\\div': '/', '\\pm': '+/-', '\\mp': '-/+',
        '\\leq': '<=', '\\geq': '>=', '\\neq': '!=', '\\approx': '~',
        '\\infty': 'infinity', '\\partial': 'd', '\\nabla': 'del',
        '\\sqrt': 'sqrt', '\\int': 'integral', '\\sum': 'sum', '\\prod': 'prod',
        '\\deg': 'deg', '\\circ': 'deg', '\\cdot': '*'
    };

    // Replace Greek letters
    for (const [latex, replacement] of Object.entries(greekMap)) {
        const escapedLatex = latex.replace(/\\/g, '\\\\');
        result = result.replace(new RegExp(escapedLatex, 'g'), replacement);
    }

    // Replace math symbols
    for (const [latex, replacement] of Object.entries(symbolMap)) {
        const escapedLatex = latex.replace(/\\/g, '\\\\');
        result = result.replace(new RegExp(escapedLatex, 'g'), ` ${replacement} `);
    }

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
    // Sanitize text for PDF (standard fonts don't support all UTF-8)
    // Map problematic characters to safe ASCII or supported symbols
    const sanitizeForPdf = (str: string): string => {
        return str
            .replace(/€/g, 'EUR')
            .replace(/–/g, '-')
            .replace(/—/g, '-')
            .replace(/“/g, '"')
            .replace(/”/g, '"')
            .replace(/‘/g, "'")
            .replace(/’/g, "'")
            .replace(/π/g, '(pi)') // Map Greek to text if font fails
            .replace(/α/g, '(alpha)')
            .replace(/β/g, '(beta)')
            .replace(/μ/g, 'u')
            .replace(/Ω/g, 'Ohm')
            .replace(/Δ/g, 'Delta')
            .replace(/°/g, 'deg');
    };

    try {
        console.log('[PDF Export] Starting professional PDF generation...');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        let yPos = 20;

        // === HEADER ===
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20); // Almost black
        doc.text("StressTest FISICA", pageWidth / 2, yPos, { align: 'center' });

        yPos += 9;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80); // Darker gray
        doc.text("Report Ufficiale - DM418/2025", pageWidth / 2, yPos, { align: 'center' });

        yPos += 15;
        // Accent line (Terminal Green-ish)
        doc.setLineWidth(1.5);
        doc.setDrawColor(0, 200, 0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 15;

        // === EXAM INFO ===
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const infoStartY = yPos;

        const addInfoLine = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(sanitizeForPdf(value), margin + 35, yPos);
            yPos += 6;
        };

        addInfoLine("Data:", new Date().toLocaleDateString('it-IT', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }));
        addInfoLine("Tipo Esame:", examType === 'full' ? 'Simulazione Completa' : 'Focus Argomento');
        addInfoLine("Argomento:", topic);
        addInfoLine("Difficoltà:", difficulty === 'easy' ? 'L1 - BASIC' : difficulty === 'medium' ? 'L2 - STANDARD' : 'L3 - NIGHTMARE');

        // === SCORE BOX ===
        const scoreBoxX = pageWidth - margin - 50;
        const scoreBoxY = infoStartY - 2;
        const scoreBoxW = 45;
        const scoreBoxH = 24;

        // Recalculate score to be safe
        let calculatedScore = 0;
        questions.forEach(q => {
            const ans = userState.answers[q.id];
            if (ans && compareAnswer(ans, q.correctAnswer, q.type)) {
                calculatedScore++;
            }
        });

        const percentage = Math.round((calculatedScore / questions.length) * 100);
        const passed = percentage >= 60;

        doc.setFillColor(passed ? 230 : 255, passed ? 250 : 235, passed ? 230 : 235);
        doc.setDrawColor(passed ? 34 : 220, passed ? 139 : 20, passed ? 34 : 60);
        doc.setLineWidth(1);
        doc.rect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 'FD');

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(passed ? 34 : 220, passed ? 139 : 20, passed ? 34 : 60);
        doc.text(`${percentage}%`, scoreBoxX + scoreBoxW / 2, scoreBoxY + 11, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${calculatedScore}/${questions.length} Corrette`, scoreBoxX + scoreBoxW / 2, scoreBoxY + 18, { align: 'center' });

        yPos += 12;
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // === SUMMARY TABLE ===
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Riepilogo Risposte", margin, yPos);
        yPos += 6;

        const summaryData = questions.map((q, idx) => {
            const userAns = userState.answers[q.id];
            const isCorrect = userAns && compareAnswer(userAns, q.correctAnswer, q.type);

            return [
                `#${idx + 1}`,
                sanitizeForPdf(convertLatexToReadable(q.text)).substring(0, 60) + '...',
                userAns ? sanitizeForPdf(convertLatexToReadable(userAns)) : '-',
                sanitizeForPdf(convertLatexToReadable(q.correctAnswer)),
                isCorrect ? 'OK' : 'NO'
            ];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['N', 'Domanda', 'Tua Risposta', 'Corretta', 'Esito']],
            body: summaryData,
            theme: 'grid',
            headStyles: {
                fillColor: [20, 20, 20],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 80 },
                2: { cellWidth: 35, halign: 'center' },
                3: { cellWidth: 35, halign: 'center' },
                4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const isOk = data.cell.raw === 'OK';
                    data.cell.styles.textColor = isOk ? [0, 150, 0] : [200, 0, 0];
                }
            }
        });

        // === DETAILED QUESTIONS (new page) ===
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Dettaglio Analitico", margin, yPos);
        yPos += 12;

        questions.forEach((q, idx) => {
            const userAns = userState.answers[q.id];
            const isCorrect = userAns && compareAnswer(userAns, q.correctAnswer, q.type);

            // Check page break
            if (yPos > pageHeight - 50) {
                doc.addPage();
                yPos = 20;
            }

            // Question Header Bar
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`Domanda ${idx + 1}`, margin + 2, yPos + 1);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(isCorrect ? 0 : 220, isCorrect ? 150 : 0, isCorrect ? 0 : 0);
            doc.text(isCorrect ? 'CORRETTA' : 'ERRATA', pageWidth - margin - 2, yPos + 1, { align: 'right' });
            yPos += 10;

            // Question Text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            const questionText = sanitizeForPdf(convertLatexToReadable(q.text));
            const questionLines = doc.splitTextToSize(questionText, pageWidth - 2 * margin);
            doc.text(questionLines, margin, yPos);
            yPos += questionLines.length * 5 + 4;

            // Options (if multiple choice)
            if (q.type === 'multiple_choice' && q.options) {
                doc.setFontSize(9);
                doc.setTextColor(60, 60, 60);
                q.options.forEach((opt) => {
                    const optText = sanitizeForPdf(convertLatexToReadable(opt));
                    const optLines = doc.splitTextToSize(`• ${optText}`, pageWidth - 2 * margin - 10);
                    doc.text(optLines, margin + 5, yPos);
                    yPos += optLines.length * 4;
                });
                yPos += 4;
            }

            // Answers Comparison Box
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 5;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            doc.text("Tua Risposta:", margin, yPos);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 150 : 0, isCorrect ? 0 : 0);
            doc.text(userAns ? sanitizeForPdf(convertLatexToReadable(userAns)) : 'Non data', margin + 30, yPos);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            doc.text("Corretta:", margin + 80, yPos);

            doc.setFont('helvetica', 'bold'); // Bold for correct answer
            doc.setTextColor(0, 150, 0);
            doc.text(sanitizeForPdf(convertLatexToReadable(q.correctAnswer)), margin + 100, yPos);
            yPos += 8;

            // Explanation Box
            if (q.explanation) {
                doc.setFillColor(248, 248, 248);
                doc.setDrawColor(230, 230, 230);
                const explText = "SPIEGAZIONE: " + sanitizeForPdf(convertLatexToReadable(q.explanation));
                const explLines = doc.splitTextToSize(explText, pageWidth - 2 * margin - 6);
                const explHeight = explLines.length * 3.5 + 6;

                if (yPos + explHeight > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.rect(margin, yPos, pageWidth - 2 * margin, explHeight, 'FD');
                doc.setFontSize(8);
                doc.setTextColor(60, 60, 60);
                doc.text(explLines, margin + 3, yPos + 5);
                yPos += explHeight + 8;
            } else {
                yPos += 5;
            }

            // Divider
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
        });

        // === FOOTER ===
        const totalPages = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `StressTest FISICA - Pagina ${i} di ${totalPages}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        const filename = `StressTest_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
        console.log('[PDF Export] Saving professional PDF:', filename);
        doc.save(filename);

        console.log('[PDF Export] ✓ PDF professionale generato con successo');
        return true;

    } catch (error) {
        console.error('[PDF Export] Error:', error);
        alert('⚠️ Errore durante la generazione del PDF.');
        return false;
    }
};

// Helper to compare answers (copied from App.tsx logic)
const compareAnswer = (user: string, correct: string, type: string): boolean => {
    if (!user || user.trim() === '') return false;

    if (type === 'multiple_choice') {
        const userTrim = user.trim();
        const correctTrim = correct.trim();
        return userTrim === correctTrim ||
            (userTrim.length > 0 && correctTrim.length > 0 && userTrim.charAt(0) === correctTrim.charAt(0));
    } else {
        // Fill in the blank - ADVANCED FUZZY MATCHING

        // === NORMALIZATION ===
        const normalize = (str: string) => {
            return str
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .trim();
        };

        const userNorm = normalize(user);
        const correctNorm = normalize(correct);

        // === EXACT MATCH ===
        if (userNorm === correctNorm) return true;

        // === NUMBER EXTRACTION ===
        const extractNumber = (str: string) => {
            const match = str.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/);
            return match ? match[0] : null;
        };

        const userNumber = extractNumber(userNorm);
        const correctNumber = extractNumber(correctNorm);

        // If both have numbers, compare numerically ONLY
        // This prevents "130 N" matching "120 N" via Levenshtein
        if (userNumber && correctNumber) {
            const userNum = parseFloat(userNumber.replace(',', '.'));
            const correctNum = parseFloat(correctNumber.replace(',', '.'));

            if (!isNaN(userNum) && !isNaN(correctNum)) {
                // ±5% tolerance for numbers
                const tolerance = Math.abs(correctNum * 0.05);
                return Math.abs(userNum - correctNum) <= tolerance;
            }
        }

        // === TEXT MATCHING PREP ===
        // Remove extra spaces but preserve word boundaries
        const cleanUserText = userNorm.replace(/\s+/g, ' ').trim();
        const cleanCorrectText = correctNorm.replace(/\s+/g, ' ').trim();
        const noSpaceUser = userNorm.replace(/\s+/g, '');
        const noSpaceCorrect = correctNorm.replace(/\s+/g, '');

        // === LEVENSHTEIN DISTANCE (more tolerant) ===
        // Only use Levenshtein for longer answers to avoid false positives on short units/numbers
        if (cleanCorrectText.length > 4) {
            // Simple Levenshtein implementation for PDF export
            const levenshteinDistance = (a: string, b: string): number => {
                const matrix = [];
                for (let i = 0; i <= b.length; i++) matrix[i] = [i];
                for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
                for (let i = 1; i <= b.length; i++) {
                    for (let j = 1; j <= a.length; j++) {
                        if (b.charAt(i - 1) === a.charAt(j - 1)) {
                            matrix[i][j] = matrix[i - 1][j - 1];
                        } else {
                            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                        }
                    }
                }
                return matrix[b.length][a.length];
            };

            // Allow 30% tolerance or at least 2 edits for longer words
            const maxDistance = Math.max(2, Math.floor(cleanCorrectText.length * 0.3));
            const distance = levenshteinDistance(noSpaceUser, noSpaceCorrect);
            if (distance <= maxDistance) return true;
        }

        // === PARTIAL MATCH (contains correct answer) ===
        if (cleanCorrectText.length > 3 && cleanUserText.includes(cleanCorrectText)) return true;
        if (cleanUserText.length > 3 && cleanCorrectText.includes(cleanUserText)) return true;

        return false;
    }
};
