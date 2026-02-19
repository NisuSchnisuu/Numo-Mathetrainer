import { jsPDF } from 'jspdf';
import { generateTerm } from '../exercises/numbers/terms/termGenerator';
import type { OperatorState, Difficulty, GameElement } from '../exercises/numbers/terms/termGenerator';

export type ExerciseType = 'berechnen' | 'einsetzen' | 'baumeister';

interface PdfConfig {
    ops: OperatorState;
    range: number;
    difficulty: Difficulty;
    title: string;
    exerciseType: ExerciseType;
}

interface BaseTask {
    solution: string;
    target: number;
}

interface BerechnenTask extends BaseTask {
    display: string;
}

interface EinsetzenTask extends BaseTask {
    elements: GameElement[];
}

interface BaumeisterTask extends BaseTask {
    numbers: string[];
    ops: string[];
}

type PdfTask = BerechnenTask | EinsetzenTask | BaumeisterTask;

export async function generateWorksheetPdf(config: PdfConfig) {
    const doc = new jsPDF();
    const { title, ops, range, difficulty, exerciseType } = config;

    // Header
    doc.setFontSize(20);
    doc.text(title, 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Name: __________________________`, 20, 35);
    doc.text(`Datum: __________________________`, 120, 35);

    doc.setFontSize(10);
    const diffLabel = {
        normal: 'Normal',
        advanced: 'Fortgeschritten',
        profi: 'Profi',
        allround: 'Gemischt'
    }[difficulty];
    doc.text(`Einstellungen: Zahlenraum bis ${range}, Schwierigkeit: ${diffLabel}`, 20, 45);
    doc.line(20, 50, 190, 50);

    // Generate Tasks
    const taskCount = 20;
    const tasks: PdfTask[] = [];
    const usedTerms = new Set<string>();

    for (let i = 0; i < taskCount; i++) {
        let attempts = 0;
        let task: PdfTask | null = null;
        // Wir erhöhen die Versuche und nutzen einen Zeitstempel-Faktor für die Randomness
        while (attempts < 100) {
            try {
                const { task: t } = generateTerm(range, ops, difficulty);
                const solutionString = t.orderedElements.map((e: GameElement) => e.val.toString()).join(' ');

                // Check for duplicates
                const uniqueKey = `${solutionString}=${t.target}`;
                if (usedTerms.has(uniqueKey)) {
                    attempts++;
                    continue;
                }
                usedTerms.add(uniqueKey);

                if (exerciseType === 'berechnen') {
                    task = { display: `${solutionString} = `, target: t.target, solution: `${solutionString} = ${t.target}` } as BerechnenTask;
                } else if (exerciseType === 'einsetzen') {
                    task = {
                        target: t.target,
                        solution: `${solutionString} = ${t.target}`,
                        elements: t.orderedElements
                    } as EinsetzenTask;
                } else if (exerciseType === 'baumeister') {
                    const numbers = t.orderedElements.filter(e => e.type === 'number').map(e => e.val.toString()).sort();
                    const availableOps = t.orderedElements.filter(e => e.type === 'op').map(e => e.val.toString()).sort();
                    task = {
                        target: t.target,
                        numbers: numbers,
                        ops: availableOps,
                        solution: `${solutionString} = ${t.target}`
                    } as BaumeisterTask;
                }
                break;
            } catch {
                attempts++;
            }
        }
        if (task) tasks.push(task);
    }

    // Layout
    const startY = 65;
    const rowHeight = 20;
    const pageHeight = 297; // A4 height in mm
    const bottomMargin = 20;

    // Use single column for complex tasks
    const isSingleCol = exerciseType === 'einsetzen' || exerciseType === 'baumeister';

    let currentY = startY;


    // For 2-column layout (legacy behavior for 'berechnen')
    // We'll stick to the original logic for 'berechnen' to minimize visual changes unless it overflows (unlikely for 20 tasks)
    // But for single column, we need dynamic Y and pagination.

    tasks.forEach((task, index) => {
        // Determine Position
        let x, y;

        if (isSingleCol) {
            // Check for page break
            if (currentY + rowHeight > pageHeight - bottomMargin) {
                doc.addPage();
                currentY = 20; // Start at top of new page
            }
            x = 20;
            y = currentY;
            currentY += rowHeight;
        } else {
            // Original 2-column Static Layout for 'berechnen' (assumes 20 tasks fit on one page)
            const isCol1 = index < 10;
            x = isCol1 ? 20 : 110;
            y = startY + (index % 10) * rowHeight;
        }

        // Task Number
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${index + 1})`, x - 5, y);
        doc.setTextColor(0);
        doc.setFontSize(14);

        if (exerciseType === 'berechnen') {
            const t = task as BerechnenTask;
            doc.text(t.display, x, y);
            const textWidth = doc.getTextWidth(t.display);
            doc.rect(x + textWidth + 2, y - 5, 20, 7);
        } else if (exerciseType === 'einsetzen') {
            const t = task as EinsetzenTask;
            let currentX = x;
            t.elements.forEach((e: GameElement) => {
                if (e.type === 'number') {
                    doc.text(e.val.toString(), currentX, y);
                    currentX += doc.getTextWidth(e.val.toString()) + 2;
                } else {
                    doc.rect(currentX, y - 5, 6, 6);
                    currentX += 8;
                }
            });
            doc.text(` = ${t.target}`, currentX, y);
        } else if (exerciseType === 'baumeister') {
            const t = task as BaumeisterTask;
            doc.setFontSize(9);
            const numbersStr = `Zahlen: ${t.numbers.join(', ')}`;
            doc.text(numbersStr, x, y - 4);

            // Anzeige der verfügbaren Zeichen rechts daneben (oder darunter wenn single col?)
            // Bei Single Col haben wir massig Platz rechts.
            const opsStr = `Zeichen: ${t.ops.join(' ')}`;
            doc.text(opsStr, x + (isSingleCol ? 80 : 40), y - 4);

            doc.setFontSize(12);
            doc.text(`Ziel: ${t.target}`, x, y + 4);
            doc.line(x + 20, y + 4, x + 85, y + 4);
        }
    });

    // Solutions on next page
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Lösungen", 105, 20, { align: 'center' });
    doc.line(20, 25, 190, 25);

    doc.setFontSize(10);
    tasks.forEach((task, index) => {
        const colX = index < 10 ? 20 : 110;
        const rowY = 40 + (index % 10) * 15;
        doc.text(`${index + 1})  ${task.solution}`, colX, rowY);
    });

    // Download mit präzisem Zeitstempel (verhindert Caching-Probleme)
    const now = new Date();
    const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    const fileName = `${title.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}_${timeStr}.pdf`;

    // iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // @ts-ignore
    const isMacWithTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPad Pro with Magic Keyboard

    if (isIOS || isMacWithTouch) {
        // iOS/iPadOS erlaubt oft kein direktes Speichern via .save() in WebViews/PWAs.
        // Wir öffnen das PDF in einem neuen Tab/Fenster, wo der User "Teilen" -> "In Dateien sichern" nutzen kann.
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        // Cleanup nach kurzer Zeit (optional, aber gut für Memory)
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
        doc.save(fileName);
    }
}
