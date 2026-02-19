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
  const [showQuickAddExercise, setShowQuickAddExercise] = useState(false);
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

  const handleQuickAddExercise = () => {
    setShowQuickAddExercise(false);
    setView('library');
  };

  return (
    <div className="space-y-4">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workout Tracker</h2>
        <button
          onClick={() => setView('library')}
          className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
        >
          <span>+</span>
          <span>Add Exercise</span>
        </button>
      </div>

      {/* View Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <nav className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'templates', label: '📋 Templates', description: 'Workout routines' },
            { id: 'library', label: '💪 Exercises', description: 'Exercise library' },
            { id: 'workout', label: '🏋️ Active', description: 'Current workout' },
            { id: 'history', label: '📊 History', description: 'Past workouts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as WorkoutView)}
              className={`flex-1 px-6 py-3 text-left transition-colors relative ${
                view === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{tab.label}</span>
                {tab.id === 'workout' && activeSession && (
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {tab.description}
              </div>
            </button>
          ))}
        </nav>

        {/* View Content */}
        <div className="p-4">
          {view === 'templates' && <WorkoutTemplates onStartFromTemplate={handleStartFromTemplate} />}
          {view === 'library' && <ExerciseLibrary />}
          {view === 'workout' && <ActiveWorkout templateIdToStart={templateIdToStart} onTemplateStarted={() => setTemplateIdToStart(null)} />}
          {view === 'history' && <WorkoutHistory />}
        </div>
      </div>
    </div>
  );
}
