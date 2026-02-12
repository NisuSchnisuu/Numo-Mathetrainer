import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateTerm } from './termGenerator';

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
    type: 'number' | 'op' | 'separator';
    val: string | number;
    id: string;
}

interface Task {
    target: number;
    elements: GameElement[];
    currentDiff?: Difficulty;
    topLevelOp?: string;
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

    const removeFromTerm = (index: number) => {
        if (isFinished) return;
        setUserTerm(prev => prev.filter((_, i) => i !== index));
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
                // Check if all elements are used (ignoring separators)
                const requiredCount = task.elements.filter(e => e.type !== 'separator').length;

                if (userTerm.length === requiredCount) {
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
    // const allUsed = userTerm.length === task.elements.length;

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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-center items-center w-full relative min-h-0 overflow-y-auto px-4">

                {/* Equation Container */}
                <div className="bg-neutral-950 p-6 pr-32 rounded-2xl border border-white/10 shadow-inner flex flex-wrap items-center justify-center gap-3 min-h-[10rem] transition-colors relative w-full max-w-4xl mb-8">

                    {userTerm.length === 0 && <span className="text-white/20 italic text-lg select-none">Rechnung hier bauen...</span>}

                    {userTerm.map((el, i) => (
                        <div
                            key={`${el.id}-${i}`}
                            onClick={() => removeFromTerm(i)}
                            className={`px-4 py-2 rounded-xl text-xl sm:text-2xl font-mono border shadow-lg transition-all flex items-center justify-center cursor-pointer hover:bg-red-500/20 hover:border-red-500 group relative select-none
                                ${el.type === 'number'
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-100'
                                    : 'bg-neutral-800 border-white/10 text-white'}`}
                        >
                            {el.val}
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </div>
                        </div>
                    ))}

                    {/* Target Display Pinned Right */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-2 bg-neutral-900/80 backdrop-blur rounded-xl border border-white/10 text-2xl sm:text-3xl font-mono text-purple-400 font-bold select-none shadow-lg">
                        = {task.target}
                    </div>

                    <button onClick={backspace} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" title="Letztes löschen">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                </div>

                {/* Check Button */}
                <div className="h-14 mt-2 w-full flex justify-center items-center relative mb-6">
                    <button
                        onClick={checkSolution}
                        disabled={userTerm.length === 0}
                        className={`text-base font-bold px-10 py-4 rounded-xl shadow-lg transition-all 
                            ${errorMsg ? 'bg-red-500 animate-shake shadow-red-500/20 text-white' : 'bg-primary shadow-primary/20 text-primary-foreground'}
                            ${userTerm.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : 'hover:scale-105 active:scale-95'}`}
                    >
                        {errorMsg ? 'Falsch ❌' : 'Überprüfen'}
                    </button>
                    {errorMsg && (
                        <div className="absolute top-16 w-full text-center pointer-events-none z-10">
                            <span className="text-red-400 font-bold bg-[#0b1120] border border-red-500/30 px-4 py-2 rounded-lg shadow-xl animate-fade-in my-2 inline-block">{errorMsg}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pool */}
            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 flex flex-wrap justify-center gap-3 shadow-inner min-h-[100px] mb-4 flex-shrink-0 w-full max-w-4xl mx-auto">
                {task.elements.map((el, idx) => {
                    if (el.type === 'separator') {
                        return <div key={`sep-${idx}`} className="w-px h-10 bg-white/10 mx-2 self-center" />;
                    }

                    const isUsed = usedIds.has(el.id);
                    const isNum = el.type === 'number';

                    let colorClass = 'bg-neutral-800 border-white/10 text-white hover:bg-neutral-700 hover:border-white/30';
                    if (isNum) {
                        colorClass = 'bg-blue-600/20 border-blue-500 text-blue-100 hover:bg-blue-600/30';
                    }

                    if (isUsed) {
                        return (
                            <div key={el.id} className="h-14 sm:h-16 min-w-[3.5rem] w-auto px-4 rounded-xl text-xl sm:text-2xl font-mono border flex items-center justify-center bg-neutral-900 text-neutral-700 border-neutral-800 cursor-not-allowed opacity-50 scale-95 select-none">
                                {el.val}
                            </div>
                        );
                    }

                    return (
                        <button
                            key={el.id}
                            onClick={() => addToTerm(el)}
                            className={`h-14 sm:h-16 min-w-[3.5rem] w-auto px-4 rounded-xl text-xl sm:text-2xl font-mono border shadow-lg transition-all flex items-center justify-center whitespace-nowrap active:scale-95 hover:shadow-xl hover:-translate-y-0.5 ${colorClass}`}
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
    let task: Task | null = null;
    let attempts = 0;
    // let selectedDiff: Difficulty = difficulty;

    while (!task && attempts < 100) {
        attempts++;
        try {
            const result = generateTerm(range, ops, difficulty);

            let candidateTask: Task | null = {
                target: result.task.target,
                elements: result.task.elements,
                topLevelOp: result.task.topLevelOp,
                currentDiff: result.activeDiff
            };

            // selectedDiff = result.activeDiff; // removed unused assignment

            // --- Variety Check ---
            if (candidateTask) {
                const usedOps = candidateTask.elements
                    .filter(e => e.type === 'op' && ['+', '-', '×', '÷', '*', '/'].includes(String(e.val)))
                    .map(e => String(e.val));

                // Count available specific ops to see if variety is even possible
                let contentOpsCount = 0;
                if (ops.plus) contentOpsCount++;
                if (ops.minus) contentOpsCount++;
                if (ops.mult) contentOpsCount++;
                if (ops.div) contentOpsCount++;

                // If result has >= 2 operators, and we have > 1 operator type available,
                // we reject "all same" results to encourage variety.
                if (usedOps.length >= 2 && contentOpsCount > 1) {
                    const firstOp = usedOps[0];
                    const allSame = usedOps.every(op => op === firstOp);

                    if (allSame) {
                        // Reject and retry
                        candidateTask = null;
                    }
                }
            }

            if (candidateTask) {
                task = candidateTask;
            }

        } catch (e) {
            // retry
        }
    }
    // Fallback
    if (!task) return { target: 10, currentDiff: 'normal', elements: [{ type: 'number', val: 5, id: 'n1' }, { type: 'number', val: 2, id: 'n2' }, { type: 'op', val: '×', id: 'o1' }] };

    // Grouping and Sorting
    const numbers = task.elements.filter(e => e.type === 'number').sort(() => Math.random() - 0.5);
    const brackets = task.elements.filter(e => e.type === 'op' && ['(', ')'].includes(String(e.val))).sort((a, b) => String(a.val).localeCompare(String(b.val)));
    const opElements = task.elements.filter(e => e.type === 'op' && !['(', ')'].includes(String(e.val))).sort(() => Math.random() - 0.5);

    const grouped: GameElement[] = [];
    if (numbers.length > 0) grouped.push(...numbers, { type: 'separator', val: '|', id: 'sep1' });
    if (opElements.length > 0) grouped.push(...opElements, { type: 'separator', val: '|', id: 'sep2' });
    if (brackets.length > 0) grouped.push(...brackets, { type: 'separator', val: '|', id: 'sep3' });

    // Remove trailing separator
    if (grouped.length > 0 && grouped[grouped.length - 1].type === 'separator') grouped.pop();

    task.elements = grouped;
    return task;
}

