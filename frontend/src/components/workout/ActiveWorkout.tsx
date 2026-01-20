import { useState, useEffect } from 'react';
import { useExercises, useWorkoutSessions, useSessionExercises, useTemplateExercises } from '../../hooks/useWorkouts';
import { useWorkoutTimer, formatTime } from '../../hooks/useWorkoutTimer';
import { Exercise } from '../../types';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';
import { IntervalTimer } from './IntervalTimer';

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

  // Interval mode state
  const [intervalMode, setIntervalMode] = useState(false);
  const [showIntervalConfig, setShowIntervalConfig] = useState(false);
  const [intervalWorkSeconds, setIntervalWorkSeconds] = useState(60);
  const [intervalRestSeconds, setIntervalRestSeconds] = useState(30);
  const [intervalRounds, setIntervalRounds] = useState(3);

  const timer = useWorkoutTimer(activeSession?.started_at);

  useEffect(() => {
    fetchExercises();
    fetchActiveSession();
  }, [fetchExercises, fetchActiveSession]);

  useEffect(() => {
    if (activeSession) {
      fetchSessionExercises();
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
      await createSession({
        name: workoutName || null,
        started_at: now,
      });
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
      {/* Workout Header with Timer - Hidden in interval mode */}
      {!intervalMode && (
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
                {timer.isRunning ? (timer.isPaused ? 'Paused' : 'Running') : 'Ready'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              {!timer.isRunning ? (
                <button
                  onClick={() => timer.start()}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium"
                >
                  Start
                </button>
              ) : (
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
              )}
              <button
                onClick={handleCompleteWorkout}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium"
              >
                Finish Workout
              </button>
            </div>

            {!showIntervalConfig && (
              <button
                onClick={() => setShowIntervalConfig(true)}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 font-medium"
              >
                ⏱️ Start Interval Training
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interval Configuration */}
      {showIntervalConfig && !intervalMode && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">
              Interval Training Configuration
            </h4>
            <button
              onClick={() => setShowIntervalConfig(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
            >
              Cancel
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Time
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[5, 15, 30, 45, 60, 90].map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => setIntervalWorkSeconds(seconds)}
                    className={`px-3 py-2 rounded text-sm font-medium ${
                      intervalWorkSeconds === seconds
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={intervalWorkSeconds}
                onChange={(e) => setIntervalWorkSeconds(parseInt(e.target.value) || 60)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Custom seconds"
                min="5"
                max="600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rest Time
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[5, 15, 30, 45, 60, 90].map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => setIntervalRestSeconds(seconds)}
                    className={`px-3 py-2 rounded text-sm font-medium ${
                      intervalRestSeconds === seconds
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={intervalRestSeconds}
                onChange={(e) => setIntervalRestSeconds(parseInt(e.target.value) || 30)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Custom seconds"
                min="5"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rounds
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((rounds) => (
                  <button
                    key={rounds}
                    onClick={() => setIntervalRounds(rounds)}
                    className={`px-3 py-2 rounded text-sm font-medium ${
                      intervalRounds === rounds
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {rounds}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={intervalRounds}
                onChange={(e) => setIntervalRounds(parseInt(e.target.value) || 3)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Custom rounds"
                min="1"
                max="20"
              />
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              {sessionExercises.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Total workout time: ~{Math.ceil((sessionExercises.length * (intervalWorkSeconds + intervalRestSeconds) * intervalRounds) / 60)} minutes
                  </p>
                  <button
                    onClick={() => {
                      setIntervalMode(true);
                      setShowIntervalConfig(false);
                    }}
                    className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 font-medium"
                  >
                    Start Interval Workout
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                    Please add exercises to your workout first
                  </p>
                  <button
                    onClick={() => setShowIntervalConfig(false)}
                    className="w-full bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 font-medium"
                  >
                    Add Exercises
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Button */}
      {!showExercisePicker && !showIntervalConfig && !intervalMode && (
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

      {/* Interval Mode Display */}
      {intervalMode ? (
        <IntervalTimer
          sessionExercises={sessionExercises}
          exercises={exercises}
          workSeconds={intervalWorkSeconds}
          restSeconds={intervalRestSeconds}
          rounds={intervalRounds}
          onComplete={() => {
            setIntervalMode(false);
            alert('Interval workout complete! Great job!');
          }}
          onStop={() => {
            setIntervalMode(false);
          }}
        />
      ) : (
        /* Session Exercises with Set Logger */
        <div className="space-y-3">
          {sessionExercises.length === 0 && !showExercisePicker && !showIntervalConfig && (
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
      )}
    </div>
  );
}
