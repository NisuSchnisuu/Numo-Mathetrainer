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
    topLevelOp?: string;
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
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
        setTimeout(() => setErrorMsg(null), 1000);
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
                </div>
            </div>

            {/* Error Popup at the bottom of the screen */}
            {errorMsg && (
                <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[100] pointer-events-none px-4">
                    <div className="bg-red-600 text-white font-bold px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(220,38,38,0.3)] border-2 border-red-400 animate-shake flex items-center gap-4 scale-110">
                        <div className="bg-white/20 rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </div>
                        <span className="text-lg md:text-xl tracking-wide">{errorMsg}</span>
                    </div>
                </div>
            )}

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
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
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

    // Helper to check what kind of task we generated
    const getTaskType = (str: string): 'mixed' | 'pure' => {
        const hasLine = str.includes('+') || str.includes('-');
        const hasPoint = str.includes('×') || str.includes('÷');
        return (hasLine && hasPoint) ? 'mixed' : 'pure';
    };

    const hasLine = ops.plus || ops.minus;
    const hasPoint = ops.mult || ops.div;
    const canMix = hasLine && hasPoint;

    let task: Task | null = null;
    let attempts = 0;
    let selectedDiff: Difficulty = difficulty;

    // Determine target type (if mixing is possible)
    // 80% Mixed, 20% Pure
    let targetType: 'mixed' | 'pure' = 'pure';
    if (canMix) {
        targetType = Math.random() < 0.8 ? 'mixed' : 'pure';
    }

    while (!task && attempts < 50) {
        attempts++;
        try {
            // Prepare ops for this attempt
            let currentOps = { ...ops };

            if (canMix && targetType === 'pure') {
                // Force pure by disabling one set
                if (Math.random() < 0.5) {
                    // Force Line (disable point)
                    currentOps.mult = false; currentOps.div = false;
                } else {
                    // Force Point (disable line)
                    currentOps.plus = false; currentOps.minus = false;
                }
            }

            if (difficulty === 'allround') {
                const r = Math.random();
                if (r < 0.5) { // 50% Normal
                    selectedDiff = 'normal';
                    task = createEquation(range, currentOps, 'normal');
                } else if (r < 0.8) { // 30% Advanced (0.5 to 0.8)
                    selectedDiff = 'advanced';
                    task = createEquation(range, currentOps, 'advanced');
                } else { // 20% Profi
                    selectedDiff = 'profi';
                    task = createEquation(range, currentOps, 'profi');
                }
            } else {
                selectedDiff = difficulty;
                task = createEquation(range, currentOps, difficulty);
            }

            // Check if result matches targetType (only if we can mix)
            if (canMix && task) {
                const actualType = getTaskType(task.termString);
                // If we wanted mixed but got pure, reject (unless it's impossible to get mixed, e.g. very simple task)
                if (targetType === 'mixed' && actualType === 'pure') {
                    // Heuristic: If normal/advanced/profi, we should be able to mix.
                    // But if randomly selected ops were pure, we retry.
                    task = null;
                }
                // If we wanted pure, we already restricted ops, so it SHOULD be pure.
            }

        } catch (e) {
            // retry
            task = null;
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

    // We construct the equation by grouping terms (product/division chains) separated by line ops
    // This allows us to ensure every division results in an integer immediately.

    // Total numbers: numElements
    // We decide structure first: how many groups?
    // At least 1. Each group has >=1 numbers.
    // Separators are + or -.

    // If only point ops allowed: 1 group.
    // If only line ops allowed: numElements groups (each 1 number).

    let groups: { val: number, str: string, display: string }[] = [];

    let remainingNums = numElements;

    while (remainingNums > 0) {
        // Decide size of next group
        // If line ops avail: size can be anything from 1 to remaining
        // If NO line ops: size MUST be remaining
        let size = 1;
        if (lineOps.length > 0) {
            // Random size, bias towards 1 or 2
            size = Math.floor(Math.random() * Math.min(3, remainingNums)) + 1;
            // If it's the last one, take all
            if (remainingNums - size === 0) size = remainingNums;
        } else {
            size = remainingNums;
        }

        remainingNums -= size;

        // Generate group of 'size' numbers connected by point ops
        let groupStr = "";
        let groupDisplay = "";

        const minNum = range <= 20 ? 1 : (range <= 100 ? 4 : 10);
        const maxNum = range <= 20 ? 10 : (range <= 100 ? 25 : 50); // Slightly smaller for components

        // Init first num
        let currentVal = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        groupStr = "" + currentVal;
        groupDisplay = "" + currentVal;

        for (let k = 1; k < size; k++) {
            // Pick point op
            const op = pointOps[Math.floor(Math.random() * pointOps.length)];
            let nextNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

            if (op === '/') {
                // Ensure currentVal is multiple of nextNum
                // or adjust nextNum to be factor
                // Find factors of currentVal
                const factors = [];
                for (let f = 1; f <= currentVal; f++) if (currentVal % f === 0) factors.push(f);
                nextNum = factors[Math.floor(Math.random() * factors.length)];

                // Avoid divide by 1 too often if possible, but it is valid
            }

            // eslint-disable-next-line no-eval
            currentVal = eval(`${currentVal} ${op} ${nextNum}`);
            groupStr += ` ${op} ${nextNum}`;
            groupDisplay += ` ${formatOp(op)} ${nextNum}`;
        }

        groups.push({ val: currentVal, str: groupStr, display: groupDisplay });
    }

    // Now join groups with Line Ops
    let totalEval = groups[0].str;
    let totalDisplay = groups[0].display;
    let currentTotal = groups[0].val;

    for (let i = 1; i < groups.length; i++) {
        const op = lineOps[Math.floor(Math.random() * lineOps.length)];
        // Check for negative result prevention?
        // If op is -, check if currentTotal < groups[i].val
        // But in simple equations, intermediate negatives might be allowed or disallowed depending on rules.
        // User asked for "Ganze Zahlen" (Integers). Negatives are integers.
        // But usually for kids "Natural numbers" (Non-negative) is preferred.
        // Let's prevent negative intermediate if simple.

        if (op === '-' && currentTotal < groups[i].val) {
            // Swap logic is hard here because order matters for string.
            // Just change op to +?
            // Or only allow - if valid.
            if (ops.plus) {
                totalEval += ` + ${groups[i].str}`;
                totalDisplay += ` + ${groups[i].display}`;
                currentTotal += groups[i].val;
            } else {
                // Must subtract. Results in negative.
                // Re-generate or throw to retry?
                // Throwing is safer to restart cleanly.
                throw "Negative result in simple eq";
            }
        } else {
            totalEval += ` ${op} ${groups[i].str}`;
            totalDisplay += ` ${formatOp(op)} ${groups[i].display}`;
            // eslint-disable-next-line no-eval
            currentTotal = eval(`${currentTotal} ${op} ${groups[i].val}`);
        }
    }

    // Final checks
    if (!Number.isInteger(currentTotal)) throw "Non-integer final";
    if (currentTotal < 0 || currentTotal > range) throw "Range error";

    let topOp: string | undefined = undefined;
    if (groups.length > 1) topOp = '+';
    else if (numElements > 1) topOp = '*';

    return { target: currentTotal, termString: totalDisplay, topLevelOp: topOp };
}

// 2. Normal Bracket Equation: (A +/- B) * C  or similar
function createBracketEquationNormal(range: number, ops: OperatorState): Task {
    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');

    if (lineOps.length === 0 || pointOps.length === 0) return createSimpleEquation(range, ops, 3);

    const opLine = lineOps[Math.floor(Math.random() * lineOps.length)];
    const opPoint = pointOps[Math.floor(Math.random() * pointOps.length)];

    const minNum = range <= 20 ? 1 : (range <= 100 ? 3 : 10);
    const maxNum = range <= 20 ? 10 : (range <= 100 ? 25 : 40);

    // Generate inner part first (A +/- B)
    let a = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
    let b = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

    // Ensure A - B > 0 if minus
    if (opLine === '-' && a <= b) {
        a = b + Math.floor(Math.random() * 5) + 1;
    }

    const innerRes = (opLine === '+') ? a + b : a - b;
    let c;

    // Pattern: (A opLine B) opPoint C   OR   C opPoint (A opLine B)
    const isPost = Math.random() < 0.5;

    if (opPoint === '*') {
        c = Math.floor(Math.random() * (range <= 20 ? 4 : 8)) + 2;
    } else {
        // Division: ensure integer result
        if (isPost) {
            // (a +/- b) / c  -> c must be factor of innerRes
            const factors = [];
            for (let i = 2; i <= innerRes; i++) if (innerRes % i === 0) factors.push(i);
            if (factors.length === 0) { c = 1; } // Fallback
            else c = factors[Math.floor(Math.random() * factors.length)];
        } else {
            // c / (a +/- b) -> c must be multiple of innerRes
            const maxMult = Math.floor(range / innerRes);
            if (maxMult < 1) throw "Range too small for reverse div";
            const mult = Math.floor(Math.random() * Math.min(5, maxMult)) + 1;
            c = innerRes * mult;
        }
    }

    let evalStr;
    const opLineDisplay = formatOp(opLine);
    const opPointDisplay = formatOp(opPoint);

    // Optimize Parentheses
    // Inner: opLine (+/-), Outer: opPoint (*/:)
    // + vs * -> 1 < 2 -> Needs parens
    // So parens are theoretically always needed here unless rules change, but using helper is consistent.

    // If isPost: (A+B)*C. Left child.
    // If !isPost: C*(A+B). Right child.
    const parens = needsParens(opLine, opPoint, !isPost);

    const innerDisplay = `${a} ${opLineDisplay} ${b}`;
    // For normal bracket eq, typically we WANT explicit brackets as that's the point of the level.
    // But user asked to removed UNNECESSARY ones. (A+B)*C IS necessary.
    const wrappedInner = parens ? `(${innerDisplay})` : innerDisplay;

    /* Check manual override: If this level is specifically "Bracket Normal", 
       maybe we SHOULD enforce brackets? UseBrackets flag in createEquation enables this.
       If we generate A*B+C (no parens), it's a simple equation.
       But here opPoint is * and opLine is +. (A+B)*C IS necessary.
       So needsParens will return TRUE. Correct.
    */

    let displayStr;
    if (isPost) {
        evalStr = `(${a} ${opLine} ${b}) ${opPoint} ${c}`;
        displayStr = `${wrappedInner} ${opPointDisplay} ${c}`;
    } else {
        evalStr = `${c} ${opPoint} (${a} ${opLine} ${b})`;
        displayStr = `${c} ${opPointDisplay} ${wrappedInner}`;
    }

    // eslint-disable-next-line no-eval
    const target = eval(evalStr);
    if (target > range || target < 0 || !Number.isInteger(target)) throw "Invalid result";

    return { target, termString: displayStr, topLevelOp: opPoint };
}

// 3. Advanced Bracket Equation: 4 numbers. e.g. (A + B) * C - D
function createBracketEquationAdvanced(range: number, ops: OperatorState): Task {
    // Generate base: (A op B) op C
    const baseTask = createBracketEquationNormal(range, ops);

    const allOps = [];
    if (ops.plus) allOps.push('+'); if (ops.minus) allOps.push('-');
    if (ops.mult) allOps.push('*'); if (ops.div) allOps.push('/');
    if (allOps.length === 0) throw "No ops";

    const newOp = allOps[Math.floor(Math.random() * allOps.length)];
    let d = Math.floor(Math.random() * (range <= 20 ? 5 : (range <= 100 ? 25 : 50))) + 5;

    const blockVal = baseTask.target;
    let evalStr;
    let displayStr;

    const isPost = Math.random() < 0.5;

    // Handle Division Integrity
    if (newOp === '/') {
        if (isPost) {
            // blockVal / d -> d must be factor of blockVal
            const factors = [];
            for (let i = 2; i <= blockVal; i++) if (blockVal % i === 0) factors.push(i);
            if (factors.length === 0) {
                // If prime or 1, fallback to multiplication or addition
                if (ops.mult) { /* retry as mult */ return createBracketEquationAdvanced(range, { ...ops, div: false }); }
                if (ops.plus) { /* retry as plus */ return createBracketEquationAdvanced(range, { ...ops, div: false }); }
                d = 1;
            } else {
                d = factors[Math.floor(Math.random() * factors.length)];
            }
        } else {
            // d / blockVal -> d must be multiple
            if (blockVal === 0) throw "Div by zero";
            const maxMult = Math.floor(range / blockVal);
            if (maxMult < 1) throw "Range too small";
            d = blockVal * (Math.floor(Math.random() * Math.min(5, maxMult)) + 1);
        }
    } else if (newOp === '-') {
        // Prevent negative result if strict
        if (isPost && blockVal < d) {
            // Swap if blockVal is smaller? No, just pick smaller d
            d = Math.floor(Math.random() * blockVal);
        } else if (!isPost && d < blockVal) {
            d = blockVal + Math.floor(Math.random() * 10) + 1;
        }
    }

    if (isPost) {
        // baseTask op d
        // baseTask is LEFT child
        const parens = needsParens(baseTask.topLevelOp, newOp, false);
        const baseStr = parens ? `(${baseTask.termString})` : baseTask.termString;

        displayStr = `${baseStr} ${formatOp(newOp)} ${d}`;
        evalStr = `${blockVal} ${newOp} ${d}`;
    } else {
        // d op baseTask
        // baseTask is RIGHT child
        const parens = needsParens(baseTask.topLevelOp, newOp, true);
        const baseStr = parens ? `(${baseTask.termString})` : baseTask.termString;

        displayStr = `${d} ${formatOp(newOp)} ${baseStr}`;
        evalStr = `${d} ${newOp} ${blockVal}`;
    }

    // eslint-disable-next-line no-eval
    const total = eval(evalStr);

    if (total > range || total < 0 || !Number.isInteger(total)) throw "Invalid result";

    return { target: total, termString: displayStr, topLevelOp: newOp };
}

// 4. Profi: Patterns: ((A op B) op C) op D   OR   (A op B) op (C op D)
function createBracketEquationProfi(range: number, ops: OperatorState): Task {
    const pattern = Math.random() < 0.5 ? 'double' : 'nested';

    const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
    const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
    const availOps = [...lineOps, ...pointOps];
    if (availOps.length < 2) throw "Not enough ops";

    const randOp = () => availOps[Math.floor(Math.random() * availOps.length)];

    const minNum = range <= 20 ? 1 : (range <= 100 ? 3 : 5);
    const maxNum = range <= 20 ? 8 : (range <= 100 ? 15 : 30);
    const randNum = () => Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;

    // Helper to create a safe simple term (A op B) that results in integer > 0
    // Returns op so we can check if parens needed later
    const createSafeTerm = (): { str: string, val: number, display: string, op: string } => {
        let op = randOp();
        let a = randNum();
        let b = randNum();

        if (op === '/') {
            // Ensure a is multiple of b
            a = b * (Math.floor(Math.random() * 5) + 1);
        } else if (op === '-') {
            if (a < b) [a, b] = [b, a]; // Swap
        }

        // eslint-disable-next-line no-eval
        const val = eval(`${a} ${op} ${b}`);
        // NOTE: we return display WITHOUT parens. Parent adds them if needed.
        return {
            str: `(${a} ${op} ${b})`,
            val,
            display: `${a} ${formatOp(op)} ${b}`,
            op: op
        };
    };

    if (pattern === 'double') {
        // (A op1 B) op2 (C op3 D)
        // Create left part
        let left = createSafeTerm();
        // Create right part
        let right = createSafeTerm();

        let op2 = randOp();

        // Check middle op compatibility
        if (op2 === '/') {
            if (left.val === 0) throw "Zero left";
            const factors = [];
            for (let i = 1; i <= left.val; i++) if (left.val % i === 0) factors.push(i);

            // Force right val to be one of these factors
            const targetRight = factors[Math.floor(Math.random() * factors.length)];

            // Reverse construct right
            let op3 = randOp();
            let c, d;
            if (op3 === '+') {
                c = Math.floor(Math.random() * (targetRight - 1)) + 1;
                d = targetRight - c;
            } else if (op3 === '-') {
                d = Math.floor(Math.random() * 10) + 1;
                c = targetRight + d;
            } else if (op3 === '*') {
                const tFactors = [];
                for (let i = 1; i <= targetRight; i++) if (targetRight % i === 0) tFactors.push(i);
                c = tFactors[Math.floor(Math.random() * tFactors.length)];
                d = targetRight / c;
            } else { // /
                d = Math.floor(Math.random() * 5) + 1;
                c = targetRight * d;
            }
            if (c <= 0 || d <= 0) throw "Invalid generation";

            right = {
                str: `(${c} ${op3} ${d})`,
                val: targetRight,
                display: `${c} ${formatOp(op3)} ${d}`,
                op: op3
            };
        } else if (op2 === '-') {
            if (left.val < right.val) [left, right] = [right, left];
        }

        // eslint-disable-next-line no-eval
        const res = eval(`${left.val} ${op2} ${right.val}`);
        if (!Number.isInteger(res) || res < 0 || res > range) throw "Invalid result";

        // Optimization check
        const pLeft = needsParens(left.op, op2, false);
        const pRight = needsParens(right.op, op2, true);

        const leftStr = pLeft ? `(${left.display})` : left.display;
        const rightStr = pRight ? `(${right.display})` : right.display;

        return {
            target: res,
            termString: `${leftStr} ${formatOp(op2)} ${rightStr}`,
            topLevelOp: op2
        };

    } else {
        // Nested: ((A op1 B) op2 C) op3 D
        // Step 1: (A op1 B)
        let t1 = createSafeTerm(); // result t1.val

        // Step 2: t1.val op2 C
        let op2 = randOp();
        let c = randNum();

        if (op2 === '/') {
            const factors = [];
            for (let i = 1; i <= t1.val; i++) if (t1.val % i === 0) factors.push(i);
            c = factors[Math.floor(Math.random() * factors.length)];
        } else if (op2 === '-') {
            if (t1.val < c) c = Math.floor(Math.random() * t1.val); // Reduce c
        }

        // eslint-disable-next-line no-eval
        let res2 = eval(`${t1.val} ${op2} ${c}`);

        const p1 = needsParens(t1.op, op2, false);
        const t1Str = p1 ? `(${t1.display})` : t1.display;
        let t2Display = `${t1Str} ${formatOp(op2)} ${c}`;

        // Step 3: res2 op3 D
        let op3 = randOp();
        let d = randNum();

        if (op3 === '/') {
            if (res2 === 0) throw "Zero div";
            const factors = [];
            for (let i = 1; i <= res2; i++) if (res2 % i === 0) factors.push(i);
            if (factors.length === 0) throw "No factors";
            d = factors[Math.floor(Math.random() * factors.length)];
        } else if (op3 === '-') {
            if (res2 < d) d = Math.floor(Math.random() * res2);
        }

        // eslint-disable-next-line no-eval
        const finalRes = eval(`${res2} ${op3} ${d}`);
        if (!Number.isInteger(finalRes) || finalRes < 0 || finalRes > range) throw "Invalid result";

        // t2Display is LEFT child of op3.
        const p2 = needsParens(op2, op3, false);
        const t2Str = p2 ? `(${t2Display})` : t2Display;

        return {
            target: finalRes,
            termString: `${t2Str} ${formatOp(op3)} ${d}`,
            topLevelOp: op3
        };
    }
}

function getPrecedence(op: string | undefined): number {
    if (op === '*' || op === '/' || op === '×' || op === '÷') return 2;
    if (op === '+' || op === '-') return 1;
    return 0; // For undefined or other ops, lowest precedence
}

function needsParens(innerOp: string | undefined, outerOp: string, isRight: boolean): boolean {
    if (!innerOp) return false; // No inner operator, so no inner expression to parenthesize
    const pInner = getPrecedence(innerOp);
    const pOuter = getPrecedence(outerOp);

    if (pInner < pOuter) return true; // Inner op has lower precedence, always needs parens
    if (pInner > pOuter) return false; // Inner op has higher precedence, never needs parens

    // Equal precedence
    if (isRight) {
        // If it's the right operand and the outer operator is non-associative (like - or /),
        // or if it's right-associative (which we don't have here for these ops), it needs parens.
        // For left-associative ops like + and *, right child needs parens if outer is - or /
        if (outerOp === '-' || outerOp === '/' || outerOp === '÷') return true;
        return false; // For + and *, right child doesn't need parens
    }
    return false; // Left child with equal precedence never needs parens (due to left-associativity)
}