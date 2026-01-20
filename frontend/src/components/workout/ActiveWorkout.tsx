import { useState, useEffect } from 'react';
import { useExercises, useWorkoutSessions, useSessionExercises, useTemplateExercises } from '../../hooks/useWorkouts';
import { useWorkoutTimer, formatTime } from '../../hooks/useWorkoutTimer';
import { Exercise } from '../../types';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';

interface ActiveWorkoutProps {
  templateIdToStart?: number | null;
  onTemplateStarted?: () => void;
}

export function ActiveWorkout({ templateIdToStart, onTemplateStarted }: ActiveWorkoutProps) {
  const { exercises, fetchExercises } = useExercises();
  const {
    activeSession,
    fetchActiveSession,
    createSession,
    updateSession,
  } = useWorkoutSessions();
  const {
    sessionExercises,
    fetchSessionExercises,
    addSessionExercise,
    deleteSessionExercise,
  } = useSessionExercises(activeSession?.id || null);
  const { templateExercises, fetchTemplateExercises } = useTemplateExercises(templateIdToStart || null);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  const timer = useWorkoutTimer(activeSession?.started_at);

  useEffect(() => {
    fetchExercises();
    fetchActiveSession();
  }, [fetchExercises, fetchActiveSession]);

  useEffect(() => {
    if (activeSession) {
      fetchSessionExercises();
      timer.start();
    }
  }, [activeSession, fetchSessionExercises]);

  // Handle starting from a template
  useEffect(() => {
    if (templateIdToStart && !activeSession && !isLoadingTemplate) {
      handleStartFromTemplate();
    }
  }, [templateIdToStart, activeSession, isLoadingTemplate]);

  const handleStartFromTemplate = async () => {
    if (!templateIdToStart) return;

    setIsLoadingTemplate(true);
    try {
      // Fetch template exercises
      await fetchTemplateExercises();

      // Create new workout session
      const now = new Date().toISOString();
      const session = await createSession({
        name: workoutName || 'Template Workout',
        started_at: now,
      });

      if (session && templateExercises.length > 0) {
        // Add all template exercises to the session
        for (const te of templateExercises) {
          await addSessionExercise({
            workout_session_id: session.id,
            exercise_id: te.exercise_id,
            order_index: te.order_index,
            target_sets: te.target_sets,
            target_value: te.target_value,
            rest_seconds: te.rest_seconds,
            notes: te.notes,
          });
        }

        timer.start();
      }

      if (onTemplateStarted) {
        onTemplateStarted();
      }
    } catch (error) {
      console.error('Failed to start workout from template:', error);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleStartWorkout = async () => {
    try {
      const now = new Date().toISOString();
      const session = await createSession({
        name: workoutName || null,
        started_at: now,
      });
      if (session) {
        timer.start();
      }
    } catch (error) {
      console.error('Failed to start workout:', error);
    }
  };

  const handleCompleteWorkout = async () => {
    if (!activeSession) return;

    if (confirm('Are you sure you want to finish this workout?')) {
      try {
        timer.stop();
        await updateSession(activeSession.id, {
          completed_at: new Date().toISOString(),
          paused_duration: timer.pausedDuration,
          total_duration: timer.elapsedSeconds,
        });
        await fetchActiveSession();
      } catch (error) {
        console.error('Failed to complete workout:', error);
      }
    }
  };

  const handlePauseResume = () => {
    if (timer.isPaused) {
      timer.resume();
    } else {
      timer.pause();
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!activeSession) return;

    try {
      const orderIndex = sessionExercises.length;
      await addSessionExercise({
        workout_session_id: activeSession.id,
        exercise_id: exercise.id,
        order_index: orderIndex,
        target_sets: 3, // Default to 3 sets
        target_value: exercise.default_value,
        rest_seconds: 60, // Default rest
      });
      setShowExercisePicker(false);
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  };

  const handleRemoveExercise = async (sessionExerciseId: number) => {
    if (confirm('Remove this exercise from the workout?')) {
      try {
        await deleteSessionExercise(sessionExerciseId);
      } catch (error) {
        console.error('Failed to remove exercise:', error);
      }
    }
  };

  if (isLoadingTemplate) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Starting Workout from Template...
          </h3>
          <div className="text-gray-600 dark:text-gray-400">
            Loading exercises and creating session...
          </div>
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Start a New Workout
          </h3>
          <div className="max-w-md mx-auto space-y-4">
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Workout name (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleStartWorkout}
              className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-medium"
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workout Header with Timer */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {activeSession.name || 'Workout Session'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(activeSession.started_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {formatTime(timer.elapsedSeconds)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {timer.isPaused ? 'Paused' : 'Running'}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePauseResume}
            className={`flex-1 px-4 py-2 rounded font-medium ${
              timer.isPaused
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}
          >
            {timer.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleCompleteWorkout}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium"
          >
            Finish Workout
          </button>
        </div>
      </div>

      {/* Add Exercise Button */}
      {!showExercisePicker && (
        <button
          onClick={() => setShowExercisePicker(true)}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Add Exercise
        </button>
      )}

      {/* Exercise Picker */}
      {showExercisePicker && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-800 dark:text-gray-100">Select Exercise</h4>
            <button
              onClick={() => {
                setShowExercisePicker(false);
                setExerciseSearchQuery('');
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            value={exerciseSearchQuery}
            onChange={(e) => setExerciseSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {exercises
              .filter((ex) =>
                ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
                ex.exercise_type.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
              )
              .map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExercise(exercise)}
                  className="w-full text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                  <div className="font-medium text-gray-800 dark:text-gray-200">{exercise.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {exercise.exercise_type}
                    {exercise.default_value && ` • Default: ${exercise.default_value}`}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Session Exercises with Set Logger */}
      <div className="space-y-3">
        {sessionExercises.length === 0 && !showExercisePicker && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            No exercises added yet. Click "Add Exercise" to start!
          </div>
        )}

        {sessionExercises.map((sessionExercise) => {
          const exercise = exercises.find((e) => e.id === sessionExercise.exercise_id);
          if (!exercise) return null;

          return (
            <div key={sessionExercise.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">{exercise.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Target: {sessionExercise.target_sets} sets
                    {sessionExercise.target_value && ` × ${sessionExercise.target_value}`}
                    {' • Rest: '}{sessionExercise.rest_seconds}s
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveExercise(sessionExercise.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>

              <SetLogger
                sessionExercise={sessionExercise}
                exercise={exercise}
              />

              <RestTimer restSeconds={sessionExercise.rest_seconds} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
