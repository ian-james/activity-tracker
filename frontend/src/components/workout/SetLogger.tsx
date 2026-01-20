import { useState, useEffect } from 'react';
import { useExerciseSets, usePreferences } from '../../hooks/useWorkouts';
import { SessionExercise, Exercise, ExerciseType, WeightUnit } from '../../types';

interface SetLoggerProps {
  sessionExercise: SessionExercise;
  exercise: Exercise;
}

// Quick setup values
const QUICK_TIMES = [15, 30, 45, 60, 90, 120]; // seconds
const QUICK_REPS = [5, 10, 15, 20, 25, 30];
const QUICK_WEIGHTS = [25, 45, 65, 95, 135, 185, 225]; // Common barbell weights

export function SetLogger({ sessionExercise, exercise }: SetLoggerProps) {
  const { sets, fetchSets, logSet, deleteSet } = useExerciseSets(sessionExercise.id);
  const { preferences, fetchPreferences } = usePreferences();

  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState<number>(sessionExercise.target_value || 0);
  const [weight, setWeight] = useState<number>(exercise.default_value || 0);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    exercise.default_weight_unit || preferences?.weight_unit || 'lbs'
  );

  useEffect(() => {
    fetchSets();
    fetchPreferences();
  }, [fetchSets, fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setWeightUnit(exercise.default_weight_unit || preferences.weight_unit);
    }
  }, [preferences, exercise.default_weight_unit]);

  const nextSetNumber = sets.length + 1;

  const handleLogSet = async () => {
    try {
      const setData: any = {
        session_exercise_id: sessionExercise.id,
        set_number: nextSetNumber,
        completed_at: new Date().toISOString(),
      };

      if (exercise.exercise_type === 'reps') {
        setData.reps = Math.round(value);
      } else if (exercise.exercise_type === 'time') {
        setData.duration_seconds = Math.round(value);
      } else if (exercise.exercise_type === 'weight') {
        setData.weight = weight;
        setData.weight_unit = weightUnit;
        if (value > 0) {
          setData.reps = Math.round(value);
        }
      }

      await logSet(setData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to log set:', error);
    }
  };

  const handleDeleteSet = async (setId: number) => {
    if (confirm('Delete this set?')) {
      try {
        await deleteSet(setId);
      } catch (error) {
        console.error('Failed to delete set:', error);
      }
    }
  };

  const getQuickValues = (): number[] => {
    switch (exercise.exercise_type) {
      case 'time': return QUICK_TIMES;
      case 'reps': return QUICK_REPS;
      case 'weight': return QUICK_REPS; // For weight exercises, quick values are for reps
      default: return [];
    }
  };

  const formatSetDisplay = (set: any): string => {
    if (exercise.exercise_type === 'reps') {
      return `${set.reps} reps`;
    } else if (exercise.exercise_type === 'time') {
      return `${set.duration_seconds}s`;
    } else if (exercise.exercise_type === 'weight') {
      const parts = [`${set.weight || 0} ${set.weight_unit || ''}`];
      if (set.reps) parts.push(`× ${set.reps} reps`);
      return parts.join(' ');
    }
    return '';
  };

  return (
    <div className="space-y-3">
      {/* Completed Sets */}
      {sets.length > 0 && (
        <div className="space-y-1">
          {sets.map((set, index) => (
            <div
              key={set.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Set {set.set_number}: {formatSetDisplay(set)}
              </span>
              <button
                onClick={() => handleDeleteSet(set.id)}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log New Set Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 text-sm font-medium"
        >
          Log Set {nextSetNumber}
        </button>
      )}

      {/* Log Set Form */}
      {showForm && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded space-y-3">
          <h5 className="font-medium text-gray-800 dark:text-gray-200">Log Set {nextSetNumber}</h5>

          {exercise.exercise_type === 'weight' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Weight
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {QUICK_WEIGHTS.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeight(w)}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reps (optional)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </>
          )}

          {(exercise.exercise_type === 'reps' || exercise.exercise_type === 'time') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {exercise.exercise_type === 'reps' ? 'Reps' : 'Duration (seconds)'}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {getQuickValues().map((v) => (
                  <button
                    key={v}
                    onClick={() => setValue(v)}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded"
                  >
                    {v}{exercise.exercise_type === 'time' ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleLogSet}
              className="flex-1 bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600"
            >
              Save Set
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
