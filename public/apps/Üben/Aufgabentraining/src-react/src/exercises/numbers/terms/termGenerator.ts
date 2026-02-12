
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
    topLevelOp?: string;
}

export function generateTerm(range: number, ops: OperatorState, difficulty: Difficulty): { task: TermTask, activeDiff: Difficulty } {
    let selectedDiff: Difficulty = difficulty;

    // Handle Allrounder: Randomly select a sub-difficulty
    if (difficulty === 'allround') {
        const r = Math.random();
        if (r < 0.5) selectedDiff = 'normal';
        else if (r < 0.8) selectedDiff = 'advanced';
        else selectedDiff = 'profi';

        // Ensure brackets are enabled internally if profi is selected
        // (Caller should handle UI locking, but we handle generation logic here)
    }

    const formatOp = (op: string) => op === '*' ? '×' : op === '/' ? '÷' : op;

    let task: TermTask;

    const useBrackets = ops.brackets && Math.random() < 0.5;

    // If 'allround' selected 'profi', force brackets if not already handled
    // Actually createBracketEquationProfi handles its own check, but we pass 'ops'.
    // If ops.brackets is false but we want profi, we should probably force it?
    // In the UI we lock it to true. So we assume ops.brackets is true if needed.

    switch (selectedDiff) {
        case 'normal':
            task = useBrackets ? createBracketEquationNormal(range, ops, formatOp) : createSimpleEquation(range, ops, 3, formatOp);
            break;
        case 'advanced':
            task = useBrackets ? createBracketEquationAdvanced(range, ops, formatOp) : createSimpleEquation(range, ops, 4, formatOp);
            break;
        case 'profi':
            task = createBracketEquationProfi(range, ops, formatOp);
            break;
        default:
            task = createSimpleEquation(range, ops, 3, formatOp);
    }

    return { task, activeDiff: selectedDiff };
}

// --- Helpers ---

function getPrecedence(op: string | undefined): number {
    if (op === '*' || op === '/' || op === '×' || op === '÷') return 2;
    if (op === '+' || op === '-') return 1;
    return 0;
}

function needsParens(innerOp: string | undefined, outerOp: string, isRight: boolean): boolean {
    if (!innerOp) return false;
    const pInner = getPrecedence(innerOp);
    const pOuter = getPrecedence(outerOp);
    if (pInner < pOuter) return true;
    if (pInner === pOuter) {
        if (isRight && (outerOp === '-' || outerOp === '/' || outerOp === '÷')) return true;
    }
    return false;
}

// 1. Simple Linear Equation (e.g. A + B * C)
function createSimpleEquation(range: number, ops: OperatorState, numElements: number, formatOp: (s: string) => string): TermTask {
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');

    if (lineOps.length === 0 && pointOps.length === 0) throw "No ops";

    // Grouping strategy ensures intermediate division integers
    let groups: { val: number, elements: GameElement[] }[] = [];
    let remainingNums = numElements;

    let elementCounter = 0; // ID counter

    while (remainingNums > 0) {
        let size = 1;
        if (lineOps.length > 0) {
            size = Math.floor(Math.random() * Math.min(3, remainingNums)) + 1;
            if (remainingNums - size === 0) size = remainingNums;
        } else {
            size = remainingNums;
        }
        remainingNums -= size;

        const minNum = range <= 20 ? 1 : (range <= 100 ? 4 : 10);
        const maxNum = range <= 20 ? 10 : (range <= 100 ? 25 : 50);

        let currentVal = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        let groupElems: GameElement[] = [{ type: 'number', val: currentVal, id: 'n' + (elementCounter++) }];

        for (let k = 1; k < size; k++) {
            const op = pointOps[Math.floor(Math.random() * pointOps.length)];
            let nextNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

            if (op === '/') {
                const factors = [];
                for (let f = 1; f <= currentVal; f++) if (currentVal % f === 0) factors.push(f);
                nextNum = factors[Math.floor(Math.random() * factors.length)];
            }

            // eslint-disable-next-line no-eval
            currentVal = eval(`${currentVal} ${op} ${nextNum}`);
            groupElems.push({ type: 'op', val: formatOp(op), id: 'o' + (elementCounter++) });
            groupElems.push({ type: 'number', val: nextNum, id: 'n' + (elementCounter++) });
        }
        groups.push({ val: currentVal, elements: groupElems });
    }

    let currentTotal = groups[0].val;
    let allElements = [...groups[0].elements];

    for (let i = 1; i < groups.length; i++) {
        const op = lineOps[Math.floor(Math.random() * lineOps.length)];

        if (op === '-' && currentTotal < groups[i].val) {
            if (ops.plus) {
                currentTotal += groups[i].val;
                allElements.push({ type: 'op', val: '+', id: 'o' + (elementCounter++) });
            } else {
                throw "Negative result";
            }
        } else {
            // eslint-disable-next-line no-eval
            currentTotal = eval(`${currentTotal} ${op} ${groups[i].val}`);
            allElements.push({ type: 'op', val: formatOp(op), id: 'o' + (elementCounter++) });
        }
        allElements.push(...groups[i].elements);
    }

    if (!Number.isInteger(currentTotal) || currentTotal < 0 || currentTotal > range) throw "Invalid";

    // Determine top level op
    let topOp = undefined;
    if (groups.length > 1) {
        topOp = '+';
    } else if (allElements.some(e => e.type === 'op')) {
        topOp = '*';
    }

    return { target: currentTotal, elements: allElements, topLevelOp: topOp };
}

// 2. Normal Bracket Equation
function createBracketEquationNormal(range: number, ops: OperatorState, formatOp: (s: string) => string): TermTask {
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');

    if (lineOps.length === 0 || pointOps.length === 0) return createSimpleEquation(range, ops, 3, formatOp);

    const opLine = lineOps[Math.floor(Math.random() * lineOps.length)];
    const opPoint = pointOps[Math.floor(Math.random() * pointOps.length)];

    const minNum = range <= 20 ? 1 : (range <= 100 ? 3 : 10);
    const maxNum = range <= 20 ? 10 : (range <= 100 ? 25 : 40);

    let a = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
    let b = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

    if (opLine === '-' && a <= b) a = b + Math.floor(Math.random() * 5) + 1;

    const innerRes = (opLine === '+') ? a + b : a - b;
    let c;

    const isPost = Math.random() < 0.5;

    if (opPoint === '*') {
        c = Math.floor(Math.random() * (range <= 20 ? 4 : 8)) + 2;
    } else {
        // Division: ensure integer result AND integer intermediate step
        if (isPost) {
            // (a +/- b) / c
            const factors = [];
            for (let i = 2; i <= innerRes; i++) if (innerRes % i === 0) factors.push(i);
            if (factors.length === 0) c = 1; else c = factors[Math.floor(Math.random() * factors.length)];
        } else {
            // c / (a +/- b)
            if (innerRes === 0) throw "Zero divisor";
            const maxMult = Math.floor(range / innerRes);
            if (maxMult < 1) throw "Range too small";
            c = innerRes * (Math.floor(Math.random() * Math.min(5, maxMult)) + 1);
        }
    }

    let evalStr;
    if (isPost) evalStr = `(${a} ${opLine} ${b}) ${opPoint} ${c}`;
    else evalStr = `${c} ${opPoint} (${a} ${opLine} ${b})`;

    // eslint-disable-next-line no-eval
    const target = eval(evalStr);
    if (target > range || target < 0 || !Number.isInteger(target)) throw "Invalid";

    // Build elements
    const elements: GameElement[] = [
        { type: 'number', val: a, id: 'n1' },
        { type: 'number', val: b, id: 'n2' },
        { type: 'number', val: c, id: 'n3' },
        { type: 'op', val: formatOp(opLine), id: 'o1' },
        { type: 'op', val: formatOp(opPoint), id: 'o2' }
    ];

    const parens = needsParens(opLine, opPoint, !isPost);
    if (parens) {
        elements.push({ type: 'op', val: '(', id: 'b1' });
        elements.push({ type: 'op', val: ')', id: 'b2' });
    }

    return { target, elements, topLevelOp: opPoint };
}

// 3. Advanced Bracket
function createBracketEquationAdvanced(range: number, ops: OperatorState, formatOp: (s: string) => string): TermTask {
    const baseTask = createBracketEquationNormal(range, ops, formatOp);
    const blockVal = baseTask.target;

    const allOps = [];
    if (ops.plus) allOps.push('+'); if (ops.minus) allOps.push('-');
    if (ops.mult) allOps.push('*'); if (ops.div) allOps.push('/');
    if (allOps.length === 0) throw "No ops";

    const newOp = allOps[Math.floor(Math.random() * allOps.length)];
    let d = Math.floor(Math.random() * (range <= 20 ? 5 : (range <= 100 ? 25 : 50))) + 5;

    const isPost = Math.random() < 0.5;

    // Handle Division Integrity
    if (newOp === '/') {
        if (isPost) {
            const factors = [];
            for (let i = 2; i <= blockVal; i++) if (blockVal % i === 0) factors.push(i);
            if (factors.length === 0) d = 1; else d = factors[Math.floor(Math.random() * factors.length)];
        } else {
            if (blockVal === 0) throw "Zero divisor";
            const maxMult = Math.floor(range / blockVal);
            if (maxMult < 1) throw "Range too small";
            d = blockVal * (Math.floor(Math.random() * Math.min(5, maxMult)) + 1);
        }
    } else if (newOp === '-') {
        if (isPost && blockVal < d) d = Math.floor(Math.random() * blockVal);
        else if (!isPost && d < blockVal) d = blockVal + Math.floor(Math.random() * 10) + 1;
    }

    let evalStr;
    if (isPost) evalStr = `${blockVal} ${newOp} ${d}`;
    else evalStr = `${d} ${newOp} ${blockVal}`;

    // eslint-disable-next-line no-eval
    const total = eval(evalStr);
    if (total > range || total < 0 || !Number.isInteger(total)) throw "Invalid";

    const elements = [...baseTask.elements];
    elements.push({ type: 'number', val: d, id: 'n4' });
    elements.push({ type: 'op', val: formatOp(newOp), id: 'o3' });

    const parens = needsParens(baseTask.topLevelOp, newOp, !isPost);
    if (parens) {
        elements.push({ type: 'op', val: '(', id: 'b3' });
        elements.push({ type: 'op', val: ')', id: 'b4' });
    }

    return { target: total, elements, topLevelOp: newOp };
}

// 4. Profi Bracket
function createBracketEquationProfi(range: number, ops: OperatorState, formatOp: (s: string) => string): TermTask {
    const pattern = Math.random() < 0.5 ? 'double' : 'nested';

    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    const availOps = [...lineOps, ...pointOps];
    if (availOps.length < 2) throw "Not enough ops";

    const randOp = () => availOps[Math.floor(Math.random() * availOps.length)];
    const minNum = range <= 20 ? 1 : (range <= 100 ? 3 : 5);
    const maxNum = range <= 20 ? 8 : (range <= 100 ? 15 : 30);
    const randNum = () => Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

    // Helper returns value + elements list + op
    const createSafeTerm = (prefix: string): { val: number, elements: GameElement[], op: string } => {
        let op = randOp();
        let a = randNum();
        let b = randNum();

        if (op === '/') {
            a = b * (Math.floor(Math.random() * 5) + 1);
        } else if (op === '-') {
            if (a < b) [a, b] = [b, a];
        }

        // eslint-disable-next-line no-eval
        const val = eval(`${a} ${op} ${b}`);
        const elements: GameElement[] = [
            { type: 'number', val: a, id: 'n' + prefix + '1' },
            { type: 'number', val: b, id: 'n' + prefix + '2' },
            { type: 'op', val: formatOp(op), id: 'o' + prefix }
        ];
        return { val, elements, op };
    };

    if (pattern === 'double') {
        let left = createSafeTerm('L');
        let right = createSafeTerm('R');
        let op2 = randOp();

        if (op2 === '/') {
            if (left.val === 0) throw "Zero left";
            const factors = [];
            for (let i = 1; i <= left.val; i++) if (left.val % i === 0) factors.push(i);
            const targetRight = factors[Math.floor(Math.random() * factors.length)];

            // Reconstruct right
            let op3 = randOp();
            let c, d;
            if (op3 === '+') { c = Math.floor(Math.random() * targetRight); d = targetRight - c; }
            else if (op3 === '-') { d = Math.floor(Math.random() * 10) + 1; c = targetRight + d; }
            else if (op3 === '*') {
                const fs = []; for (let i = 1; i <= targetRight; i++) if (targetRight % i === 0) fs.push(i);
                c = fs[Math.floor(Math.random() * fs.length)]; d = targetRight / c;
            } else { d = Math.floor(Math.random() * 5) + 1; c = targetRight * d; }

            if (c <= 0 || d <= 0) throw "Inv";

            right = {
                val: targetRight, elements: [
                    { type: 'number', val: c, id: 'nR3' }, { type: 'number', val: d, id: 'nR4' },
                    { type: 'op', val: formatOp(op3), id: 'oR' }
                ], op: op3
            };
        } else if (op2 === '-') {
            if (left.val < right.val) [left, right] = [right, left];
        }

        // eslint-disable-next-line no-eval
        const res = eval(`${left.val} ${op2} ${right.val}`);
        if (!Number.isInteger(res) || res < 0 || res > range) throw "Invalid";

        const elements = [...left.elements, ...right.elements];
        elements.push({ type: 'op', val: formatOp(op2), id: 'oM' }); // middle op

        if (needsParens(left.op, op2, false)) {
            elements.push({ type: 'op', val: '(', id: 'bL1' });
            elements.push({ type: 'op', val: ')', id: 'bL2' });
        }
        if (needsParens(right.op, op2, true)) {
            elements.push({ type: 'op', val: '(', id: 'bR1' });
            elements.push({ type: 'op', val: ')', id: 'bR2' });
        }

        return { target: res, elements, topLevelOp: op2 };

    } else {
        // Nested
        let t1 = createSafeTerm('A');
        let op2 = randOp();
        let c = randNum();

        if (op2 === '/') {
            const fs = []; for (let i = 1; i <= t1.val; i++) if (t1.val % i === 0) fs.push(i);
            c = fs[Math.floor(Math.random() * fs.length)];
        } else if (op2 === '-') {
            if (t1.val < c) c = Math.floor(Math.random() * t1.val);
        }

        // eslint-disable-next-line no-eval
        let res2 = eval(`${t1.val} ${op2} ${c}`);

        const elements = [...t1.elements];
        elements.push({ type: 'number', val: c, id: 'nC' });
        elements.push({ type: 'op', val: formatOp(op2), id: 'oB' });

        if (needsParens(t1.op, op2, false)) {
            elements.push({ type: 'op', val: '(', id: 'bA1' });
            elements.push({ type: 'op', val: ')', id: 'bA2' });
        }

        let op3 = randOp();
        let d = randNum();

        if (op3 === '/') {
            if (res2 === 0) throw "Zero";
            const fs = []; for (let i = 1; i <= res2; i++) if (res2 % i === 0) fs.push(i);
            if (fs.length === 0) throw "No fact";
            d = fs[Math.floor(Math.random() * fs.length)];
        } else if (op3 === '-') {
            if (res2 < d) d = Math.floor(Math.random() * res2);
        }

        // eslint-disable-next-line no-eval
        const finalRes = eval(`${res2} ${op3} ${d}`);
        if (!Number.isInteger(finalRes) || finalRes < 0 || finalRes > range) throw "Invalid";

        elements.push({ type: 'number', val: d, id: 'nD' });
        elements.push({ type: 'op', val: formatOp(op3), id: 'oC' });

        if (needsParens(op2, op3, false)) {
            elements.push({ type: 'op', val: '(', id: 'bB1' });
            elements.push({ type: 'op', val: ')', id: 'bB2' });
        }

        return { target: finalRes, elements, topLevelOp: op3 };
    }
}
