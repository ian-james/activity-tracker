import { useState, useEffect } from 'react';
import { useExercises, usePreferences } from '../../hooks/useWorkouts';
import { Exercise, ExerciseType, WeightUnit } from '../../types';
import { ExerciseProgress } from './ExerciseProgress';

export function ExerciseLibrary() {
  const { exercises, fetchExercises, createExercise, updateExercise, deleteExercise } = useExercises();
  const { preferences, fetchPreferences } = usePreferences();
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingProgress, setViewingProgress] = useState<Exercise | null>(null);

  useEffect(() => {
    fetchExercises();
    fetchPreferences();
  }, [fetchExercises, fetchPreferences]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const exerciseData = {
      name: formData.get('name') as string,
      exercise_type: formData.get('exercise_type') as ExerciseType,
      default_value: formData.get('default_value') ? parseFloat(formData.get('default_value') as string) : null,
      default_weight_unit: formData.get('default_weight_unit') as WeightUnit | null,
      notes: formData.get('notes') as string || null,
    };

    try {
      if (editingExercise) {
        await updateExercise(editingExercise.id, exerciseData);
        setEditingExercise(null);
      } else {
        await createExercise(exerciseData);
        setShowForm(false);
      }
      e.currentTarget.reset();
    } catch (error) {
      console.error('Failed to save exercise:', error);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this exercise?')) {
      try {
        await deleteExercise(id);
      } catch (error) {
        console.error('Failed to delete exercise:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingExercise(null);
  };

  const getExerciseTypeLabel = (type: ExerciseType) => {
    switch (type) {
      case 'reps': return 'Reps';
      case 'time': return 'Time';
      case 'weight': return 'Weight';
    }
  };

  // Filter exercises based on search query
  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.exercise_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Your Exercises</h3>
        {!showForm && !editingExercise && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Exercise
          </button>
        )}
      </div>

      {/* Search Bar */}
      {!showForm && !editingExercise && !viewingProgress && exercises.length > 0 && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Progress View */}
      {viewingProgress && (
        <ExerciseProgress
          exercise={viewingProgress}
          onClose={() => setViewingProgress(null)}
        />
      )}

      {/* Add/Edit Form */}
      {(showForm || editingExercise) && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-100">
            {editingExercise ? 'Edit Exercise' : 'New Exercise'}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exercise Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={editingExercise?.name || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Push-ups, Bench Press"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exercise Type
            </label>
            <select
              name="exercise_type"
              defaultValue={editingExercise?.exercise_type || 'reps'}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="reps">Reps (count)</option>
              <option value="time">Time (seconds)</option>
              <option value="weight">Weight (lbs/kg)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Value (optional)
            </label>
            <input
              type="number"
              name="default_value"
              step="0.1"
              defaultValue={editingExercise?.default_value || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., 10 reps, 60 seconds, 150 lbs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Weight Unit (for weight exercises)
            </label>
            <select
              name="default_weight_unit"
              defaultValue={editingExercise?.default_weight_unit || preferences?.weight_unit || 'lbs'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">None</option>
              <option value="lbs">Pounds (lbs)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingExercise?.notes || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Any notes or instructions..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {editingExercise ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Exercise List */}
      {!viewingProgress && (
        <div className="space-y-2">
          {exercises.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              No exercises yet. Add one to get started!
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              No exercises match your search. Try a different term.
            </div>
          ) : (
            filteredExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{exercise.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {getExerciseTypeLabel(exercise.exercise_type)}
                    </span>
                    {exercise.default_value && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Default: {exercise.default_value}
                        {exercise.exercise_type === 'time' && 's'}
                        {exercise.exercise_type === 'weight' && ` ${exercise.default_weight_unit || ''}`}
                      </span>
                    )}
                  </div>
                  {exercise.notes && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {exercise.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingProgress(exercise)}
                    className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 px-2"
                  >
                    Progress
                  </button>
                  <button
                    onClick={() => handleEdit(exercise)}
                    className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(exercise.id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
