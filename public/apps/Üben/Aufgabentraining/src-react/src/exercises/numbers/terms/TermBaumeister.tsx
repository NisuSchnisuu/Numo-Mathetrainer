import { useState, useEffect } from 'react';

type OperatorState = {
    plus: boolean;
    minus: boolean;
    mult: boolean;
    div: boolean;
    brackets: boolean;
};

type Difficulty = 'normal' | 'advanced' | 'profi';

interface Config {
    ops: OperatorState;
    range: number;
    difficulty: Difficulty;
}

interface GameElement {
    type: 'number' | 'op';
    val: string | number;
    id: string;
}

interface Task {
    target: number;
    elements: GameElement[];
}

interface TermBaumeisterProps {
    onBack: () => void;
}

export function TermBaumeister({ onBack }: TermBaumeisterProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [config, setConfig] = useState<Config>({
        ops: { plus: true, minus: true, mult: true, div: true, brackets: false },
        range: 100,
        difficulty: 'normal'
    });

    if (!isPlaying) {
        return <ConfigView config={config} setConfig={setConfig} onStart={() => setIsPlaying(true)} onBack={onBack} />;
    }

    return <GameSession config={config} onExit={() => setIsPlaying(false)} />;
}

function ConfigView({ config, setConfig, onStart, onBack }: { config: Config, setConfig: (c: Config) => void, onStart: () => void, onBack: () => void }) {
    const toggleOp = (key: keyof OperatorState) => {
        setConfig({
            ...config,
            ops: { ...config.ops, [key]: !config.ops[key] }
        });
    };

    const setDiff = (d: Difficulty) => setConfig({ ...config, difficulty: d });
    const setRange = (r: number) => setConfig({ ...config, range: r });

    // Validate that we have at least one line op and one point op for mixed calculations
    const hasLineOp = config.ops.plus || config.ops.minus;
    const hasPointOp = config.ops.mult || config.ops.div;
    const isValid = hasLineOp && hasPointOp;

    return (
        <div className="max-w-lg mx-auto static-card rounded-xl p-6 animate-fade-in flex flex-col justify-center min-h-[500px] relative">
            <button onClick={onBack} className="absolute top-6 left-6 text-muted-foreground hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Einstellungen</h2>

            {/* Operators */}
            <div className="mb-4">
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Rechenzeichen</label>
                <p className="text-xs text-muted-foreground/60 mb-3">Wähle die Rechenarten, die in den Aufgaben vorkommen sollen.</p>
                <div className="grid grid-cols-5 gap-2">
                    <OpToggle label="+" active={config.ops.plus} onClick={() => toggleOp('plus')} />
                    <OpToggle label="-" active={config.ops.minus} onClick={() => toggleOp('minus')} />
                    <OpToggle label="×" active={config.ops.mult} onClick={() => toggleOp('mult')} />
                    <OpToggle label="÷" active={config.ops.div} onClick={() => toggleOp('div')} />
                    <OpToggle label="( )" active={config.ops.brackets} onClick={() => toggleOp('brackets')} />
                </div>
            </div>

            {/* Range */}
            <div className="mb-4">
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Zahlenraum</label>
                <p className="text-xs text-muted-foreground/60 mb-2">Wie gross dürfen die Zahlen maximal werden?</p>
                <select 
                    value={config.range} 
                    onChange={(e) => setRange(parseInt(e.target.value))}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="20">bis 20</option>
                    <option value="100">bis 100</option>
                    <option value="1000">bis 1'000</option>
                </select>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Schwierigkeitsgrad</label>
                <p className="text-xs text-muted-foreground/60 mb-2">Bestimmt die Anzahl der Zahlen in der Rechnung.</p>
                <div className="grid grid-cols-3 gap-2">
                    <DiffButton label="Normal" active={config.difficulty === 'normal'} onClick={() => setDiff('normal')} />
                    <DiffButton label="Fortgeschritten" active={config.difficulty === 'advanced'} onClick={() => setDiff('advanced')} />
                    <DiffButton label="Profi" active={config.difficulty === 'profi'} onClick={() => setDiff('profi')} />
                </div>
            </div>

            <div className="mt-auto">
                {!isValid && <p className="text-red-400 text-xs mb-2 text-center">Wähle mindestens eine Strich- (+/-) und eine Punktrechnung (×/÷)!</p>}
                <button 
                    onClick={onStart} 
                    disabled={!isValid}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Übung starten
                </button>
            </div>
        </div>
    );
}

function OpToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center justify-center p-2 rounded-md border border-white/5 transition-all duration-200 
                ${active ? 'bg-green-500 text-white ring-1 ring-green-500 ring-offset-1 ring-offset-[#0b1120] shadow-sm' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
        >
            <span className="font-bold text-base">{label}</span>
        </button>
    );
}

function DiffButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`px-2 py-2 rounded-lg border border-white/10 text-xs transition-all 
                ${active ? 'bg-primary/20 ring-1 ring-primary/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'hover:bg-white/5'}`}
        >
            {label}
        </button>
    );
}

// --- Game Session ---

function GameSession({ config, onExit }: { config: Config, onExit: () => void }) {
    const [task, setTask] = useState<Task | null>(null);
    const [userTerm, setUserTerm] = useState<GameElement[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Init first task
    useEffect(() => {
        nextTask();
    }, []);

    const nextTask = () => {
        setIsFinished(false);
        setUserTerm([]);
        setErrorMsg(null);
        setTask(generateTask(config));
    };

    const addToTerm = (el: GameElement) => {
        if (isFinished) return;
        // Don't allow using same element twice (by ID)
        if (userTerm.find(u => u.id === el.id)) return;
        
        setUserTerm([...userTerm, el]);
        setErrorMsg(null);
    };

    const backspace = () => {
        if (isFinished) return;
        setUserTerm(prev => prev.slice(0, -1));
        setErrorMsg(null);
    };

    const checkSolution = () => {
        if (!task) return;
        const termStr = userTerm.map(e => e.val.toString().replace('×', '*').replace('÷', '/')).join(' ');

        try {
            if (!/^[0-9+\-*/().\s]+$/.test(termStr)) throw "Format";
            // eslint-disable-next-line no-eval
            const result = eval(termStr);

            if (result === task.target) {
                // Check if all elements are used
                if (userTerm.length === task.elements.length) {
                     setIsFinished(true);
                } else {
                    showError("Nutze alle Teile!");
                }
            } else {
                showError("Falsches Ergebnis");
                setUserTerm([]); // Reset on error
            }
        } catch (e) {
            showError("Ungültige Rechnung");
            setUserTerm([]); // Reset on error
        }
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 2000);
    };

    if (!task) return <div>Loading...</div>;

    const usedIds = new Set(userTerm.map(u => u.id));
    const allUsed = userTerm.length === task.elements.length;

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
            <button onClick={onExit} className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all hover:scale-105 active:scale-95 z-10">
                &larr; Beenden
            </button>

            {/* Target */}
            <div className="text-center py-2 flex-shrink-0 mt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Zielzahl</div>
                <div className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-tight">
                    {task.target}
                </div>
            </div>

            {/* Equation Area */}
            <div className="flex-1 flex flex-col justify-center items-center py-2 min-h-[100px]">
                {/* Visual Field / Container */}
                <div className="w-full max-w-2xl p-6 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center relative min-h-[120px] transition-colors hover:border-white/30">
                     <div className="flex items-center flex-wrap justify-center gap-2 min-h-[50px]">
                        {userTerm.length === 0 && <span className="text-white/20 italic text-lg select-none">Rechnung hier bauen...</span>}
                        {userTerm.map((el, i) => (
                            <span key={i} className="text-3xl font-bold mx-1 animate-scale-in">{el.val}</span>
                        ))}
                    </div>
                    <span className="text-2xl font-bold text-white/50 ml-4 absolute right-6">= {task.target}</span>

                    <button onClick={backspace} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" title="Rückgängig">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                </div>
                
                {/* Feedback Area */}
                <div className="h-14 mt-6 w-full flex justify-center items-center relative">
                    <button 
                        onClick={checkSolution} 
                        disabled={!allUsed}
                        className={`text-base font-bold px-10 py-3 rounded-xl shadow-lg transition-all 
                            ${errorMsg ? 'bg-red-500 animate-shake' : 'bg-primary'}
                            ${!allUsed ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : 'text-primary-foreground hover:scale-105'}`}
                    >
                        {errorMsg ? 'Falsch ❌' : 'Überprüfen'}
                    </button>
                    {errorMsg && (
                        <div className="absolute top-14 w-full text-center pointer-events-none z-10">
                            <span className="text-red-400 font-bold bg-[#0b1120] border border-red-500/30 px-4 py-2 rounded-lg shadow-xl">{errorMsg}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pool */}
            <div className="flex flex-wrap justify-center gap-3 pb-8 content-end flex-shrink-0">
                {task.elements.map(el => {
                    const isUsed = usedIds.has(el.id);
                    const isBracket = el.val === '(' || el.val === ')';
                    
                    let colorClass = 'bg-white/10 text-white border-white/10 hover:bg-white/20'; // Default Op
                    if (el.type === 'number') {
                        colorClass = 'bg-blue-500/20 text-blue-100 border-blue-500/30 hover:bg-blue-500/30';
                    } else if (isBracket) {
                        colorClass = 'bg-purple-500/20 text-purple-100 border-purple-500/30 hover:bg-purple-500/30';
                    }
                    
                    if (isUsed) return <div key={el.id} className="w-[70px] h-[60px] rounded-lg border border-dashed border-white/5 bg-transparent"></div>; // Placeholder

                    return (
                        <button 
                            key={el.id}
                            onClick={() => addToTerm(el)}
                            className={`${colorClass} border w-[70px] h-[60px] rounded-lg text-2xl font-bold transition-all shadow-lg backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95`}
                        >
                            {el.val}
                        </button>
                    );
                })}
            </div>

            {/* Success Overlay */}
            {isFinished && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl animate-fade-in">
                    <h3 className="text-4xl font-bold text-green-400 mb-8">Richtig! 🎉</h3>
                    <button onClick={nextTask} className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-green-900/20 hover:scale-105">
                        Nächste Aufgabe
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Logic Helper ---

function generateTask(config: Config): Task {
    const { range, ops, difficulty } = config;
    let task: Task | null = null;
    let attempts = 0;
    while (!task && attempts < 100) {
        attempts++;
        try { 
            task = createEquation(range, ops, difficulty); 
        } catch (e) { 
            // retry
        }
    }
    // Fallback
    if (!task) return { target: 10, elements: [{ type: 'number', val: 5, id: 'n1' }, { type: 'number', val: 2, id: 'n2' }, { type: 'op', val: '×', id: 'o1' }] };
    
    // 1. Shuffle completely to randomize order within types
    task.elements.sort(() => Math.random() - 0.5);

    // 2. Sort by type to group them (Numbers first, then Ops)
    task.elements.sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'number' ? -1 : 1;
    });
    
    return task;
}

function createEquation(range: number, ops: OperatorState, diff: Difficulty): Task {
    if (ops.brackets) {
        // Brackets logic - Ensure mixed operations
        const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
        const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
        
        // If we don't have both types, we can't do mixed with brackets as effectively for this specific logic, 
        // but the validation in ConfigView should prevent this. 
        // Just in case, fallback to simple if one is missing.
        if (lineOps.length === 0 || pointOps.length === 0) return createSimpleEquation(range, ops, 3);

        const op1 = lineOps[Math.floor(Math.random() * lineOps.length)];
        const op2 = pointOps[Math.floor(Math.random() * pointOps.length)];
        
        const maxNum = range <= 20 ? 10 : (range <= 100 ? 15 : 50);
        const a = Math.floor(Math.random() * maxNum) + 1;
        const b = Math.floor(Math.random() * maxNum) + 1;

        let c;
        let term1Res = (op1 === '+') ? a + b : a - b;

        if (op2 === '*') {
            c = Math.floor(Math.random() * 10) + 2;
        } else {
            const factors = [];
            for (let i = 2; i < Math.abs(term1Res); i++) if (term1Res % i === 0) factors.push(i);
            if (factors.length === 0) c = 1; else c = factors[Math.floor(Math.random() * factors.length)];
        }

        let target = (op2 === '*') ? term1Res * c : term1Res / c;
        if (target > range || target < 0) throw "Out of range";

        const elements: GameElement[] = [
            { type: 'number', val: a, id: 'n1' },
            { type: 'number', val: b, id: 'n2' },
            { type: 'number', val: c, id: 'n3' },
            { type: 'op', val: op1, id: 'o1' },
            { type: 'op', val: op2 === '*' ? '×' : '÷', id: 'o2' },
            { type: 'op', val: '(', id: 'b1' },
            { type: 'op', val: ')', id: 'b2' }
        ];
        return { target, elements };
    } else {
        let numCount = 3;
        if (diff === 'advanced') numCount = 4;
        if (diff === 'profi') numCount = 5;
        return createSimpleEquation(range, ops, numCount);
    }
}

function createSimpleEquation(range: number, ops: OperatorState, numElements: number): Task {
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    
    // Fallback if not mixed (should be prevented by config validation)
    if (lineOps.length === 0 && pointOps.length === 0) throw "No ops";
    
    let nums = [];
    let operators = [];

    // Ensure at least one line and one point op if possible
    let requiredOps = [];
    if (lineOps.length > 0) requiredOps.push(lineOps[Math.floor(Math.random() * lineOps.length)]);
    if (pointOps.length > 0) requiredOps.push(pointOps[Math.floor(Math.random() * pointOps.length)]);

    // Fill remaining spots with random ops from available
    const allAvailOps = [...lineOps, ...pointOps];
    while (requiredOps.length < numElements - 1) {
        requiredOps.push(allAvailOps[Math.floor(Math.random() * allAvailOps.length)]);
    }
    
    // Shuffle operators so the required ones aren't always first
    operators = requiredOps.sort(() => Math.random() - 0.5);

    const maxNum = range <= 20 ? 10 : (range <= 100 ? 20 : 100);
    for (let i = 0; i < numElements; i++) nums.push(Math.floor(Math.random() * maxNum) + 1);

    let str = "";
    for (let i = 0; i < nums.length; i++) {
        str += nums[i];
        if (i < operators.length) str += " " + operators[i] + " ";
    }

    // eslint-disable-next-line no-eval
    const res = eval(str);
    if (!Number.isInteger(res)) throw "Decimal";
    if (res < 0 || res > range) throw "Range";

    const elements: GameElement[] = nums.map((n, i) => ({ type: 'number', val: n, id: 'n' + i }));
    operators.forEach((o, i) => elements.push({ type: 'op', val: o === '*' ? '×' : (o === '/' ? '÷' : o), id: 'o' + i }));

    return { target: res, elements };
}
