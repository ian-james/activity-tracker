import { useState, useEffect } from 'react';
import { useExercises, usePreferences } from '../../hooks/useWorkouts';
import { Exercise, ExerciseType, WeightUnit } from '../../types';
import { ExerciseProgress } from './ExerciseProgress';

export function ExerciseLibrary() {
  const { exercises, fetchExercises, createExercise, updateExercise, deleteExercise } = useExercises();
  const { preferences, fetchPreferences } = usePreferences();
  const [showForm, setShowForm] = useState(true); // Start with form visible
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

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Exercise Library ({exercises.length})
        </h3>
        {!showForm && !editingExercise && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
          >
            + Add Exercise
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
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                {editingExercise ? '✏️ Edit Exercise' : '➕ Quick Add Exercise'}
              </h4>
              {!editingExercise && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Main Fields - Grid Layout */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingExercise?.name || ''}
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Push-ups, Bench Press, Squats"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  name="exercise_type"
                  defaultValue={editingExercise?.exercise_type || 'reps'}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                >
                  <option value="reps">🔢 Reps</option>
                  <option value="time">⏱️ Time</option>
                  <option value="weight">🏋️ Weight</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Value
                </label>
                <input
                  type="number"
                  name="default_value"
                  step="0.1"
                  defaultValue={editingExercise?.default_value || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                  placeholder="10"
                />
              </div>
            </div>

            {/* Advanced Options - Collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>{showAdvanced ? '▼' : '▶'}</span>
                <span>Advanced Options</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-3 pt-2 border-t border-green-200 dark:border-green-800">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weight Unit (for weight exercises)
                  </label>
                  <select
                    name="default_weight_unit"
                    defaultValue={editingExercise?.default_weight_unit || preferences?.weight_unit || 'lbs'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">None</option>
                    <option value="lbs">Pounds (lbs)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes / Instructions
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={editingExercise?.notes || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Form tips, modifications, etc..."
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
              >
                {editingExercise ? 'Update Exercise' : 'Add Exercise'}
              </button>
              {editingExercise && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Exercise List */}
      {!viewingProgress && (
        <div>
          {exercises.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-6xl mb-4">💪</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No exercises yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add your first exercise above to get started with your workout tracking!
              </p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No exercises match "{searchQuery}". Try a different search term.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  {/* Exercise Type Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    exercise.exercise_type === 'reps'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : exercise.exercise_type === 'time'
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : 'bg-orange-100 dark:bg-orange-900/30'
                  }`}>
                    {exercise.exercise_type === 'reps' ? '🔢' : exercise.exercise_type === 'time' ? '⏱️' : '🏋️'}
                  </div>

                  {/* Exercise Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {exercise.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        exercise.exercise_type === 'reps'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : exercise.exercise_type === 'time'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {getExerciseTypeLabel(exercise.exercise_type)}
                      </span>
                      {exercise.default_value && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Default: {exercise.default_value}
                          {exercise.exercise_type === 'time' && 's'}
                          {exercise.exercise_type === 'weight' && ` ${exercise.default_weight_unit || ''}`}
                        </span>
                      )}
                    </div>
                    {exercise.notes && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                        {exercise.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingProgress(exercise)}
                      className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-medium"
                    >
                      📊 Progress
                    </button>
                    <button
                      onClick={() => handleEdit(exercise)}
                      className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
