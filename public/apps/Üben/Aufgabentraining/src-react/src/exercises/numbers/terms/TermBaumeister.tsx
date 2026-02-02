import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type OperatorState = {
    plus: boolean;
    minus: boolean;
    mult: boolean;
    div: boolean;
    brackets: boolean;
};

type Difficulty = 'normal' | 'advanced' | 'profi' | 'allround';

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
    currentDiff?: Difficulty;
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
        if (config.difficulty === 'allround') return; // Locked
        if (config.difficulty === 'profi' && key === 'brackets') return; // Locked
        
        setConfig({
            ...config,
            ops: { ...config.ops, [key]: !config.ops[key] }
        });
    };

    const setDiff = (d: Difficulty) => {
        let newOps = { ...config.ops };
        
        if (d === 'profi') {
            newOps.brackets = true;
        } else if (d === 'allround') {
            newOps = { plus: true, minus: true, mult: true, div: true, brackets: true };
        }

        setConfig({ ...config, difficulty: d, ops: newOps });
    };

    const setRange = (r: number) => setConfig({ ...config, range: r });

    // Validate that we have at least one line op and one point op for mixed calculations
    const hasLineOp = config.ops.plus || config.ops.minus;
    const hasPointOp = config.ops.mult || config.ops.div;
    const isValid = hasLineOp && hasPointOp;

    const isAllround = config.difficulty === 'allround';
    const isProfi = config.difficulty === 'profi';

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
                    <OpToggle label="+" active={config.ops.plus} locked={isAllround} onClick={() => toggleOp('plus')} />
                    <OpToggle label="-" active={config.ops.minus} locked={isAllround} onClick={() => toggleOp('minus')} />
                    <OpToggle label="×" active={config.ops.mult} locked={isAllround} onClick={() => toggleOp('mult')} />
                    <OpToggle label="÷" active={config.ops.div} locked={isAllround} onClick={() => toggleOp('div')} />
                    <OpToggle label="( )" active={config.ops.brackets} locked={isAllround || isProfi} onClick={() => toggleOp('brackets')} />
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
                <p className="text-xs text-muted-foreground/60 mb-2">Bestimmt die Komplexität der Aufgaben.</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <DiffButton label="Normal" active={config.difficulty === 'normal'} onClick={() => setDiff('normal')} />
                    <DiffButton label="Fortgeschritten" active={config.difficulty === 'advanced'} onClick={() => setDiff('advanced')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <DiffButton label="Profi" active={config.difficulty === 'profi'} onClick={() => setDiff('profi')} />
                    <DiffButton label="Allround" active={config.difficulty === 'allround'} onClick={() => setDiff('allround')} />
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

function OpToggle({ label, active, locked, onClick }: { label: string, active: boolean, locked?: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            disabled={locked}
            className={`flex items-center justify-center p-2 rounded-md border border-white/5 transition-all duration-200 relative
                ${active ? 'bg-green-500 text-white ring-1 ring-green-500 ring-offset-1 ring-offset-[#0b1120] shadow-sm' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}
                ${locked ? 'opacity-80 cursor-not-allowed' : ''}
            `}
        >
            <span className="font-bold text-base">{label}</span>
            {locked && (
                <div className="absolute -top-2 -right-2 bg-[#0b1120] rounded-full p-0.5 border border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
            )}
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

// --- Stats Types ---

type StatCounts = { correct: number; wrong: number; skipped: number };

type SessionStats = {
    total: StatCounts;
    byDifficulty: Record<Difficulty, StatCounts>;
};

const initialStats: SessionStats = {
    total: { correct: 0, wrong: 0, skipped: 0 },
    byDifficulty: {
        normal: { correct: 0, wrong: 0, skipped: 0 },
        advanced: { correct: 0, wrong: 0, skipped: 0 },
        profi: { correct: 0, wrong: 0, skipped: 0 },
        allround: { correct: 0, wrong: 0, skipped: 0 }
    }
};

// --- Game Session ---

function GameSession({ config, onExit }: { config: Config, onExit: () => void }) {
    const [task, setTask] = useState<Task | null>(null);
    const [userTerm, setUserTerm] = useState<GameElement[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Stats
    const [stats, setStats] = useState<SessionStats>(JSON.parse(JSON.stringify(initialStats))); // Deep copy
    const [showStats, setShowStats] = useState(false);

    // Init first task
    useEffect(() => {
        nextTask();
    }, []);

    const updateStats = (type: 'correct' | 'wrong' | 'skipped') => {
        if (!task) return;
        const diff = task.currentDiff || config.difficulty;
        
        setStats(prev => {
            const next = { ...prev };
            // Copy to avoid mutation of nested objects if shallow copy
            next.total = { ...prev.total, [type]: prev.total[type] + 1 };
            next.byDifficulty = { ...prev.byDifficulty };
            next.byDifficulty[diff] = { ...prev.byDifficulty[diff], [type]: prev.byDifficulty[diff][type] + 1 };
            return next;
        });
    };

    const nextTask = () => {
        setIsFinished(false);
        setUserTerm([]);
        setErrorMsg(null);
        setTask(generateTask(config));
    };

    const skipTask = () => {
        updateStats('skipped');
        nextTask();
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
                     updateStats('correct');
                } else {
                    showError("Nutze alle Teile!");
                }
            } else {
                showError("Falsches Ergebnis");
                updateStats('wrong');
                setUserTerm([]); // Reset on error
            }
        } catch (e) {
            showError("Ungültige Rechnung");
            updateStats('wrong');
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

    const diffLabels: Record<Difficulty, string> = {
        normal: "Normal",
        advanced: "Fortgeschritten",
        profi: "Profi",
        allround: "Allround"
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-medium transition-all hover:scale-105 active:scale-95">
                    &larr; Beenden
                </button>
                
                <div className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Modus: <span className="text-primary">{diffLabels[task.currentDiff || config.difficulty]}</span>
                </div>

                <button onClick={skipTask} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all hover:scale-105 active:scale-95 text-sm">
                    Überspringen &rarr;
                </button>
            </div>

            {/* Stats Bar */}
            <div className="flex justify-center mt-16 mb-2 z-10">
                <button 
                    onClick={() => setShowStats(true)}
                    className="flex items-center gap-4 px-4 py-2 bg-[#0b1120]/80 backdrop-blur-md border border-white/10 rounded-full shadow-lg hover:bg-white/5 transition-all"
                >
                    <div className="flex items-center gap-2 text-green-400 font-bold" title="Gelöst">
                        <span className="text-xs">✔</span> {stats.total.correct}
                    </div>
                    <div className="w-px h-4 bg-white/10"></div>
                    <div className="flex items-center gap-2 text-red-400 font-bold" title="Falsch">
                        <span className="text-xs">✖</span> {stats.total.wrong}
                    </div>
                    <div className="w-px h-4 bg-white/10"></div>
                    <div className="flex items-center gap-2 text-yellow-400 font-bold" title="Übersprungen">
                        <span className="text-xs">⏭</span> {stats.total.skipped}
                    </div>
                </button>
            </div>

            {/* Target */}
            <div className="text-center py-2 flex-shrink-0 mt-2">
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Zielzahl</div>
                <div className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-tight">
                    {task.target}
                </div>
            </div>

            {/* Equation Area */}
            <div className="flex-1 flex flex-col justify-center items-center py-1 min-h-[100px] mb-4">
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
                <div className="h-14 mt-6 w-full flex justify-center items-center relative mb-2">
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

            {/* Stats Modal */}
            {showStats && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button 
                            onClick={() => setShowStats(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>

                        <h3 className="text-xl font-bold mb-6 text-center">Statistik dieser Sitzung</h3>

                        <div className="grid grid-cols-4 gap-4 mb-2 text-sm font-medium text-muted-foreground border-b border-white/10 pb-2">
                            <div className="text-left">Stufe</div>
                            <div className="text-center text-green-400">Gelöst</div>
                            <div className="text-center text-red-400">Fehler</div>
                            <div className="text-center text-yellow-400">Skip</div>
                        </div>

                        {(['normal', 'advanced', 'profi'] as Difficulty[]).map(d => (
                            <div key={d} className="grid grid-cols-4 gap-4 py-3 border-b border-white/5 items-center">
                                <div className="text-sm font-medium capitalize">{diffLabels[d]}</div>
                                <div className="text-center font-bold text-green-400 bg-green-400/10 rounded py-1">{stats.byDifficulty[d].correct}</div>
                                <div className="text-center font-bold text-red-400 bg-red-400/10 rounded py-1">{stats.byDifficulty[d].wrong}</div>
                                <div className="text-center font-bold text-yellow-400 bg-yellow-400/10 rounded py-1">{stats.byDifficulty[d].skipped}</div>
                            </div>
                        ))}

                        <div className="grid grid-cols-4 gap-4 mt-4 pt-2 font-bold text-lg">
                            <div className="">Total</div>
                            <div className="text-center text-green-400">{stats.total.correct}</div>
                            <div className="text-center text-red-400">{stats.total.wrong}</div>
                            <div className="text-center text-yellow-400">{stats.total.skipped}</div>
                        </div>

                        <button 
                            onClick={() => setShowStats(false)}
                            className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            Schließen
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// --- Logic Helper ---

function generateTask(config: Config): Task {
    const { range, ops, difficulty } = config;
    let task: Task | null = null;
    let attempts = 0;
    let selectedDiff: Difficulty = difficulty;

    while (!task && attempts < 100) {
        attempts++;
        try { 
            if (difficulty === 'allround') {
                const r = Math.random();
                if (r < 0.5) { // 50% Normal
                    selectedDiff = 'normal';
                    // Even in allround (where brackets are locked on), we want variety between simple and bracket
                    task = createEquation(range, ops, 'normal');
                } else if (r < 0.8) { // 30% Advanced (0.5 to 0.8)
                    selectedDiff = 'advanced';
                    task = createEquation(range, ops, 'advanced');
                } else { // 20% Profi
                    selectedDiff = 'profi';
                    task = createEquation(range, ops, 'profi');
                }
            } else {
                selectedDiff = difficulty;
                task = createEquation(range, ops, difficulty); 
            }
        } catch (e) { 
            // retry
        }
    }
    // Fallback
    if (!task) return { target: 10, currentDiff: 'normal', elements: [{ type: 'number', val: 5, id: 'n1' }, { type: 'number', val: 2, id: 'n2' }, { type: 'op', val: '×', id: 'o1' }] };
    
    // 1. Shuffle completely to randomize order within types
    task.elements.sort(() => Math.random() - 0.5);

    // 2. Sort by type to group them (Numbers first, then Ops)
    task.elements.sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'number' ? -1 : 1;
    });
    
    task.currentDiff = selectedDiff;
    return task;
}

function createEquation(range: number, ops: OperatorState, diff: Difficulty): Task {
    const useBrackets = ops.brackets && Math.random() < 0.5; // 50% chance to use brackets if enabled
    
    switch (diff) {
        case 'normal':
            // Normal: 3 numbers. 
            // If brackets enabled: 50% chance for Bracket Equation, 50% Simple Linear
            return useBrackets ? createBracketEquationNormal(range, ops) : createSimpleEquation(range, ops, 3);
        case 'advanced':
            // Advanced: 4 numbers.
            // If brackets enabled: 50% chance for Bracket Equation, 50% Simple Linear
            return useBrackets ? createBracketEquationAdvanced(range, ops) : createSimpleEquation(range, ops, 4);
        case 'profi':
            // Profi: Always nested/complex brackets
            return createBracketEquationProfi(range, ops);
        default:
            return createSimpleEquation(range, ops, 3);
    }
}

// 1. Simple Linear Equation (e.g. A + B * C)
function createSimpleEquation(range: number, ops: OperatorState, numElements: number): Task {
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    
    if (lineOps.length === 0 && pointOps.length === 0) throw "No ops";
    
    let nums = [];
    let operators = [];

    // Ensure at least one line and one point op if possible (for mixed ops requirements)
    let requiredOps = [];
    // Only force mixed if we have enough slots
    if (numElements >= 3) {
        if (lineOps.length > 0) requiredOps.push(lineOps[Math.floor(Math.random() * lineOps.length)]);
        if (pointOps.length > 0) requiredOps.push(pointOps[Math.floor(Math.random() * pointOps.length)]);
    }

    const allAvailOps = [...lineOps, ...pointOps];
    if (allAvailOps.length === 0) throw "No ops available";

    while (requiredOps.length < numElements - 1) {
        requiredOps.push(allAvailOps[Math.floor(Math.random() * allAvailOps.length)]);
    }
    
    operators = requiredOps.sort(() => Math.random() - 0.5);

    const maxNum = range <= 20 ? 10 : (range <= 100 ? 15 : 50);
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
    if (res === 0) throw "Zero result"; // Optional, but usually better to avoid trivial 0

    const elements: GameElement[] = nums.map((n, i) => ({ type: 'number', val: n, id: 'n' + i }));
    operators.forEach((o, i) => elements.push({ type: 'op', val: o === '*' ? '×' : (o === '/' ? '÷' : o), id: 'o' + i }));

    return { target: res, elements };
}

// 2. Normal Bracket Equation: (A +/- B) * C  or similar
function createBracketEquationNormal(range: number, ops: OperatorState): Task {
    // Requires at least one line and one point op typically for this pattern
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');

    if (lineOps.length === 0 || pointOps.length === 0) return createSimpleEquation(range, ops, 3);

    const opLine = lineOps[Math.floor(Math.random() * lineOps.length)];
    const opPoint = pointOps[Math.floor(Math.random() * pointOps.length)];

    const maxNum = range <= 20 ? 10 : (range <= 100 ? 12 : 30);
    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * maxNum) + 1;

    let c;
    let innerRes = (opLine === '+') ? a + b : a - b;
    // Avoid 0 or negative inner if possible for simplicity, though negative is fine if students know it. 
    // Assuming positive integers mostly:
    if (innerRes <= 0) throw "Negative inner";

    if (opPoint === '*') {
        c = Math.floor(Math.random() * 8) + 2;
    } else {
        // Division: find factor
        const factors = [];
        for (let i = 2; i < innerRes; i++) if (innerRes % i === 0) factors.push(i);
        if (factors.length === 0) c = 1; else c = factors[Math.floor(Math.random() * factors.length)];
    }

    // Pattern: (a opLine b) opPoint c
    // Or: c opPoint (a opLine b)
    const isPost = Math.random() < 0.5;
    
    let target;
    let str;
    if (isPost) {
        str = `(${a} ${opLine} ${b}) ${opPoint} ${c}`;
    } else {
        str = `${c} ${opPoint} (${a} ${opLine} ${b})`;
    }
    
    // eslint-disable-next-line no-eval
    target = eval(str);
    if (target > range || target < 0 || !Number.isInteger(target)) throw "Invalid result";

    const elements: GameElement[] = [
        { type: 'number', val: a, id: 'n1' },
        { type: 'number', val: b, id: 'n2' },
        { type: 'number', val: c, id: 'n3' },
        { type: 'op', val: opLine, id: 'o1' },
        { type: 'op', val: opPoint === '*' ? '×' : '÷', id: 'o2' },
        { type: 'op', val: '(', id: 'b1' },
        { type: 'op', val: ')', id: 'b2' }
    ];

    return { target, elements };
}

// 3. Advanced Bracket Equation: 4 numbers. e.g. (A + B) * C - D
function createBracketEquationAdvanced(range: number, ops: OperatorState): Task {
    // Similar to Normal but adds a 4th number linear operation
    const baseTask = createBracketEquationNormal(range, ops); // (A op B) op C
    // baseTask has 3 nums, 2 ops, 2 brackets.
    // We add one op and one num.
    
    const allOps = []; 
    if (ops.plus) allOps.push('+'); if (ops.minus) allOps.push('-');
    if (ops.mult) allOps.push('*'); if (ops.div) allOps.push('/');
    if (allOps.length === 0) throw "No ops";

    const newOp = allOps[Math.floor(Math.random() * allOps.length)];
    const d = Math.floor(Math.random() * (range <= 20 ? 5 : 20)) + 1;

    // Pattern: [Block] op d   OR   d op [Block]
    // Block is the target of baseTask
    const blockVal = baseTask.target;
    
    let total;
    let str;
    const isPost = Math.random() < 0.5;

    if (isPost) {
        str = `${blockVal} ${newOp} ${d}`;
    } else {
        str = `${d} ${newOp} ${blockVal}`;
    }
    
    // eslint-disable-next-line no-eval
    total = eval(str);

    if (total > range || total < 0 || !Number.isInteger(total)) throw "Invalid result";

    // Add elements
    const elements = [...baseTask.elements];
    elements.push({ type: 'number', val: d, id: 'n4' });
    elements.push({ type: 'op', val: newOp === '*' ? '×' : (newOp === '/' ? '÷' : newOp), id: 'o3' });

    return { target: total, elements };
}

// 4. Profi Bracket Equation: Nested or Double Brackets
// Patterns: ((A op B) op C) op D   OR   (A op B) op (C op D)
function createBracketEquationProfi(range: number, ops: OperatorState): Task {
    const pattern = Math.random() < 0.5 ? 'nested' : 'double';
    
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    // Profi needs variety
    const availOps = [...lineOps, ...pointOps];
    if (availOps.length < 2) throw "Not enough ops for profi";

    const maxNum = range <= 20 ? 8 : (range <= 100 ? 12 : 25);
    const randNum = () => Math.floor(Math.random() * maxNum) + 1;
    const randOp = () => availOps[Math.floor(Math.random() * availOps.length)];

    let str = "";
    let elements: GameElement[] = [];

    if (pattern === 'double') {
        // (A op1 B) op2 (C op3 D)
        const a = randNum(), b = randNum(), c = randNum(), d = randNum();
        const op1 = randOp(), op2 = randOp(), op3 = randOp();
        
        // Ensure inner parts are valid (positive)
        // eslint-disable-next-line no-eval
        if (eval(`${a} ${op1} ${b}`) < 0) throw "Neg inner";
        // eslint-disable-next-line no-eval
        if (eval(`${c} ${op3} ${d}`) < 0) throw "Neg inner";

        str = `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`;
        
        elements = [
            { type: 'number', val: a, id: 'n1' }, { type: 'number', val: b, id: 'n2' },
            { type: 'number', val: c, id: 'n3' }, { type: 'number', val: d, id: 'n4' },
            { type: 'op', val: op1 === '*' ? '×' : (op1 === '/' ? '÷' : op1), id: 'o1' },
            { type: 'op', val: op2 === '*' ? '×' : (op2 === '/' ? '÷' : op2), id: 'o2' },
            { type: 'op', val: op3 === '*' ? '×' : (op3 === '/' ? '÷' : op3), id: 'o3' },
            { type: 'op', val: '(', id: 'b1' }, { type: 'op', val: ')', id: 'b2' },
            { type: 'op', val: '(', id: 'b3' }, { type: 'op', val: ')', id: 'b4' }
        ];

    } else {
        // Nested: ((A op1 B) op2 C) op3 D  (simplest nested form)
        // Or A op1 (B op2 (C op3 D)) ?
        // Let's do ((A op1 B) op2 C) op3 D
        const a = randNum(), b = randNum(), c = randNum(), d = randNum();
        const op1 = randOp(), op2 = randOp(), op3 = randOp();

        str = `((${a} ${op1} ${b}) ${op2} ${c}) ${op3} ${d}`;

        elements = [
            { type: 'number', val: a, id: 'n1' }, { type: 'number', val: b, id: 'n2' },
            { type: 'number', val: c, id: 'n3' }, { type: 'number', val: d, id: 'n4' },
            { type: 'op', val: op1 === '*' ? '×' : (op1 === '/' ? '÷' : op1), id: 'o1' },
            { type: 'op', val: op2 === '*' ? '×' : (op2 === '/' ? '÷' : op2), id: 'o2' },
            { type: 'op', val: op3 === '*' ? '×' : (op3 === '/' ? '÷' : op3), id: 'o3' },
            { type: 'op', val: '(', id: 'b1' }, { type: 'op', val: ')', id: 'b2' },
            { type: 'op', val: '(', id: 'b3' }, { type: 'op', val: ')', id: 'b4' }
        ];
    }

    // eslint-disable-next-line no-eval
    const res = eval(str);
    if (!Number.isInteger(res) || res < 0 || res > range) throw "Invalid result";

    return { target: res, elements };
}
