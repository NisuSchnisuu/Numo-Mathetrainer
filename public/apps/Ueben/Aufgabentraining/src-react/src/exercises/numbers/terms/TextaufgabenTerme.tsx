import { useState, useEffect, useCallback } from 'react';
import { generateProblem, checkSolution } from './textProblemGenerator';
import type { ProblemInstance } from './textProblemGenerator';
import type { Difficulty } from './textProblemData';

interface GameElement {
  type: 'number' | 'op';
  val: string | number;
  id: string;
}

interface TextaufgabenTermeProps {
  onBack: () => void;
}

type ConfigDifficulty = Difficulty | 'mixed';

export function TextaufgabenTerme({ onBack }: TextaufgabenTermeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState<ConfigDifficulty>('normal');
  
  const [problem, setProblem] = useState<ProblemInstance | null>(null);
  const [userTerm, setUserTerm] = useState<GameElement[]>([]);
  const [userResult, setUserResult] = useState<string>('');
  const [isFinished, setIsFinished] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pool, setPool] = useState<GameElement[]>([]);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const nextTask = useCallback(() => {
    const p = generateProblem(difficulty);
    setProblem(p);
    setUserTerm([]);
    setUserResult('');
    setIsFinished(false);
    setErrorMsg(null);

    const elements: GameElement[] = [];
    p.ingredients.forEach((n, i) => {
      elements.push({ type: 'number', val: n, id: `n-${i}-${Date.now()}` });
    });
    ['+', '-', '·', '÷', '(', ')'].forEach((op, i) => {
      elements.push({ type: 'op', val: op, id: `op-${i}-${Date.now()}` });
    });
    setPool(elements);
  }, [difficulty]);

  useEffect(() => {
    if (isPlaying) nextTask();
  }, [isPlaying, nextTask]);

  const addToTerm = (el: GameElement) => {
    if (isFinished) return;
    if (el.type === 'number' && userTerm.find(u => u.id === el.id)) return;
    
    if (el.type === 'op') {
        const newOp = { ...el, id: `op-${Date.now()}-${Math.random()}` };
        setUserTerm([...userTerm, newOp]);
    } else {
        setUserTerm([...userTerm, el]);
    }
    setErrorMsg(null);
  };

  const removeFromTerm = (index: number) => {
    if (isFinished) return;
    setUserTerm(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  const backspace = () => {
    if (isFinished) return;
    setUserTerm(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const clearAll = () => {
    if (isFinished) return;
    setUserTerm([]);
    setErrorMsg(null);
  };

  const handleCheck = () => {
    if (!problem) return;
    const termStr = userTerm.map(e => e.val.toString()).join(' ');
    const numResult = parseFloat(userResult);

    if (isNaN(numResult)) {
        setErrorMsg('Bitte gib ein numerisches Ergebnis ein.');
        return;
    }

    const result = checkSolution(termStr, numResult, problem.target, problem.ingredients);

    if (result.isCorrect) {
      setIsFinished(true);
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setErrorMsg(result.message);
      setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  if (!isPlaying) {
    return (
        <div className="w-full h-full min-h-screen bg-[#020617] flex items-center justify-center p-4">
             <div className="w-full max-w-md glass-card rounded-3xl p-8 animate-in zoom-in-95 duration-300 flex flex-col relative shadow-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md">
                <button onClick={onBack} className="absolute top-6 left-6 text-muted-foreground hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h2 className="text-2xl font-bold mb-6 text-center text-white">Textaufgaben</h2>
                <p className="text-center text-muted-foreground text-sm -mt-4 mb-8">Wähle die Schwierigkeit</p>
                
                <div className="grid grid-cols-1 gap-3 mb-8">
                    <DiffButton label="Normal" sub="1 Operation" active={difficulty === 'normal'} onClick={() => setDifficulty('normal')} />
                    <DiffButton label="Fortgeschritten" sub="Klammern" active={difficulty === 'advanced'} onClick={() => setDifficulty('advanced')} />
                    <DiffButton label="Profi" sub="Verschachtelt" active={difficulty === 'profi'} onClick={() => setDifficulty('profi')} />
                    <DiffButton label="Gemischt" sub="Alle Stufen" active={difficulty === 'mixed'} onClick={() => setDifficulty('mixed')} />
                </div>

                <button
                    onClick={() => setIsPlaying(true)}
                    className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                    Übung starten
                </button>
            </div>
        </div>
    );
  }

  if (!problem) return null;

  const usedIds = new Set(userTerm.map(u => u.id));

  const diffLabels: Record<Difficulty, string> = {
    normal: 'Normal',
    advanced: 'Fortgeschritten',
    profi: 'Profi'
  };

  const diffColors: Record<Difficulty, string> = {
    normal: 'text-blue-400',
    advanced: 'text-orange-400',
    profi: 'text-purple-400'
  };

  return (
    <div className="w-full min-h-screen bg-[#020617] text-white flex flex-col relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header (Kompakter) */}
      <div className="px-4 py-2 flex justify-between items-center z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <button onClick={() => setIsPlaying(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
        <div className="flex gap-3">
            <div className="bg-green-500/10 border border-green-500/20 px-3 py-0.5 rounded-full text-green-400 font-bold text-xs">✔ {stats.correct}</div>
            <div className="bg-red-500/10 border border-red-500/20 px-3 py-0.5 rounded-full text-red-400 font-bold text-xs">✖ {stats.wrong}</div>
        </div>
        <button onClick={nextTask} className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20">Überspringen</button>
      </div>

      <main className="flex-1 flex flex-col items-center p-4 max-w-4xl mx-auto w-full z-10 space-y-4">
        
        {/* Problem Text (Kompakter) */}
        <div className="w-full glass-card border border-white/10 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] uppercase tracking-widest font-bold ${diffColors[problem.difficulty]}`}>
                    Stufe: {diffLabels[problem.difficulty]}
                </span>
            </div>
            <p className="text-lg md:text-xl font-medium leading-tight text-slate-100">{problem.text}</p>
        </div>

        {/* Drop Zone */}
        <div className="w-full min-h-[100px] bg-neutral-950/80 rounded-2xl border-2 border-dashed border-white/10 p-4 flex flex-wrap items-center justify-center gap-2 relative shadow-inner">
            {userTerm.length === 0 && <span className="text-xs text-slate-500 italic">Term hier bauen...</span>}
            {userTerm.map((el, i) => (
                <button key={`${el.id}-${i}`} onClick={() => removeFromTerm(i)} className={`px-3 py-1.5 rounded-lg text-lg font-mono font-bold border shadow-md transition-all hover:scale-105 active:scale-95 group relative ${el.type === 'number' ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-white/10 text-white'}`}>
                    {el.val}
                </button>
            ))}
        </div>

        {/* Edit Actions (Kompakter) */}
        <div className="w-full flex justify-center gap-4 -mt-2">
            <button 
                onClick={backspace} 
                disabled={userTerm.length === 0 || isFinished}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                Löschen
            </button>
            <button 
                onClick={clearAll} 
                disabled={userTerm.length === 0 || isFinished}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Alle entfernen
            </button>
        </div>

        {/* Answer Prompt & Input (Neu) */}
        <div className="w-full bg-slate-900/40 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="text-slate-300 font-medium">{problem.answerPrompt}</span>
            <input 
                type="number" 
                value={userResult} 
                onChange={(e) => setUserResult(e.target.value)}
                placeholder="Ergebnis"
                className="bg-neutral-950 border border-white/20 rounded-xl px-4 py-2 w-32 text-center text-xl font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
        </div>

        {/* Pool (Oberhalb des Buttons) */}
        <div className="w-full bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="flex flex-wrap justify-center gap-2 pb-2 border-b border-white/5">
                {pool.filter(e => e.type === 'number').map(el => {
                    const isUsed = usedIds.has(el.id);
                    return (
                        <button key={el.id} onClick={() => addToTerm(el)} disabled={isUsed || isFinished} className={`h-12 min-w-[3.5rem] px-4 rounded-xl text-xl font-mono font-bold border transition-all ${isUsed ? 'bg-slate-900/50 border-white/5 text-slate-700 opacity-30 cursor-not-allowed' : 'bg-blue-600/10 border-blue-500/30 text-blue-200 hover:bg-blue-600/20 active:scale-95'}`}>
                            {el.val}
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {pool.filter(e => e.type === 'op').map(el => (
                    <button key={el.id} onClick={() => addToTerm(el)} disabled={isFinished} className="h-10 min-w-[3rem] px-3 rounded-lg text-lg font-mono font-bold border border-white/10 bg-slate-800/50 text-white hover:bg-slate-700 active:scale-95 transition-all">
                        {el.val}
                    </button>
                ))}
            </div>
        </div>

        {/* Error & Check Button */}
        <div className="w-full flex flex-col items-center space-y-2">
            <div className="h-6">
                {errorMsg && <div className="text-red-400 text-xs font-bold animate-shake">{errorMsg}</div>}
            </div>
            <button
                onClick={handleCheck}
                disabled={userTerm.length === 0 || userResult === '' || isFinished}
                className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg shadow-xl transition-all active:scale-95 ${userTerm.length === 0 || userResult === '' ? 'bg-slate-800 text-slate-500 opacity-50' : isFinished ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:scale-[1.02]'}`}
            >
                {isFinished ? 'Richtig! 🎉' : 'Überprüfen'}
            </button>
        </div>
      </main>

      {isFinished && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center space-y-6 shadow-2xl max-w-sm w-full text-center">
                <div className="text-5xl animate-bounce">✨</div>
                <h3 className="text-2xl font-bold text-white">Sehr gut!</h3>
                <button onClick={nextTask} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">Nächste Aufgabe</button>
            </div>
        </div>
      )}
    </div>
  );
}

function DiffButton({ label, sub, active, onClick }: { label: string, sub: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-3 rounded-xl border text-left transition-all duration-200 group relative overflow-hidden
                ${active ? 'bg-primary/10 border-primary/50 text-white ring-1 ring-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white'}`}
        >
            <div className="text-sm font-bold">{label}</div>
            <div className={`text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/60'}`}>{sub}</div>
        </button>
    );
}
