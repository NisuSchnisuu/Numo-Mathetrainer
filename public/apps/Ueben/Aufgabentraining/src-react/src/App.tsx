import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExerciseList } from './components/ExerciseList';
import { exercises } from './data/exercises';

function App() {
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);

  // Sync Numo Back Button visibility with app state
  useEffect(() => {
    const backLink = document.getElementById('numo-back-link');
    if (backLink) {
      // Hide if we are deeper than the dashboard root
      if (currentTopic) {
        backLink.style.display = 'none';
      } else {
        backLink.style.display = 'flex';
      }
    }
  }, [currentTopic]);

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
