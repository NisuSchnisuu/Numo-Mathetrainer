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

interface Task {
    target: number;
    termString: string;
    currentDiff?: Difficulty;
}

interface TermBerechnenProps {
    onBack: () => void;
}

export function TermBerechnen({ onBack }: TermBerechnenProps) {
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
    const [shakeKey, setShakeKey] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const toggleOp = (key: keyof OperatorState) => {
        if (config.difficulty === 'allround') return; // Locked
        if (config.difficulty === 'profi' && key === 'brackets') return; // Locked
        
        const isTurningOff = config.ops[key];
        
        if (isTurningOff) {
            // Check if this would violate the rules
            const nextOps = { ...config.ops, [key]: false };
            const hasLine = nextOps.plus || nextOps.minus;
            const hasPoint = nextOps.mult || nextOps.div;

            if (!hasLine || !hasPoint) {
                // Prevent change
                setShakeKey(key);
                setToastMsg("Mindestens eine Strich- (+/-) und Punktrechnung (×/÷) nötig!");
                setTimeout(() => setShakeKey(null), 500);
                setTimeout(() => setToastMsg(null), 3000);
                return;
            }
        }

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

    const isAllround = config.difficulty === 'allround';
    const isProfi = config.difficulty === 'profi';

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-card rounded-2xl p-8 animate-fade-in flex flex-col relative shadow-2xl border border-white/10 bg-[#0b1120]/80">
                <button onClick={onBack} className="absolute top-6 left-6 text-muted-foreground hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <h2 className="text-2xl font-bold mb-6 text-center text-white">Einstellungen</h2>
                <p className="text-center text-muted-foreground text-sm -mt-4 mb-8">Konfiguriere deine Übung</p>

                {/* Operators */}
                <div className="mb-6 space-y-3">
                    <div className="flex justify-between items-baseline">
                        <label className="text-sm font-semibold text-white">Rechenzeichen</label>
                        <span className="text-xs text-muted-foreground">Was soll vorkommen?</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        <OpToggle label="+" active={config.ops.plus} locked={isAllround} shake={shakeKey === 'plus'} onClick={() => toggleOp('plus')} />
                        <OpToggle label="-" active={config.ops.minus} locked={isAllround} shake={shakeKey === 'minus'} onClick={() => toggleOp('minus')} />
                        <OpToggle label="×" active={config.ops.mult} locked={isAllround} shake={shakeKey === 'mult'} onClick={() => toggleOp('mult')} />
                        <OpToggle label="÷" active={config.ops.div} locked={isAllround} shake={shakeKey === 'div'} onClick={() => toggleOp('div')} />
                        <OpToggle label="( )" active={config.ops.brackets} locked={isAllround || isProfi} shake={shakeKey === 'brackets'} onClick={() => toggleOp('brackets')} />
                    </div>
                </div>

                {/* Range */}
                <div className="mb-6 space-y-3">
                    <div className="flex justify-between items-baseline">
                        <label className="text-sm font-semibold text-white">Zahlenraum</label>
                        <span className="text-xs text-muted-foreground">Maximales Ergebnis</span>
                    </div>
                    <div className="relative">
                        <select 
                            value={config.range} 
                            onChange={(e) => setRange(parseInt(e.target.value))}
                            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <option value="20" className="bg-[#0b1120]">bis 20</option>
                            <option value="100" className="bg-[#0b1120]">bis 100</option>
                            <option value="1000" className="bg-[#0b1120]">bis 1'000</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>
                </div>

                {/* Difficulty */}
                <div className="mb-8 space-y-3">
                    <div className="flex justify-between items-baseline">
                        <label className="text-sm font-semibold text-white">Schwierigkeit</label>
                        <span className="text-xs text-muted-foreground">Komplexität</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <DiffButton label="Normal" sub="Einfache Terme" active={config.difficulty === 'normal'} onClick={() => setDiff('normal')} />
                        <DiffButton label="Fortgeschritten" sub="Längere Terme" active={config.difficulty === 'advanced'} onClick={() => setDiff('advanced')} />
                        <DiffButton label="Profi" sub="Verschachtelt" active={config.difficulty === 'profi'} onClick={() => setDiff('profi')} />
                        <DiffButton label="Allround" sub="Alles gemischt" active={config.difficulty === 'allround'} onClick={() => setDiff('allround')} />
                    </div>
                </div>

                <div className="mt-auto pt-4 relative">
                    <button 
                        onClick={onStart} 
                        className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-primary/20"
                    >
                        Übung starten
                    </button>
                    
                    {toastMsg && (
                        <div className="absolute -bottom-16 left-0 right-0 flex justify-center animate-fade-in z-20">
                            <div className="bg-red-500/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-red-400/50 backdrop-blur-sm">
                                {toastMsg}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function OpToggle({ label, active, locked, shake, onClick }: { label: string, active: boolean, locked?: boolean, shake?: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            disabled={locked}
            className={`flex items-center justify-center h-12 rounded-xl border transition-all duration-200 relative
                ${active ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20'}
                ${locked ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'}
                ${shake ? 'animate-shake ring-2 ring-red-500 border-red-500' : ''}
            `}
        >
            <span className="font-bold text-lg">{label}</span>
            {locked && (
                <div className="absolute -top-1.5 -right-1.5 bg-[#0b1120] rounded-full p-0.5 border border-white/20 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
            )}
        </button>
    );
}

function DiffButton({ label, sub, active, onClick }: { label: string, sub: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`px-3 py-3 rounded-xl border text-left transition-all duration-200 group relative overflow-hidden
                ${active ? 'bg-primary/10 border-primary/50 text-white ring-1 ring-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white'}`}
        >
            <div className="text-sm font-bold mb-0.5">{label}</div>
            <div className={`text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>{sub}</div>
            {active && <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>}
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
    const [input, setInput] = useState<string>("");
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
            next.total = { ...prev.total, [type]: prev.total[type] + 1 };
            next.byDifficulty = { ...prev.byDifficulty };
            next.byDifficulty[diff] = { ...prev.byDifficulty[diff], [type]: prev.byDifficulty[diff][type] + 1 };
            return next;
        });
    };

    const nextTask = () => {
        setIsFinished(false);
        setInput("");
        setErrorMsg(null);
        setTask(generateTask(config));
    };

    const skipTask = () => {
        updateStats('skipped');
        nextTask();
    };

    const handleInput = (val: string) => {
        if (isFinished) return;
        if (input.length > 5) return; // Limit length
        setInput(prev => prev + val);
        setErrorMsg(null);
    };

    const backspace = () => {
        if (isFinished) return;
        setInput(prev => prev.slice(0, -1));
        setErrorMsg(null);
    };

    const checkSolution = () => {
        if (!task) return;
        
        const userVal = parseInt(input);
        
        if (isNaN(userVal)) {
            showError("Bitte Zahl eingeben");
            return;
        }

        if (userVal === task.target) {
            setIsFinished(true);
            updateStats('correct');
        } else {
            showError("Leider falsch");
            updateStats('wrong');
            setInput(""); // Optional: reset input on wrong? Or let user correct it. User said "like TermBaumeister", there it resets userTerm. So reset here.
        }
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 2000);
    };

    if (!task) return <div>Loading...</div>;

    const diffLabels: Record<Difficulty, string> = {
        normal: "Normal",
        advanced: "Fortgeschritten",
        profi: "Profi",
        allround: "Allround"
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col h-full animate-fade-in relative pb-4 md:pb-8">
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center z-10 p-4">
                <button onClick={onExit} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium transition-colors">
                    &larr; Exit
                </button>
                
                <div className="flex items-center gap-2">
                    <div className="hidden md:block bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        {diffLabels[task.currentDiff || config.difficulty]}
                    </div>
                    
                    <button 
                        onClick={() => setShowStats(true)}
                        className="flex items-center gap-3 px-3 py-1.5 bg-[#0b1120]/80 backdrop-blur-md border border-white/10 rounded-full shadow-lg hover:bg-white/5 transition-all"
                    >
                        <div className="flex items-center gap-1.5 text-green-400 font-bold" title="Gelöst">
                            <span className="text-[10px]">✔</span> {stats.total.correct}
                        </div>
                        <div className="w-px h-3 bg-white/10"></div>
                        <div className="flex items-center gap-1.5 text-red-400 font-bold" title="Falsch">
                            <span className="text-[10px]">✖</span> {stats.total.wrong}
                        </div>
                    </button>
                </div>

                <button onClick={skipTask} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors">
                    Skip &rarr;
                </button>
            </div>

            {/* Content Area - Flex Grow to take available space, Center content vertically */}
            <div className="flex-1 flex flex-col justify-center items-center w-full relative min-h-0 overflow-y-auto">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 opacity-70">Berechne</div>
                
                {/* Combined Equation Row */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-6 px-2 w-full">
                    {/* Term */}
                    <div className="text-xl sm:text-2xl md:text-4xl font-bold text-white leading-relaxed px-4 py-3 bg-white/5 rounded-xl border border-white/10 shadow-sm">
                        {task.termString}
                    </div>

                    {/* Equals */}
                    <div className="text-xl sm:text-2xl md:text-4xl text-white/50 font-bold">=</div>

                    {/* Input Area */}
                    <div className={`w-24 h-12 sm:w-32 sm:h-14 md:w-40 md:h-16 bg-white/10 border-2 ${errorMsg ? 'border-red-500 animate-shake' : 'border-white/20'} rounded-xl flex items-center justify-center text-xl sm:text-2xl md:text-4xl font-bold text-white shadow-inner transition-colors`}>
                        {input || <span className="animate-pulse text-white/10">?</span>}
                    </div>
                </div>
                
                {/* Feedback/Check Button */}
                <div className="h-12 w-full flex justify-center items-center relative z-20 mb-2">
                    <button 
                        onClick={checkSolution} 
                        disabled={input.length === 0}
                        className={`text-sm md:text-base font-bold px-8 py-3 rounded-xl shadow-lg transition-all 
                            ${errorMsg ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'}
                            ${input.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400 shadow-none' : 'text-primary-foreground hover:scale-105 active:scale-95'}`}
                    >
                        {errorMsg ? 'Falsch ❌' : 'Überprüfen'}
                    </button>
                    {errorMsg && (
                        <div className="absolute top-14 w-full text-center pointer-events-none z-10">
                            <span className="text-red-400 font-bold bg-[#0b1120] border border-red-500/30 px-4 py-2 rounded-lg shadow-xl text-sm">{errorMsg}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Numpad - Fixed height, consistent */}
            <div className="flex justify-center flex-shrink-0 pt-2 px-2">
                <div className="grid grid-cols-3 gap-2 md:gap-3 p-2 bg-white/5 rounded-2xl border border-white/5">
                    {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                        <button 
                            key={n} 
                            onClick={() => handleInput(n.toString())}
                            className="w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xl md:text-2xl font-bold text-white transition-all active:bg-white/20 active:scale-95 shadow-sm"
                        >
                            {n}
                        </button>
                    ))}
                    <button 
                        onClick={() => setInput("")}
                        className="w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-lg md:text-xl font-bold text-red-400 transition-all active:scale-95"
                    >
                        C
                    </button>
                    <button 
                        onClick={() => handleInput("0")}
                        className="w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xl md:text-2xl font-bold text-white transition-all active:bg-white/20 active:scale-95"
                    >
                        0
                    </button>
                    <button 
                        onClick={backspace}
                        className="w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all flex items-center justify-center active:bg-white/20 active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                </div>
            </div>

            {/* Success Overlay */}
            {isFinished && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl animate-fade-in">
                    <h3 className="text-4xl font-bold text-green-400 mb-8">Richtig! 🎉</h3>
                    <div className="text-2xl text-white mb-8 bg-white/5 px-8 py-4 rounded-xl border border-white/10">
                        {task.termString} = <span className="font-bold text-green-400">{task.target}</span>
                    </div>
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
    if (!task) return { target: 10, currentDiff: 'normal', termString: "5 × 2" };
    
    task.currentDiff = selectedDiff;
    return task;
}

function createEquation(range: number, ops: OperatorState, diff: Difficulty): Task {
    const useBrackets = ops.brackets && Math.random() < 0.5; // 50% chance to use brackets if enabled
    
    switch (diff) {
        case 'normal':
            return useBrackets ? createBracketEquationNormal(range, ops) : createSimpleEquation(range, ops, 3);
        case 'advanced':
            return useBrackets ? createBracketEquationAdvanced(range, ops) : createSimpleEquation(range, ops, 4);
        case 'profi':
            return createBracketEquationProfi(range, ops);
        default:
            return createSimpleEquation(range, ops, 3);
    }
}

function formatOp(op: string): string {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op;
}

// 1. Simple Linear Equation (e.g. A + B * C)
function createSimpleEquation(range: number, ops: OperatorState, numElements: number): Task {
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    
    if (lineOps.length === 0 && pointOps.length === 0) throw "No ops";
    
    let nums = [];
    let operators = [];

    let requiredOps = [];
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

    let evalStr = "";
    let displayStr = "";
    for (let i = 0; i < nums.length; i++) {
        evalStr += nums[i];
        displayStr += nums[i];
        if (i < operators.length) {
            evalStr += " " + operators[i] + " ";
            displayStr += " " + formatOp(operators[i]) + " ";
        }
    }

    // eslint-disable-next-line no-eval
    const res = eval(evalStr);
    if (!Number.isInteger(res)) throw "Decimal";
    if (res < 0 || res > range) throw "Range";
    if (res === 0) throw "Zero result";

    return { target: res, termString: displayStr };
}

// 2. Normal Bracket Equation: (A +/- B) * C  or similar
function createBracketEquationNormal(range: number, ops: OperatorState): Task {
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
    if (innerRes <= 0) throw "Negative inner";

    if (opPoint === '*') {
        c = Math.floor(Math.random() * 8) + 2;
    } else {
        const factors = [];
        for (let i = 2; i < innerRes; i++) if (innerRes % i === 0) factors.push(i);
        if (factors.length === 0) c = 1; else c = factors[Math.floor(Math.random() * factors.length)];
    }

    const isPost = Math.random() < 0.5;
    
    let target;
    let evalStr;
    let displayStr;

    const opLineDisplay = formatOp(opLine);
    const opPointDisplay = formatOp(opPoint);

    if (isPost) {
        evalStr = `(${a} ${opLine} ${b}) ${opPoint} ${c}`;
        displayStr = `(${a} ${opLineDisplay} ${b}) ${opPointDisplay} ${c}`;
    } else {
        evalStr = `${c} ${opPoint} (${a} ${opLine} ${b})`;
        displayStr = `${c} ${opPointDisplay} (${a} ${opLineDisplay} ${b})`;
    }
    
    // eslint-disable-next-line no-eval
    target = eval(evalStr);
    if (target > range || target < 0 || !Number.isInteger(target)) throw "Invalid result";

    return { target, termString: displayStr };
}

// 3. Advanced Bracket Equation: 4 numbers. e.g. (A + B) * C - D
function createBracketEquationAdvanced(range: number, ops: OperatorState): Task {
    const baseTask = createBracketEquationNormal(range, ops); // (A op B) op C
    
    const allOps = []; 
    if (ops.plus) allOps.push('+'); if (ops.minus) allOps.push('-');
    if (ops.mult) allOps.push('*'); if (ops.div) allOps.push('/');
    if (allOps.length === 0) throw "No ops";

    const newOp = allOps[Math.floor(Math.random() * allOps.length)];
    const d = Math.floor(Math.random() * (range <= 20 ? 5 : 20)) + 1;

    let total;
    let evalStr;
    let displayStr;
    const isPost = Math.random() < 0.5;

    // Use baseTask termString but wrap in brackets if needed?
    // baseTask.termString is already "(A+B)*C" or "C*(A+B)".
    // If newOp is Point and base has Line outside brackets, we might need brackets.
    // BUT baseTask logic guarantees it's a solid block. 
    // Wait, createBracketEquationNormal returns e.g. "(3 + 2) * 4" = 20.
    // If we do 20 + 5 -> "(3 + 2) * 4 + 5". correct.
    // If we do 20 * 5 -> "(3 + 2) * 4 * 5". correct.
    // What if baseTask was "4 * (3 + 2)" ? Same.
    // So we can just append.

    // WAIT: normal bracket equation is (Line) Point or Point (Line).
    // Result is a number.
    // If we add another op, e.g. + D.
    // ((A+B)*C) + D.
    // Since * binds stronger than +, we don't need outer brackets for the base block usually.
    // BUT if newOp is * and base main op was + (not possible in Normal generator which mixes Line/Point).
    // Normal generator ALWAYS has a Point op as the "outer" op or "connector" op?
    // No: "(A+B) * C". Outer op is *.
    // "C * (A+B)". Outer op is *.
    // So base block is "Point-bound".
    // If newOp is +, -, *, / it should be fine without extra brackets around the base block 
    // UNLESS newOp is Point and base was Line-bound... but base is Point-bound.
    // Wait. If base is Point-bound, e.g. X * Y.
    // And newOp is *. X * Y * Z. Fine.
    // And newOp is +. X * Y + Z. Fine.
    // So we don't need extra brackets around baseTask.termString.

    if (isPost) {
        // Recalculate full string to be safe with eval? 
        // We don't have the raw numbers of base easily.
        // We can just take the result of base and operate on it for checking validity,
        // but for display we need the string.
        // Re-eval the combined string? Yes.
        
        // baseTask.termString has '×', '÷'. Need to revert for eval?
        // Or better: pass the raw string from baseTask?
        // I didn't save raw string in baseTask.
        // Let's rely on the blockVal for calculation logic check, but for the final eval check we should reconstruct.
        
        // Let's assume the string composition is safe:
        // displayStr = baseTask.termString + " " + formatOp(newOp) + " " + d;
        // But to verify, we need valid eval string.
        // Let's replace ×/÷ back to */.
        const baseEval = baseTask.termString.replace(/×/g, '*').replace(/÷/g, '/');
        evalStr = `${baseEval} ${newOp} ${d}`;
        displayStr = `${baseTask.termString} ${formatOp(newOp)} ${d}`;
    } else {
        const baseEval = baseTask.termString.replace(/×/g, '*').replace(/÷/g, '/');
        evalStr = `${d} ${newOp} ${baseEval}`;
        displayStr = `${d} ${formatOp(newOp)} ${baseTask.termString}`;
    }
    
    // eslint-disable-next-line no-eval
    total = eval(evalStr);

    if (total > range || total < 0 || !Number.isInteger(total)) throw "Invalid result";

    return { target: total, termString: displayStr };
}

// 4. Profi Bracket Equation
function createBracketEquationProfi(range: number, ops: OperatorState): Task {
    const pattern = Math.random() < 0.5 ? 'nested' : 'double';
    
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    const availOps = [...lineOps, ...pointOps];
    if (availOps.length < 2) throw "Not enough ops for profi";

    const maxNum = range <= 20 ? 8 : (range <= 100 ? 12 : 25);
    const randNum = () => Math.floor(Math.random() * maxNum) + 1;
    const randOp = () => availOps[Math.floor(Math.random() * availOps.length)];

    let evalStr = "";
    let displayStr = "";

    if (pattern === 'double') {
        // (A op1 B) op2 (C op3 D)
        const a = randNum(), b = randNum(), c = randNum(), d = randNum();
        const op1 = randOp(), op2 = randOp(), op3 = randOp();
        
        // eslint-disable-next-line no-eval
        if (eval(`${a} ${op1} ${b}`) < 0) throw "Neg inner";
        // eslint-disable-next-line no-eval
        if (eval(`${c} ${op3} ${d}`) < 0) throw "Neg inner";

        evalStr = `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`;
        displayStr = `(${a} ${formatOp(op1)} ${b}) ${formatOp(op2)} (${c} ${formatOp(op3)} ${d})`;

    } else {
        // Nested: ((A op1 B) op2 C) op3 D
        const a = randNum(), b = randNum(), c = randNum(), d = randNum();
        const op1 = randOp(), op2 = randOp(), op3 = randOp();

        evalStr = `((${a} ${op1} ${b}) ${op2} ${c}) ${op3} ${d}`;
        displayStr = `((${a} ${formatOp(op1)} ${b}) ${formatOp(op2)} ${c}) ${formatOp(op3)} ${d}`;
    }

    // eslint-disable-next-line no-eval
    const res = eval(evalStr);
    if (!Number.isInteger(res) || res < 0 || res > range) throw "Invalid result";

    return { target: res, termString: displayStr };
}
