import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

interface Task {
    numberSequence: string[];
    availableOperators: string[];
    targetValue: number;
    solutionExpression: string; // For reference (not shown to user)
    difficulty: Difficulty;
}

interface OperatorEinsetzenProps {
    onBack: () => void;
}

export function OperatorEinsetzen({ onBack }: OperatorEinsetzenProps) {
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
        }

        setConfig({ ...config, difficulty: d, ops: newOps });
    };

    const setRange = (r: number) => setConfig({ ...config, range: r });

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
                        <OpToggle label="+" active={config.ops.plus} shake={shakeKey === 'plus'} onClick={() => toggleOp('plus')} />
                        <OpToggle label="-" active={config.ops.minus} shake={shakeKey === 'minus'} onClick={() => toggleOp('minus')} />
                        <OpToggle label="×" active={config.ops.mult} shake={shakeKey === 'mult'} onClick={() => toggleOp('mult')} />
                        <OpToggle label="÷" active={config.ops.div} shake={shakeKey === 'div'} onClick={() => toggleOp('div')} />
                        <OpToggle label="( )" active={config.ops.brackets} locked={isProfi} shake={shakeKey === 'brackets'} onClick={() => toggleOp('brackets')} />
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
                    <div className="grid grid-cols-3 gap-3">
                        <DiffButton label="Normal" sub="3 Zahlen" active={config.difficulty === 'normal'} onClick={() => setDiff('normal')} />
                        <DiffButton label="Fortgeschritten" sub="4 Zahlen" active={config.difficulty === 'advanced'} onClick={() => setDiff('advanced')} />
                        <DiffButton label="Profi" sub="Mit Klammern" active={config.difficulty === 'profi'} onClick={() => setDiff('profi')} />
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

// --- Game Session ---

type StatCounts = { correct: number; wrong: number; skipped: number };

function GameSession({ config, onExit }: { config: Config, onExit: () => void }) {
    const [task, setTask] = useState<Task | null>(null);
    const [stats, setStats] = useState<StatCounts>({ correct: 0, wrong: 0, skipped: 0 });
    const [showStats, setShowStats] = useState(false);

    // Drag & Drop State
    const [placedItems, setPlacedItems] = useState<(string | null)[]>([]); // null = empty slot
    const [availableItems, setAvailableItems] = useState<string[]>([]);
    const [draggedItem, setDraggedItem] = useState<{ item: string, fromIndex: number | null } | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

    // Init first task
    useEffect(() => {
        nextTask();
    }, []);

    const nextTask = () => {
        const newTask = generateTask(config);
        setTask(newTask);
        // Initialize placedItems with null slots
        const numSlots = newTask.numberSequence.length + 1;
        setPlacedItems(new Array(numSlots).fill(null));

        // Group and Sort available items
        const rawItems = [...newTask.availableOperators];
        const isParen = (s: string) => ['(', ')'].includes(s);
        const parens = rawItems.filter(isParen).sort();
        const others = rawItems.filter(s => !isParen(s));

        // Shuffle others
        for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
        }

        const grouped: string[] = [];
        if (others.length > 0) grouped.push(...others, '|');
        if (parens.length > 0) grouped.push(...parens);

        if (grouped[grouped.length - 1] === '|') grouped.pop();

        setAvailableItems(grouped);
        setFeedback(null);
    };

    const skipTask = () => {
        setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        nextTask();
    };

    const handleCheck = () => {
        if (!task) return;

        // Build the expression from numbers and placed items
        const expression = buildExpression(task.numberSequence, placedItems);

        // Validate and evaluate
        const result = evaluateExpression(expression);

        if (result.error) {
            // Show error feedback
            setFeedback('incorrect');
            setTimeout(() => setFeedback(null), 2000);
            return;
        }

        if (result.value === task.targetValue) {
            setFeedback('correct');
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            setFeedback('incorrect');
            setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
        }
    };

    const handleDragStart = (item: string, fromIndex: number | null) => {
        setDraggedItem({ item, fromIndex });
    };

    const handleDrop = (toIndex: number) => {
        if (!draggedItem) return;

        const newPlaced = [...placedItems];
        const newAvailable = [...availableItems];

        // If dragging from available pool
        if (draggedItem.fromIndex === null) {
            // Add to placed
            newPlaced[toIndex] = draggedItem.item;
            // Remove from available
            const itemIdx = newAvailable.indexOf(draggedItem.item);
            if (itemIdx > -1) newAvailable.splice(itemIdx, 1);
        } else {
            // Moving from one slot to another
            newPlaced[draggedItem.fromIndex] = null;
            newPlaced[toIndex] = draggedItem.item;
        }

        setPlacedItems(newPlaced);
        setAvailableItems(newAvailable);
        setDraggedItem(null);
    };

    const handleRemove = (index: number) => {
        const item = placedItems[index];
        if (!item) return;

        const newPlaced = [...placedItems];
        const newAvailable = [...availableItems];

        newPlaced[index] = null;
        newAvailable.push(item);

        setPlacedItems(newPlaced);
        setAvailableItems(newAvailable);
    };

    if (!task) return <div>Loading...</div>;

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full animate-fade-in relative pb-4 md:pb-8">
            {/* Header */}
            <div className="flex justify-between items-center z-10 p-4">
                <button onClick={onExit} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium transition-colors">
                    &larr; Exit
                </button>

                <button
                    onClick={() => setShowStats(true)}
                    className="flex items-center gap-3 px-3 py-1.5 bg-[#0b1120]/80 backdrop-blur-md border border-white/10 rounded-full shadow-lg hover:bg-white/5 transition-all"
                >
                    <div className="flex items-center gap-1.5 text-green-400 font-bold" title="Gelöst">
                        <span className="text-[10px]">✔</span> {stats.correct}
                    </div>
                    <div className="w-px h-3 bg-white/10"></div>
                    <div className="flex items-center gap-1.5 text-red-400 font-bold" title="Falsch">
                        <span className="text-[10px]">✖</span> {stats.wrong}
                    </div>
                </button>

                <button onClick={skipTask} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors">
                    Skip &rarr;
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col justify-center items-center w-full relative min-h-0 overflow-y-auto px-4">

                {/* Equation Container */}
                <div className="bg-neutral-950 p-6 pr-32 rounded-2xl border border-white/10 shadow-inner flex flex-wrap items-center justify-center gap-3 min-h-[10rem] transition-colors relative w-full max-w-4xl mb-8">

                    <SequenceBuilder
                        numbers={task.numberSequence}
                        placedItems={placedItems}
                        onDrop={handleDrop}
                        onRemove={handleRemove}
                        onDragStart={handleDragStart}
                        bracketsEnabled={config.ops.brackets}
                        isDragging={!!draggedItem}
                    />

                    {/* Target Display Pinned Right */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-2 bg-neutral-900/80 backdrop-blur rounded-xl border border-white/10 text-2xl sm:text-3xl font-mono text-purple-400 font-bold select-none shadow-lg">
                        = {task.targetValue}
                    </div>
                </div>

                {/* Available Operators Pool */}
                <div className="mb-6 w-full max-w-2xl">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest text-center mb-4">Verfügbare Elemente (Ziehen zum Einfügen)</div>
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 flex flex-wrap justify-center gap-4 shadow-inner min-h-[100px]">
                        {availableItems.map((item, idx) => {
                            if (item === '|') {
                                return <div key={`sep-${idx}`} className="w-px h-10 bg-white/10 mx-2 self-center" />;
                            }
                            return (
                                <DraggableItem
                                    key={`${item}-${idx}`}
                                    item={item}
                                    onDragStart={() => handleDragStart(item, null)}
                                />
                            );
                        })}
                        {availableItems.filter(i => i !== '|').length === 0 && (
                            <div className="text-muted-foreground text-sm italic self-center">Alle Zeichen platziert</div>
                        )}
                    </div>
                </div>

                {/* Check Button */}
                <div className="mb-4">
                    <button
                        onClick={handleCheck}
                        className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="text-xl">↺</span> Zurücksetzen
                    </button>
                    {/* Note: The check logic happens automatically or via button? 
                        User previous code had a check button. 
                        Let's keep the Check button but style it better or maybe match runner's 'Submit' if exists?
                        Runner has auto-check or explicit submit. Here it's explicit check.
                    */}
                </div>
                <button
                    onClick={handleCheck}
                    className={`text-base font-bold px-10 py-4 rounded-xl shadow-lg transition-all 
                        ${feedback === 'correct' ? 'bg-green-500 shadow-green-500/20 text-white' :
                            feedback === 'incorrect' ? 'bg-red-500 shadow-red-500/20 text-white' :
                                'bg-primary shadow-primary/20 text-primary-foreground hover:scale-105 active:scale-95'}`}
                >
                    {feedback === 'correct' ? 'Richtig! ✓' : feedback === 'incorrect' ? 'Falsch ✗' : 'Überprüfen'}
                </button>
            </div>

            {/* Success Overlay */}
            {feedback === 'correct' && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl animate-fade-in">
                    <h3 className="text-4xl font-bold text-green-400 mb-8">Richtig! 🎉</h3>
                    <div className="text-xl text-white mb-8 bg-white/5 px-8 py-4 rounded-xl border border-white/10">
                        Ziel: <span className="font-bold text-green-400">{task.targetValue}</span>
                    </div>
                    <button onClick={nextTask} className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-green-900/20 hover:scale-105">
                        Nächste Aufgabe
                    </button>
                </div>
            )}

            {/* Stats Modal */}
            {showStats && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0b1120] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <button
                            onClick={() => setShowStats(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-bold mb-6 text-center">Statistik dieser Sitzung</h3>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400">{stats.correct}</div>
                                <div className="text-xs text-muted-foreground mt-1">Richtig</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-400">{stats.wrong}</div>
                                <div className="text-xs text-muted-foreground mt-1">Falsch</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400">{stats.skipped}</div>
                                <div className="text-xs text-muted-foreground mt-1">Übersprungen</div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowStats(false)}
                            className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors"
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

// --- UI Components ---

function SequenceBuilder({ numbers, placedItems, onDrop, onRemove, onDragStart, bracketsEnabled, isDragging }: {
    numbers: string[],
    placedItems: (string | null)[],
    onDrop: (index: number) => void,
    onRemove: (index: number) => void,
    onDragStart: (item: string, fromIndex: number) => void,
    bracketsEnabled: boolean,
    isDragging: boolean
}) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-1">
            {/* Drop zone before first number (Only if brackets enabled) */}
            {bracketsEnabled && (
                <DropZone index={0} item={placedItems[0]} onDrop={onDrop} onRemove={onRemove} onDragStart={onDragStart} isDragging={isDragging} />
            )}

            {numbers.map((num, idx) => (
                <div key={idx} className="flex items-center gap-1">
                    {/* Number - Fixed Style */}
                    <div className="px-4 py-2 rounded-xl text-xl sm:text-2xl font-mono border bg-neutral-800 border-white/10 text-white cursor-default shadow-lg z-10 relative">
                        {num}
                    </div>

                    {/* Drop zone AFTER this number */}
                    {(idx < numbers.length - 1 || bracketsEnabled) && (
                        <DropZone
                            index={idx + 1}
                            item={placedItems[idx + 1]}
                            onDrop={onDrop}
                            onRemove={onRemove}
                            onDragStart={onDragStart}
                            isDragging={isDragging}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function DropZone({ index, item, onDrop, onRemove, onDragStart, isDragging }: {
    index: number,
    item: string | null,
    onDrop: (index: number) => void,
    onRemove: (index: number) => void,
    onDragStart: (item: string, fromIndex: number) => void,
    isDragging: boolean
}) {
    const [isOver, setIsOver] = useState(false);

    // Occupied State
    if (item) {
        return (
            <div
                draggable
                onDragStart={(e) => {
                    e.stopPropagation();
                    onDragStart(item, index);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                }}
                className={`
                    px-4 py-3 rounded-xl min-w-[3.5rem] h-14 sm:h-16 flex items-center justify-center font-mono text-xl sm:text-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md animate-scale-in z-20 relative
                    bg-blue-600/20 border-2 border-blue-500 text-blue-100 hover:bg-red-500/20 hover:border-red-500 hover:text-red-100 group mx-1
                `}
            >
                {item === '*' ? '×' : item === '/' ? '÷' : item}
            </div>
        );
    }

    // Empty State (Drop Target) - Dynamic width adaptation
    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsOver(true);
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={() => {
                onDrop(index);
                setIsOver(false);
            }}
            className={`
                h-16 flex items-center justify-center transition-all duration-300 relative
                ${(isOver || isDragging) ? 'w-12' : 'w-6'}
            `}
        >
            {/* Extended Hit Area for Touch - Only active when dragging */}
            {isDragging && (
                <div
                    className="absolute -top-6 -bottom-24 -left-2 -right-2 z-0 bg-transparent"
                    title="Drop Here"
                />
            )}

            {/* Visual Indicator */}
            <div className={`
                w-1 h-12 rounded-full transition-all duration-200 pointer-events-none relative z-10
                ${isOver ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] scale-y-110' :
                    isDragging ? 'bg-blue-500/30 scale-y-75' : 'bg-transparent scale-y-50'}
            `} />
        </div>
    );
}

function DraggableItem({ item, onDragStart }: { item: string, onDragStart: () => void }) {
    const isNum = !isNaN(parseFloat(item)) && !['+', '-', '*', '/', '·', ':'].includes(item);

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={`
                px-4 py-3 rounded-xl border-2 text-xl font-mono transition-all select-none cursor-grab active:cursor-grabbing hover:shadow-md
                ${isNum
                    ? 'bg-blue-600/20 border-blue-500 text-blue-100 hover:bg-blue-600/30'
                    : 'bg-neutral-800 border-white/10 text-white hover:bg-neutral-700 hover:border-white/30'}
            `}
        >
            {item === '*' ? '×' : item === '/' ? '÷' : item}
        </div>
    );
}

// --- Task Generation Logic ---

function generateTask(config: Config): Task {
    const { range, ops, difficulty } = config;

    let attempts = 0;
    while (attempts < 50) {
        attempts++;
        try {
            // Generate a term using similar logic to TermBerechnen
            const term = createTerm(range, ops, difficulty);

            // Extract numbers from the expression
            const numbers = extractNumbers(term.expression);

            // Extract operators that were used
            const operators = extractOperators(term.expression);

            return {
                numberSequence: numbers,
                availableOperators: operators,
                targetValue: term.value,
                solutionExpression: term.expression, // For debugging
                difficulty
            };
        } catch (e) {
            // Retry on error
        }
    }

    // Fallback
    return {
        numberSequence: ['2', '3', '5'],
        availableOperators: ['+', '×'],
        targetValue: 11,
        solutionExpression: '2 + 3 × 5',
        difficulty: 'normal'
    };
}

function createTerm(range: number, ops: OperatorState, diff: Difficulty): { expression: string, value: number } {
    // Simplified version of TermBerechnen generation
    const lineOps: string[] = [];
    if (ops.plus) lineOps.push('+');
    if (ops.minus) lineOps.push('-');

    const pointOps: string[] = [];
    if (ops.mult) pointOps.push('*');
    if (ops.div) pointOps.push('/');

    const minNum = range <= 20 ? 1 : (range <= 100 ? 2 : 5);
    const maxNum = range <= 20 ? 10 : (range <= 100 ? 20 : 30);

    // Determine number count based on difficulty
    const numCount = diff === 'normal' ? 3 : diff === 'advanced' ? 4 : 3;

    // For profi, we might add brackets
    const useBrackets = diff === 'profi' && ops.brackets;

    if (useBrackets && lineOps.length > 0 && pointOps.length > 0) {
        // Generate bracket equation: (a ± b) * c or similar
        const a = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        const b = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        const lineOp = lineOps[Math.floor(Math.random() * lineOps.length)];

        let innerVal = lineOp === '+' ? a + b : (a > b ? a - b : b - a);
        const pointOp = pointOps[Math.floor(Math.random() * pointOps.length)];

        let c;
        if (pointOp === '*') {
            c = Math.floor(Math.random() * 5) + 2;
        } else {
            // Division - ensure integer result
            const factors = [];
            for (let i = 2; i <= innerVal; i++) if (innerVal % i === 0) factors.push(i);
            c = factors.length > 0 ? factors[Math.floor(Math.random() * factors.length)] : 1;
        }

        const finalVal = pointOp === '*' ? innerVal * c : innerVal / c;

        if (finalVal > 0 && finalVal <= range && Number.isInteger(finalVal)) {
            return {
                expression: `( ${a} ${lineOp} ${b} ) ${pointOp} ${c}`,
                value: finalVal
            };
        }
    }

    // Simple linear expression
    const numbers: number[] = [];
    const operators: string[] = [];

    for (let i = 0; i < numCount; i++) {
        numbers.push(Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum);
    }

    // Pick operators ensuring integer results
    let value = numbers[0];
    let expression = numbers[0].toString();

    for (let i = 1; i < numCount; i++) {
        let op;
        // Prefer non-division for simplicity
        if (pointOps.length > 0 && lineOps.length > 0) {
            op = Math.random() < 0.5 ?
                lineOps[Math.floor(Math.random() * lineOps.length)] :
                (Math.random() < 0.7 ? '*' : '/'); // Favor multiplication
        } else if (pointOps.length > 0) {
            op = pointOps[Math.floor(Math.random() * pointOps.length)];
        } else {
            op = lineOps[Math.floor(Math.random() * lineOps.length)];
        }

        // Adjust for division to ensure integer
        if (op === '/') {
            // Make numbers[i] a factor of current value
            const factors = [];
            for (let f = 2; f <= value; f++) if (value % f === 0) factors.push(f);
            if (factors.length > 0) {
                numbers[i] = factors[Math.floor(Math.random() * factors.length)];
            } else {
                op = '*'; // Fallback
            }
        }

        // Adjust for subtraction to avoid negatives
        if (op === '-' && value < numbers[i]) {
            if (ops.plus) op = '+';
            else continue;
        }

        operators.push(op);
        expression += ` ${op} ${numbers[i]}`;

        // Calculate
        // eslint-disable-next-line no-eval
        value = eval(expression);
    }

    // Validate result
    if (value > 0 && value <= range && Number.isInteger(value)) {
        return { expression, value };
    }

    throw new Error("Invalid term generated");
}

function extractNumbers(expression: string): string[] {
    // Remove parentheses and split by operators
    const cleaned = expression.replace(/[()]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(t => t.trim() !== '');

    return tokens.filter(t => !isNaN(Number(t)));
}

function extractOperators(expression: string): string[] {
    const operators: string[] = [];

    // Count operators used
    const tokens = expression.split(' ');
    for (const token of tokens) {
        if (['+', '-', '*', '/'].includes(token)) {
            let displayOp = token;
            if (token === '*') displayOp = '×';
            if (token === '/') displayOp = '÷';
            operators.push(displayOp);
        }
    }

    // Add brackets if present
    const openCount = (expression.match(/\(/g) || []).length;
    for (let i = 0; i < openCount; i++) {
        operators.push('(');
        operators.push(')');
    }

    return operators;
}

// --- Validation Logic ---

function buildExpression(numbers: string[], placedItems: (string | null)[]): string {
    let expression = '';

    for (let i = 0; i < placedItems.length; i++) {
        if (placedItems[i]) {
            expression += placedItems[i] + ' ';
        }
        if (i < numbers.length) {
            expression += numbers[i] + ' ';
        }
    }

    return expression.trim();
}

function evaluateExpression(expression: string): { value: number | null, error: string | null } {
    try {
        // Replace display operators with eval-friendly ones
        let cleaned = expression.replace(/×/g, '*').replace(/÷/g, '/');

        // Check for balanced parentheses
        const openCount = (cleaned.match(/\(/g) || []).length;
        const closeCount = (cleaned.match(/\)/g) || []).length;

        if (openCount !== closeCount) {
            return { value: null, error: 'Unbalanced parentheses' };
        }

        // Validate only contains numbers, operators, spaces, and parentheses
        if (!/^[\d\s+\-*/().]+$/.test(cleaned)) {
            return { value: null, error: 'Invalid characters' };
        }

        // Evaluate
        // eslint-disable-next-line no-eval
        const result = eval(cleaned);

        if (!Number.isFinite(result)) {
            return { value: null, error: 'Invalid result' };
        }

        return { value: result, error: null };
    } catch (e) {
        return { value: null, error: 'Evaluation error' };
    }
}
