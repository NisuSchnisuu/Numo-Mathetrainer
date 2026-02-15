
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

        const minNum = range <= 20 ? 1 : (range <= 100 ? 3 : 5);
        const maxNum = range <= 20 ? 10 : (range <= 100 ? 25 : 50);

        let currentVal = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        let groupElems: GameElement[] = [{ type: 'number', val: currentVal, id: 'n' + (elementCounter++) }];

        for (let k = 1; k < size; k++) {
            const op = pointOps[Math.floor(Math.random() * pointOps.length)];
            let nextNum;

            if (op === '/') {
                // Avoid dividing by currentVal (result 1) or 1 (result self) if possible
                const factors = [];
                for (let f = 2; f < currentVal; f++) if (currentVal % f === 0) factors.push(f);
                
                if (factors.length > 0) {
                    nextNum = factors[Math.floor(Math.random() * factors.length)];
                } else {
                    // If no factors, maybe change to multiplication or pick 1 if forced
                    nextNum = (currentVal > 1 && Math.random() > 0.3) ? 1 : currentVal;
                }
            } else {
                nextNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
                // Avoid multiplication by 1
                if (op === '*' && nextNum === 1) nextNum = 2;
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

    return { target: currentTotal, elements: allElements, orderedElements: [...allElements], topLevelOp: topOp };
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

    // Avoid result 0 or 1 in brackets if possible
    if (opLine === '-' && a <= b) a = b + Math.floor(Math.random() * 8) + 2;
    if (opLine === '+' && (a+b) <= 2) a += 2;

    const innerRes = (opLine === '+') ? a + b : a - b;
    let c;

    const isPost = Math.random() < 0.5;

    if (opPoint === '*') {
        c = Math.floor(Math.random() * (range <= 20 ? 3 : 7)) + 2;
    } else {
        // Division: ensure integer result AND integer intermediate step
        if (isPost) {
            // (a +/- b) / c
            const factors = [];
            for (let i = 2; i < innerRes; i++) if (innerRes % i === 0) factors.push(i);
            if (factors.length === 0) c = (innerRes > 1 && Math.random() > 0.5) ? innerRes : 1; 
            else c = factors[Math.floor(Math.random() * factors.length)];
        } else {
            // c / (a +/- b)
            if (innerRes === 0) throw "Zero divisor";
            const maxMult = Math.floor(range / innerRes);
            if (maxMult < 2) throw "Range too small";
            c = innerRes * (Math.floor(Math.random() * Math.min(4, maxMult - 1)) + 2);
        }
    }

    let evalStr;
    if (isPost) evalStr = `(${a} ${opLine} ${b}) ${opPoint} ${c}`;
    else evalStr = `${c} ${opPoint} (${a} ${opLine} ${b})`;

    // eslint-disable-next-line no-eval
    const target = eval(evalStr);
    if (target > range || target < 0 || !Number.isInteger(target)) throw "Invalid";

    // Build elements
    const e_a: GameElement = { type: 'number', val: a, id: 'n1' };
    const e_b: GameElement = { type: 'number', val: b, id: 'n2' };
    const e_c: GameElement = { type: 'number', val: c, id: 'n3' };
    const e_oL: GameElement = { type: 'op', val: formatOp(opLine), id: 'o1' };
    const e_oP: GameElement = { type: 'op', val: formatOp(opPoint), id: 'o2' };
    const e_b1: GameElement = { type: 'op', val: '(', id: 'b1' };
    const e_b2: GameElement = { type: 'op', val: ')', id: 'b2' };

    const elements: GameElement[] = [e_a, e_b, e_c, e_oL, e_oP];

    const parens = needsParens(opLine, opPoint, !isPost);
    if (parens) {
        elements.push(e_b1, e_b2);
    }

    let orderedElements: GameElement[];
    if (isPost) {
        orderedElements = parens ? [e_b1, e_a, e_oL, e_b, e_b2, e_oP, e_c] : [e_a, e_oL, e_b, e_oP, e_c];
    } else {
        orderedElements = parens ? [e_c, e_oP, e_b1, e_a, e_oL, e_b, e_b2] : [e_c, e_oP, e_a, e_oL, e_b];
    }

    return { target, elements, orderedElements, topLevelOp: opPoint };
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
    let d = Math.floor(Math.random() * (range <= 20 ? 5 : (range <= 100 ? 20 : 40))) + 2;

    const isPost = Math.random() < 0.5;

    // Handle Division Integrity
    if (newOp === '/') {
        if (isPost) {
            const factors = [];
            for (let i = 2; i < blockVal; i++) if (blockVal % i === 0) factors.push(i);
            if (factors.length === 0) d = (blockVal > 1 && Math.random() > 0.5) ? blockVal : 1; 
            else d = factors[Math.floor(Math.random() * factors.length)];
        } else {
            if (blockVal === 0) throw "Zero divisor";
            const maxMult = Math.floor(range / blockVal);
            if (maxMult < 2) throw "Range too small";
            d = blockVal * (Math.floor(Math.random() * Math.min(4, maxMult - 1)) + 2);
        }
    } else if (newOp === '-') {
        if (isPost && blockVal < d) d = Math.floor(Math.random() * (blockVal > 2 ? blockVal - 2 : blockVal));
        else if (!isPost && d < blockVal) d = blockVal + Math.floor(Math.random() * 10) + 2;
    } else if (newOp === '*') {
        if (d === 1) d = 2;
    }

    let evalStr;
    if (isPost) evalStr = `${blockVal} ${newOp} ${d}`;
    else evalStr = `${d} ${newOp} ${blockVal}`;

    // eslint-disable-next-line no-eval
    const total = eval(evalStr);
    if (total > range || total < 0 || !Number.isInteger(total)) throw "Invalid";

    const e_d: GameElement = { type: 'number', val: d, id: 'n4' };
    const e_o3: GameElement = { type: 'op', val: formatOp(newOp), id: 'o3' };
    const e_b3: GameElement = { type: 'op', val: '(', id: 'b3' };
    const e_b4: GameElement = { type: 'op', val: ')', id: 'b4' };

    const elements = [...baseTask.elements, e_d, e_o3];
    const parens = needsParens(baseTask.topLevelOp, newOp, !isPost);
    if (parens) {
        elements.push(e_b3, e_b4);
    }

    let orderedElements: GameElement[];
    if (isPost) {
        orderedElements = parens ? [e_b3, ...baseTask.orderedElements, e_b4, e_o3, e_d] : [...baseTask.orderedElements, e_o3, e_d];
    } else {
        orderedElements = parens ? [e_d, e_o3, e_b3, ...baseTask.orderedElements, e_b4] : [e_d, e_o3, ...baseTask.orderedElements];
    }

    return { target: total, elements, orderedElements, topLevelOp: newOp };
}

// 4. Profi Bracket
function createBracketEquationProfi(range: number, ops: OperatorState, formatOp: (s: string) => string): TermTask {
    // Weight towards nested pattern for Profi
    const pattern = Math.random() < 0.3 ? 'double' : 'nested';

    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    const availOps = [...lineOps, ...pointOps];
    if (availOps.length < 2) throw "Not enough ops";

    const randOp = (list?: string[]) => {
        const source = list || availOps;
        return source[Math.floor(Math.random() * source.length)];
    };
    const minNum = range <= 20 ? 1 : (range <= 100 ? 3 : 5);
    const maxNum = range <= 20 ? 8 : (range <= 100 ? 15 : 30);
    const randNum = () => Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

    // Helper returns value + elements list + op
    const createSafeTerm = (prefix: string): { val: number, elements: GameElement[], orderedElements: GameElement[], op: string } => {
        let op = randOp();
        let a = randNum();
        let b = randNum();

        if (op === '/') {
            // Factor should be >= 2 to avoid result 1
            const mult = (Math.floor(Math.random() * 4) + 2);
            a = b * mult;
        } else if (op === '-') {
            if (a < b) [a, b] = [b, a];
            if (a === b) a += 2;
        } else if (op === '*' && (a === 1 || b === 1)) {
            if (a === 1) a = 2; if (b === 1) b = 2;
        }

        // eslint-disable-next-line no-eval
        const val = eval(`${a} ${op} ${b}`);
        const e1: GameElement = { type: 'number', val: a, id: 'n' + prefix + '1' };
        const e2: GameElement = { type: 'number', val: b, id: 'n' + prefix + '2' };
        const eo: GameElement = { type: 'op', val: formatOp(op), id: 'o' + prefix };
        return { val, elements: [e1, e2, eo], orderedElements: [e1, eo, e2], op };
    };

    if (pattern === 'double') {
        let left = createSafeTerm('L');
        let right = createSafeTerm('R');
        let op2 = randOp();

        if (op2 === '/') {
            if (left.val === 0) throw "Zero left";
            const factors = [];
            for (let i = 2; i < left.val; i++) if (left.val % i === 0) factors.push(i);
            
            let targetRight;
            if (factors.length > 0) targetRight = factors[Math.floor(Math.random() * factors.length)];
            else targetRight = (left.val > 1 && Math.random() > 0.5) ? left.val : 1;

            // Reconstruct right
            let op3 = randOp();
            let c, d;
            if (op3 === '+') { c = Math.floor(Math.random() * (targetRight > 1 ? targetRight - 1 : targetRight)) + 1; d = targetRight - c; if (d === 0) { d = 1; targetRight++; } }
            else if (op3 === '-') { d = Math.floor(Math.random() * 8) + 2; c = targetRight + d; }
            else if (op3 === '*') {
                const fs = []; for (let i = 2; i < targetRight; i++) if (targetRight % i === 0) fs.push(i);
                if (fs.length > 0) { c = fs[Math.floor(Math.random() * fs.length)]; d = targetRight / c; }
                else { c = targetRight; d = 1; }
            } else { d = (Math.floor(Math.random() * 3) + 2); c = targetRight * d; }

            if (c <= 0 || d <= 0) throw "Inv";

            const e3: GameElement = { type: 'number', val: c, id: 'nR3' };
            const e4: GameElement = { type: 'number', val: d, id: 'nR4' };
            const eoR: GameElement = { type: 'op', val: formatOp(op3), id: 'oR' };

            right = {
                val: targetRight, elements: [e3, e4, eoR], orderedElements: [e3, eoR, e4], op: op3
            };
        } else if (op2 === '-') {
            if (left.val < right.val) [left, right] = [right, left];
            if (left.val === right.val) left.val += 2; // Avoid 0
        }

        // eslint-disable-next-line no-eval
        const res = eval(`${left.val} ${op2} ${right.val}`);
        if (!Number.isInteger(res) || res < 0 || res > range) throw "Invalid";

        const eOM: GameElement = { type: 'op', val: formatOp(op2), id: 'oM' };
        const elements = [...left.elements, ...right.elements, eOM];

        const eBL1: GameElement = { type: 'op', val: '(', id: 'bL1' };
        const eBL2: GameElement = { type: 'op', val: ')', id: 'bL2' };
        const eBR1: GameElement = { type: 'op', val: '(', id: 'bR1' };
        const eBR2: GameElement = { type: 'op', val: ')', id: 'bR2' };

        let orderedElements: GameElement[] = [];

        const leftParens = needsParens(left.op, op2, false);
        if (leftParens) {
            elements.push(eBL1, eBL2);
            orderedElements.push(eBL1, ...left.orderedElements, eBL2);
        } else {
            orderedElements.push(...left.orderedElements);
        }

        orderedElements.push(eOM);

        const rightParens = needsParens(right.op, op2, true);
        if (rightParens) {
            elements.push(eBR1, eBR2);
            orderedElements.push(eBR1, ...right.orderedElements, eBR2);
        } else {
            orderedElements.push(...right.orderedElements);
        }

        return { target: res, elements, orderedElements, topLevelOp: op2 };

    } else {
        // Nested: ((A op B) op2 C) op3 D
        // To force nested brackets visually, we need specific precedence:
        // (Line Op Point) Op2 ... or (Op Op_Higher) Op_Lower ...
        
        let t1 = createSafeTerm('A'); // (A op B)
        // If t1 is Line, op2 should be Point to force brackets
        let op2 = (lineOps.includes(t1.op) && pointOps.length > 0) ? randOp(pointOps) : randOp();
        
        let c = randNum();

        if (op2 === '/') {
            const fs = []; for (let i = 2; i < t1.val; i++) if (t1.val % i === 0) fs.push(i);
            if (fs.length > 0) c = fs[Math.floor(Math.random() * fs.length)];
            else c = (t1.val > 1 && Math.random() > 0.5) ? t1.val : 1;
        } else if (op2 === '-') {
            if (t1.val < c) c = Math.floor(Math.random() * (t1.val > 2 ? t1.val - 2 : t1.val));
            if (t1.val === c) c = Math.max(1, c - 2);
        }

        // eslint-disable-next-line no-eval
        let res2 = eval(`${t1.val} ${op2} ${c}`);

        const eNC: GameElement = { type: 'number', val: c, id: 'nC' };
        const eOB: GameElement = { type: 'op', val: formatOp(op2), id: 'oB' };
        const elements = [...t1.elements, eNC, eOB];

        const eBA1: GameElement = { type: 'op', val: '(', id: 'bA1' };
        const eBA2: GameElement = { type: 'op', val: ')', id: 'bA2' };

        let t1Ordered: GameElement[] = [];
        const t1Parens = needsParens(t1.op, op2, false);
        if (t1Parens) {
            elements.push(eBA1, eBA2);
            t1Ordered = [eBA1, ...t1.orderedElements, eBA2];
        } else {
            t1Ordered = [...t1.orderedElements];
        }

        let orderedElements2: GameElement[] = [...t1Ordered, eOB, eNC];

        // Final step: op3. If op2 was Point, op3 should be Point again or Line
        // To force ANOTHER level of brackets, op3 must have higher precedence or be a tricky case
        let op3 = (pointOps.includes(op2) && pointOps.length > 0 && Math.random() < 0.5) ? randOp(pointOps) : randOp();
        let d = randNum();

        if (op3 === '/') {
            if (res2 === 0) throw "Zero";
            const fs = []; for (let i = 2; i < res2; i++) if (res2 % i === 0) fs.push(i);
            if (fs.length > 0) d = fs[Math.floor(Math.random() * fs.length)];
            else d = (res2 > 1 && Math.random() > 0.5) ? res2 : 1;
        } else if (op3 === '-') {
            if (res2 < d) d = Math.floor(Math.random() * (res2 > 2 ? res2 - 2 : res2));
            if (res2 === d) d = Math.max(1, d - 2);
        }

        // eslint-disable-next-line no-eval
        const finalRes = eval(`${res2} ${op3} ${d}`);
        if (!Number.isInteger(finalRes) || finalRes < 0 || finalRes > range) throw "Invalid";

        const eND: GameElement = { type: 'number', val: d, id: 'nD' };
        const eOC: GameElement = { type: 'op', val: formatOp(op3), id: 'oC' };
        elements.push(eND, eOC);

        const eBB1: GameElement = { type: 'op', val: '(', id: 'bB1' };
        const eBB2: GameElement = { type: 'op', val: ')', id: 'bB2' };

        let finalOrdered: GameElement[] = [];
        const res2Parens = needsParens(op2, op3, false);
        if (res2Parens) {
            elements.push(eBB1, eBB2);
            finalOrdered = [eBB1, ...orderedElements2, eBB2, eOC, eND];
        } else {
            finalOrdered = [...orderedElements2, eOC, eND];
        }

        return { target: finalRes, elements, orderedElements: finalOrdered, topLevelOp: op3 };
    }
}


