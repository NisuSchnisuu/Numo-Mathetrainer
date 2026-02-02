import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExerciseList } from './components/ExerciseList';
import { exercises } from './data/exercises';

function App() {
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);

  // 1. Level: Thema wählen (vom Dashboard)
  const handleSelectTopic = (topicId: string) => {
    setCurrentTopic(topicId);
    setCurrentExerciseId(null);
  };

  // 2. Level: Übung wählen (von der Liste)
  const handleSelectExercise = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
  };

  // Zurück-Funktionen
  const goBackToDashboard = () => {
    setCurrentTopic(null);
    setCurrentExerciseId(null);
  };

  const goBackToExerciseList = () => {
    setCurrentExerciseId(null);
  };

  // --- Render Logic ---

  // 3. Ansicht: Aktive Übung
  if (currentTopic && currentExerciseId) {
    const availableExercises = exercises[currentTopic] || [];
    const activeExercise = availableExercises.find(e => e.id === currentExerciseId);

    if (activeExercise) {
      const ActiveComponent = activeExercise.component;
      return <ActiveComponent onBack={goBackToExerciseList} />;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
       <header className="p-4 border-b border-white/5 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
                  N
              </div>
              <span className="font-bold text-lg tracking-tight">Numo <span className="text-muted-foreground font-normal">MatheTrainer</span></span>
          </div>
       </header>

       <main className="flex-1 py-8">
          {/* 2. Ansicht: Liste der Übungen für ein Thema */}
          {currentTopic && !currentExerciseId ? (
             <ExerciseList 
                topicId={currentTopic}
                exercises={exercises[currentTopic] || []}
                onSelectExercise={handleSelectExercise}
                onBack={goBackToDashboard}
             />
          ) : (
            /* 1. Ansicht: Dashboard (Themenauswahl) */
            <Dashboard onSelectTopic={handleSelectTopic} />
          )}
       </main>
    </div>
  );
}

export default App;
