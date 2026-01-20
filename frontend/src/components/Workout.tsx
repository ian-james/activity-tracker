import { useState, useEffect } from 'react';
import { useExercises, useWorkoutSessions, useTemplateExercises } from '../hooks/useWorkouts';
import { ExerciseLibrary } from './workout/ExerciseLibrary';
import { ActiveWorkout } from './workout/ActiveWorkout';
import { WorkoutHistory } from './workout/WorkoutHistory';
import { WorkoutTemplates } from './workout/WorkoutTemplates';

type WorkoutView = 'library' | 'templates' | 'workout' | 'history';

export function Workout() {
  const [view, setView] = useState<WorkoutView>('templates');
  const [templateIdToStart, setTemplateIdToStart] = useState<number | null>(null);
  const { exercises, fetchExercises } = useExercises();
  const { activeSession, fetchActiveSession, createSession } = useWorkoutSessions();

  useEffect(() => {
    fetchExercises();
    fetchActiveSession();
  }, [fetchExercises, fetchActiveSession]);

  // Auto-switch to workout view if there's an active session
  useEffect(() => {
    if (activeSession && view !== 'workout') {
      setView('workout');
    }
  }, [activeSession, view]);

  const handleStartFromTemplate = async (templateId: number) => {
    setTemplateIdToStart(templateId);
    setView('workout');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Workout Tracker</h2>

        {/* View Tabs */}
        <nav className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow mb-6">
          {[
            { id: 'templates', label: 'Templates' },
            { id: 'library', label: 'Exercises' },
            { id: 'workout', label: 'Active Workout' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as WorkoutView)}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                view === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'workout' && activeSession && (
                <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        {/* View Content */}
        {view === 'templates' && <WorkoutTemplates onStartFromTemplate={handleStartFromTemplate} />}
        {view === 'library' && <ExerciseLibrary />}
        {view === 'workout' && <ActiveWorkout templateIdToStart={templateIdToStart} onTemplateStarted={() => setTemplateIdToStart(null)} />}
        {view === 'history' && <WorkoutHistory />}
      </div>
    </div>
  );
}
