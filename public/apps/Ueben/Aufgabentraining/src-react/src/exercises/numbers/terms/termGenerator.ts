export type OperatorState = {
    plus: boolean;
    minus: boolean;
    mult: boolean;
    div: boolean;
    brackets: boolean;
};

export type Difficulty = 'normal' | 'advanced' | 'profi' | 'allround';

export interface GameElement {
    type: 'number' | 'op' | 'separator';
    val: string | number;
    id: string;
}

export interface TermTask {
    target: number;
    elements: GameElement[];
    orderedElements: GameElement[];
    topLevelOp?: string;
}

// --- Hauptfunktion ---

export function generateTerm(range: number, ops: OperatorState, difficulty: Difficulty): { task: TermTask, activeDiff: Difficulty } {
    let selectedDiff: Difficulty = difficulty;

    // Allround-Logik
    if (difficulty === 'allround') {
        const r = Math.random();
        if (r < 0.50) selectedDiff = 'normal';       // 50%
        else if (r < 0.80) selectedDiff = 'advanced'; // 30%
        else selectedDiff = 'profi';                 // 20%
    }

    const activeOps = { ...ops };
    if (selectedDiff === 'profi' || (selectedDiff === 'advanced' && Math.random() > 0.4)) {
        activeOps.brackets = true;
    }

    let task: TermTask;

    try {
        switch (selectedDiff) {
            case 'normal':
                task = generateNormal(range, activeOps);
                break;
            case 'advanced':
                task = generateAdvanced(range, activeOps);
                break;
            case 'profi':
                task = generateProfi(range, activeOps);
                break;
            default:
                task = generateNormal(range, activeOps);
        }
    } catch (e) {
        console.warn("Generation failed, using fallback", e);
        task = createFallback();
    }

    return { task, activeDiff: selectedDiff };
}

// --- Strategien ---

function generateNormal(range: number, ops: OperatorState): TermTask {
    const useBrackets = ops.brackets && Math.random() < 0.5;

    if (useBrackets) {
        return createSimpleBracketTerm(range, ops);
    } else {
        return createLinearChain(range, ops, 3);
    }
}

function generateAdvanced(range: number, ops: OperatorState): TermTask {
    const rand = Math.random();

    // 1. Doppel-Pack (ca. 40%)
    if (ops.brackets && rand < 0.4) {
        return createDoubleBracketTerm(range, ops);
    }

    // 2. Tricky 3 (ca. 20%)
    if (rand >= 0.4 && rand < 0.6 && ops.minus && ops.mult) {
        try {
            return createTrickyLinear(range);
        } catch {
            // Fallback
        }
    }

    // 3. Lange Kette (Rest ca. 40%)
    return createLinearChain(range, ops, 4);
}

function generateProfi(range: number, ops: OperatorState): TermTask {
    if (!ops.brackets) return createLinearChain(range, ops, 5);

    // Schritt 1: Innerster Term
    const inner = createSafeDuo(Math.floor(range / 2), ops);

    // Schritt 2: Erweitere um eine Zahl (Verschachtelung 1)
    const step2 = extendTerm(inner, Math.floor(range * 0.8), ops, true);

    // Schritt 3: Erweitere um noch eine Zahl
    const step3 = extendTerm(step2, range, ops, false);

    return {
        target: step3.val,
        elements: step3.elements,
        orderedElements: step3.orderedElements,
        topLevelOp: step3.lastOp
    };
}


// --- Helper Logic ---

interface TermFragment {
    val: number;
    elements: GameElement[];
    orderedElements: GameElement[];
    lastOp?: string;
    precedence: number; // 0=Num, 1=Line (+-), 2=Point (*/), 3=Bracket
}

let idCounter = 0;
const getId = (prefix: string) => `${prefix}_${idCounter++}`;

function getOpsList(ops: OperatorState, types: 'line' | 'point' | 'all'): string[] {
    const list = [];
    if (types === 'line' || types === 'all') {
        if (ops.plus) list.push('+');
        if (ops.minus) list.push('-');
    }
    if (types === 'point' || types === 'all') {
        if (ops.mult) list.push('*');
        if (ops.div) list.push('/');
    }
    return list;
}

function randOp(list: string[]): string {
    if (list.length === 0) return '+';
    return list[Math.floor(Math.random() * list.length)];
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatOp(op: string): string {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op;
}

function getPrecedence(op: string): number {
    if (op === '*' || op === '/') return 2;
    if (op === '+' || op === '-') return 1;
    return 0;
}

function createSafeDuo(maxRange: number, ops: OperatorState): TermFragment {
    const availOps = getOpsList(ops, 'all');
    if (availOps.length === 0) throw new Error("No ops available");

    const op = randOp(availOps);
    let a, b, res;

    if (op === '/') {
        b = randInt(2, Math.max(2, Math.floor(Math.sqrt(maxRange))));
        res = randInt(2, Math.floor(maxRange / b));
        a = res * b;
    } else if (op === '*') {
        a = randInt(2, Math.floor(maxRange / 2));
        b = randInt(2, Math.floor(maxRange / a));
        res = a * b;
    } else if (op === '-') {
        a = randInt(2, maxRange);
        b = randInt(1, a - 1);
        res = a - b;
    } else { // +
        a = randInt(1, maxRange - 1);
        b = randInt(1, maxRange - a);
        res = a + b;
    }

    const elA: GameElement = { type: 'number', val: a, id: getId('n') };
    const elB: GameElement = { type: 'number', val: b, id: getId('n') };
    const elOp: GameElement = { type: 'op', val: formatOp(op), id: getId('o') };

    return {
        val: res,
        elements: [elA, elB, elOp],
        orderedElements: [elA, elOp, elB],
        lastOp: op,
        precedence: getPrecedence(op)
    };
}

function extendTerm(base: TermFragment, maxRange: number, ops: OperatorState, forceParens: boolean): TermFragment {
    const availOps = getOpsList(ops, 'all');
    const op = randOp(availOps);

    let newVal;
    const isPost = Math.random() < 0.5;

    if (op === '/') {
        if (isPost) {
            const factors = [];
            for (let i = 2; i < base.val; i++) if (base.val % i === 0) factors.push(i);
            if (factors.length === 0) {
                newVal = randInt(2, 5);
                // Fallback: Multiplikation statt Division
                return extendTermWithSpecificOp(base, newVal, '*', isPost, forceParens);
            }
            newVal = factors[Math.floor(Math.random() * factors.length)];
        } else {
            if (base.val === 0) throw new Error("Div Zero");
            const maxMult = Math.floor(maxRange / base.val);
            if (maxMult < 2) throw new Error("Range too small for division");
            const mult = randInt(2, maxMult);
            newVal = base.val * mult;
        }
    } else if (op === '*') {
        newVal = randInt(2, Math.max(2, Math.floor(maxRange / (base.val || 1))));
    } else if (op === '-') {
        if (isPost) {
            if (base.val < 2) {
                newVal = randInt(1, 5);
                return extendTermWithSpecificOp(base, newVal, '+', isPost, forceParens);
            }
            newVal = randInt(1, base.val - 1);
        } else {
            newVal = randInt(base.val + 1, maxRange);
        }
    } else {
        newVal = randInt(1, Math.max(1, maxRange - base.val));
    }

    return extendTermWithSpecificOp(base, newVal, op, isPost, forceParens);
}

function extendTermWithSpecificOp(base: TermFragment, numVal: number, op: string, isPost: boolean, forceParens: boolean): TermFragment {
    let needsParens = forceParens;
    if (!needsParens && base.lastOp) {
        const pInner = base.precedence;
        const pOuter = getPrecedence(op);

        if (pOuter > pInner) needsParens = true;
        if (pOuter === pInner && !isPost && (op === '-' || op === '/')) needsParens = true;
    }

    const elNum: GameElement = { type: 'number', val: numVal, id: getId('n') };
    const elOp: GameElement = { type: 'op', val: formatOp(op), id: getId('o') };

    let newOrdered: GameElement[] = [];
    const elements = [...base.elements, elNum, elOp];

    if (needsParens) {
        const bL: GameElement = { type: 'op', val: '(', id: getId('b') };
        const bR: GameElement = { type: 'op', val: ')', id: getId('b') };
        elements.push(bL, bR);

        if (isPost) {
            newOrdered = [bL, ...base.orderedElements, bR, elOp, elNum];
        } else {
            newOrdered = [elNum, elOp, bL, ...base.orderedElements, bR];
        }
    } else {
        if (isPost) {
            newOrdered = [...base.orderedElements, elOp, elNum];
        } else {
            newOrdered = [elNum, elOp, ...base.orderedElements];
        }
    }

    // Manuelle Berechnung
    let res = 0;
    try {
        if (op === '+') res = isPost ? base.val + numVal : numVal + base.val;
        else if (op === '-') res = isPost ? base.val - numVal : numVal - base.val;
        else if (op === '*') res = isPost ? base.val * numVal : numVal * base.val;
        else if (op === '/') res = isPost ? base.val / numVal : numVal / base.val;
    } catch (e) { res = 0; }

    return {
        val: res,
        elements,
        orderedElements: newOrdered,
        lastOp: op,
        precedence: needsParens ? 3 : getPrecedence(op)
    };
}


// --- Generators Implementations ---

function createLinearChain(range: number, ops: OperatorState, length: number): TermTask {
    let current = createSafeDuo(range, ops);

    for (let i = 0; i < length - 2; i++) {
        current = extendTerm(current, range, ops, false);
    }

    return {
        target: current.val,
        elements: current.elements,
        orderedElements: current.orderedElements,
        topLevelOp: current.lastOp
    };
}

function createSimpleBracketTerm(range: number, ops: OperatorState): TermTask {
    const duo = createSafeDuo(Math.floor(range / 2), ops);
    const final = extendTerm(duo, range, ops, true);

    return {
        target: final.val,
        elements: final.elements,
        orderedElements: final.orderedElements,
        topLevelOp: final.lastOp
    };
}

function createDoubleBracketTerm(range: number, ops: OperatorState): TermTask {
    const left = createSafeDuo(Math.floor(Math.sqrt(range)) + 5, ops);
    const right = createSafeDuo(Math.floor(Math.sqrt(range)) + 5, ops);

    const availOps = getOpsList(ops, 'all');
    const op = randOp(availOps);

    let valid = false;
    let res = 0;

    if (op === '+') {
        res = left.val + right.val;
        valid = res <= range;
    } else if (op === '-') {
        if (left.val < right.val) {
            valid = false; // Einfacher Retry
        } else {
            res = left.val - right.val;
            valid = true;
        }
    } else if (op === '*') {
        res = left.val * right.val;
        valid = res <= range;
    } else if (op === '/') {
        res = left.val / right.val;
        valid = (left.val % right.val === 0);
    }

    if (!valid) {
        // Fallback: Addition
        if (left.val + right.val <= range) {
            return manualCombine(left, right, '+');
        }
        return createLinearChain(range, ops, 4);
    }

    return manualCombine(left, right, op);
}

function manualCombine(t1: TermFragment, t2: TermFragment, op: string): TermTask {
    const elOp: GameElement = { type: 'op', val: formatOp(op), id: getId('o') };
    const bL1: GameElement = { type: 'op', val: '(', id: getId('b') };
    const bR1: GameElement = { type: 'op', val: ')', id: getId('b') };
    const bL2: GameElement = { type: 'op', val: '(', id: getId('b') };
    const bR2: GameElement = { type: 'op', val: ')', id: getId('b') };

    const elements = [...t1.elements, ...t2.elements, elOp, bL1, bR1, bL2, bR2];

    const ordered = [
        bL1, ...t1.orderedElements, bR1,
        elOp,
        bL2, ...t2.orderedElements, bR2
    ];

    let res = 0;
    if (op === '+') res = t1.val + t2.val;
    if (op === '-') res = t1.val - t2.val;
    if (op === '*') res = t1.val * t2.val;
    if (op === '/') res = t1.val / t2.val;

    return {
        target: res,
        elements,
        orderedElements: ordered,
        topLevelOp: op
    };
}

function createTrickyLinear(range: number): TermTask {
    const c = randInt(2, 5);
    const b = randInt(2, 5);
    const prod = b * c;
    const a = randInt(prod + 1, range);

    const elA: GameElement = { type: 'number', val: a, id: getId('n') };
    const elB: GameElement = { type: 'number', val: b, id: getId('n') };
    const elC: GameElement = { type: 'number', val: c, id: getId('n') };
    const op1: GameElement = { type: 'op', val: '-', id: getId('o') };
    const op2: GameElement = { type: 'op', val: '×', id: getId('o') };

    return {
        target: a - prod,
        elements: [elA, elB, elC, op1, op2],
        orderedElements: [elA, op1, elB, op2, elC],
        topLevelOp: '-'
    };
}

function createFallback(): TermTask {
    const el1: GameElement = { type: 'number', val: 5, id: 'f1' };
    const el2: GameElement = { type: 'number', val: 2, id: 'f2' };
    const op: GameElement = { type: 'op', val: '+', id: 'f3' };
    return {
        target: 7,
        elements: [el1, el2, op],
        orderedElements: [el1, op, el2]
    };
}