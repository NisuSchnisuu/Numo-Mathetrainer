import type { Exercise } from '../data/exercises';
import { curriculum } from '../data/curriculum';

interface ExerciseListProps {
    topicId: string;
    exercises: Exercise[];
    onSelectExercise: (exerciseId: string) => void;
    onBack: () => void;
}

export function ExerciseList({ topicId, exercises, onSelectExercise, onBack }: ExerciseListProps) {
    // Finde den Titel des Themas für den Header
    const topic = curriculum
        .flatMap(c => c.topics)
        .find(t => t.id === topicId);

    return (
        <div className="w-full max-w-6xl mx-auto p-4 animate-fade-in">
            {/* Header mit Zurück-Button */}
            <div className="mb-8 text-center relative">
                <button 
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    <span className="sr-only">Zurück</span>
                </button>
                <h1 className="text-3xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    {topic ? topic.title : 'Übungen wählen'}
                </h1>
                <p className="text-muted-foreground">
                    Wähle eine konkrete Übung aus diesem Bereich.
                </p>
            </div>

            {/* Liste der Übungen */}
            {exercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exercises.map((ex, index) => (
                        <div 
                            key={ex.id}
                            onClick={() => onSelectExercise(ex.id)}
                            className="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 group"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                </div>
                                <div className="px-2 py-1 rounded-full bg-white/5 text-xs text-muted-foreground border border-white/5">
                                    Übung
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold mb-1 text-foreground tracking-tight group-hover:text-primary transition-colors">{ex.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{ex.description}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 glass-card rounded-xl border-dashed">
                    <p className="text-muted-foreground">Für dieses Thema sind noch keine Übungen verfügbar.</p>
                </div>
            )}
        </div>
    );
}
