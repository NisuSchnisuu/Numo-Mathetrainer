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

interface TermGameProps {
    onBack: () => void;
}

export function TermGame({ onBack }: TermGameProps) {
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

    const isValid = (config.ops.plus || config.ops.minus) && (config.ops.mult || config.ops.div);

    return (
        <div className="max-w-lg mx-auto static-card rounded-xl p-6 animate-fade-in flex flex-col justify-center min-h-[500px] relative">
            <button onClick={onBack} className="absolute top-6 left-6 text-muted-foreground hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Einstellungen</h2>

            {/* Operators */}
            <div className="mb-4">
                <label className="block text-xs font-medium mb-2 text-muted-foreground">Rechenzeichen</label>
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
                <label className="block text-xs font-medium mb-2 text-muted-foreground">Zahlenraum</label>
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
                <label className="block text-xs font-medium mb-2 text-muted-foreground">Schwierigkeitsgrad</label>
                <div className="grid grid-cols-3 gap-2">
                    <DiffButton label="Normal" active={config.difficulty === 'normal'} onClick={() => setDiff('normal')} />
                    <DiffButton label="Fortgeschritten" active={config.difficulty === 'advanced'} onClick={() => setDiff('advanced')} />
                    <DiffButton label="Profi" active={config.difficulty === 'profi'} onClick={() => setDiff('profi')} />
                </div>
            </div>

            <div className="mt-auto">
                {!isValid && <p className="text-red-400 text-xs mb-2 text-center">Wähle mind. ein Punkt- und Strichzeichen!</p>}
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
                ${active ? 'bg-primary text-primary-foreground ring-1 ring-primary ring-offset-1 ring-offset-[#0b1120] shadow-sm' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
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
                const numbersUsed = userTerm.filter(e => e.type === 'number').length;
                if (numbersUsed >= 2) {
                    setIsFinished(true);
                } else {
                    showError("Nutze mehr Zahlen!");
                }
            } else {
                showError("Falsches Ergebnis");
            }
        } catch (e) {
            showError("Ungültige Rechnung");
        }
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 2000);
    };

    if (!task) return <div>Loading...</div>;

    const usedIds = new Set(userTerm.map(u => u.id));

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
            <button onClick={onExit} className="absolute top-0 left-0 text-muted-foreground hover:text-white text-sm">
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
                <div className="static-card w-full p-4 rounded-xl border-white/10 flex items-center justify-center relative min-h-[100px]">
                     <div className="flex items-center flex-wrap justify-center gap-2 min-h-[40px]">
                        {userTerm.length === 0 && <span className="text-white/20 italic text-lg">Wähle Zahlen & Zeichen...</span>}
                        {userTerm.map((el, i) => (
                            <span key={i} className="text-2xl font-bold mx-1">{el.val}</span>
                        ))}
                    </div>
                    <span className="text-xl font-bold text-white/50 ml-3 absolute right-4">= {task.target}</span>

                    <button onClick={backspace} className="absolute left-3 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" title="Rückgängig">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                </div>
                
                {/* Feedback Area */}
                <div className="h-14 mt-4 w-full flex justify-center items-center relative">
                    <button 
                        onClick={checkSolution} 
                        disabled={userTerm.length < 3}
                        className={`text-sm font-bold px-8 py-2 rounded-lg shadow-lg transition-all 
                            ${errorMsg ? 'bg-red-500 animate-shake' : 'bg-primary hover:scale-105 active:scale-95'}
                            ${userTerm.length < 3 ? 'opacity-50 cursor-not-allowed' : 'text-primary-foreground'}`}
                    >
                        {errorMsg ? 'Falsch ❌' : 'Überprüfen'}
                    </button>
                    {errorMsg && (
                        <div className="absolute top-12 w-full text-center pointer-events-none">
                            <span className="text-red-400 font-bold bg-background/80 px-2 py-1 rounded shadow-sm">{errorMsg}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pool */}
            <div className="flex flex-wrap justify-center gap-3 pb-4 content-end flex-shrink-0">
                {task.elements.map(el => {
                    const isUsed = usedIds.has(el.id);
                    const colorClass = el.type === 'number' ? 'bg-blue-500/20 text-blue-100 border-blue-500/30' : 'bg-white/10 text-white border-white/10';
                    
                    if (isUsed) return <div key={el.id} style={{ width: 60, height: 50 }}></div>; // Placeholder

                    return (
                        <button 
                            key={el.id}
                            onClick={() => addToTerm(el)}
                            className={`${colorClass} border w-[60px] h-[50px] rounded-lg text-lg font-bold hover:scale-110 active:scale-95 transition-all shadow-md backdrop-blur-sm flex items-center justify-center`}
                        >
                            {el.val}
                        </button>
                    );
                })}
            </div>

            {/* Success Overlay */}
            {isFinished && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl animate-fade-in">
                    <h3 className="text-3xl font-bold text-green-400 mb-6">Richtig! 🎉</h3>
                    <button onClick={nextTask} className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-green-900/20">
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
    while (!task && attempts < 50) {
        attempts++;
        try { 
            task = createEquation(range, ops, difficulty); 
        } catch (e) { 
            // retry
        }
    }
    // Fallback
    if (!task) return { target: 10, elements: [{ type: 'number', val: 5, id: 'n1' }, { type: 'number', val: 2, id: 'n2' }, { type: 'op', val: '×', id: 'o1' }] };
    
    // Sort elements: numbers first, then ops (optional, but looks cleaner)
    task.elements.sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'number' ? -1 : 1;
    });
    
    return task;
}

function createEquation(range: number, ops: OperatorState, diff: Difficulty): Task {
    if (ops.brackets) {
        // Brackets logic (simplified port from original)
        const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
        const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
        
        if (lineOps.length === 0 || pointOps.length === 0) return createSimpleEquation(range, ops, 3);

        const op1 = lineOps[Math.floor(Math.random() * lineOps.length)];
        const op2 = pointOps[Math.floor(Math.random() * pointOps.length)];
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;

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
    const availOps = [];
    if (ops.plus) availOps.push('+'); if (ops.minus) availOps.push('-');
    if (ops.mult) availOps.push('*'); if (ops.div) availOps.push('/');
    if (availOps.length === 0) throw "No ops";

    let nums = [];
    let operators = [];

    for (let i = 0; i < numElements; i++) nums.push(Math.floor(Math.random() * 20) + 1);
    for (let i = 0; i < numElements - 1; i++) operators.push(availOps[Math.floor(Math.random() * availOps.length)]);

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
