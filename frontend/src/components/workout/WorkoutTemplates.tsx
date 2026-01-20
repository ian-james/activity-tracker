import { useState, useEffect } from 'react';
import { useWorkoutTemplates, useTemplateExercises, useExercises } from '../../hooks/useWorkouts';
import { WorkoutTemplate, Exercise } from '../../types';

interface WorkoutTemplatesProps {
  onStartFromTemplate?: (templateId: number) => void;
}

export function WorkoutTemplates({ onStartFromTemplate }: WorkoutTemplatesProps) {
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useWorkoutTemplates();
  const { exercises, fetchExercises } = useExercises();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchExercises();
  }, [fetchTemplates, fetchExercises]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const templateData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
    };

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
        setEditingTemplate(null);
      } else {
        const newTemplate = await createTemplate(templateData);
        if (newTemplate) {
          setSelectedTemplate(newTemplate);
        }
        setShowForm(false);
      }
      e.currentTarget.reset();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setShowForm(false);
    setSelectedTemplate(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this workout template?')) {
      try {
        await deleteTemplate(id);
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null);
        }
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleStartWorkout = (templateId: number) => {
    if (onStartFromTemplate) {
      onStartFromTemplate(templateId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Workout Templates</h3>
        {!showForm && !editingTemplate && !selectedTemplate && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            New Template
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(showForm || editingTemplate) && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-100">
            {editingTemplate ? 'Edit Template' : 'New Workout Template'}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={editingTemplate?.name || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Upper Body Day, Full Body Circuit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={editingTemplate?.description || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Notes about this workout..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {editingTemplate ? 'Update' : 'Create'}
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

      {/* Template Builder (when a template is selected) */}
      {selectedTemplate && (
        <TemplateBuilder
          template={selectedTemplate}
          exercises={exercises}
          onClose={() => setSelectedTemplate(null)}
          onStartWorkout={() => handleStartWorkout(selectedTemplate.id)}
        />
      )}

      {/* Template List */}
      {!selectedTemplate && (
        <div className="space-y-2">
          {templates.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              No workout templates yet. Create one to get started!
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedTemplate(template)}>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {template.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Updated: {new Date(template.updated_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleStartWorkout(template.id)}
                    className="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
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

interface TemplateBuilderProps {
  template: WorkoutTemplate;
  exercises: Exercise[];
  onClose: () => void;
  onStartWorkout: () => void;
}

function TemplateBuilder({ template, exercises, onClose, onStartWorkout }: TemplateBuilderProps) {
  const { templateExercises, fetchTemplateExercises, addTemplateExercise, deleteTemplateExercise } = useTemplateExercises(template.id);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTemplateExercises();
  }, [fetchTemplateExercises]);

  const handleAddExercise = async (exercise: Exercise) => {
    try {
      const orderIndex = templateExercises.length;
      await addTemplateExercise({
        template_id: template.id,
        exercise_id: exercise.id,
        order_index: orderIndex,
        target_sets: 3,
        target_value: exercise.default_value,
        rest_seconds: 60,
      });
      setShowExercisePicker(false);
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  };

  const handleRemoveExercise = async (templateExerciseId: number) => {
    if (confirm('Remove this exercise from the template?')) {
      try {
        await deleteTemplateExercise(templateExerciseId);
      } catch (error) {
        console.error('Failed to remove exercise:', error);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-800 dark:text-gray-200">{template.name}</h4>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕ Close
        </button>
      </div>

      {/* Exercise List */}
      <div className="space-y-2">
        {templateExercises.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No exercises added yet. Click "Add Exercise" to build your workout!
          </div>
        ) : (
          templateExercises.map((te) => {
            const exercise = exercises.find((e) => e.id === te.exercise_id);
            if (!exercise) return null;

            return (
              <div key={te.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{exercise.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {te.target_sets} sets
                    {te.target_value && ` × ${te.target_value}`}
                    {' • Rest: '}{te.rest_seconds}s
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveExercise(te.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
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
        <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-medium text-gray-800 dark:text-gray-100">Select Exercise</h5>
            <button
              onClick={() => {
                setShowExercisePicker(false);
                setSearchQuery('');
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {exercises
              .filter((ex) =>
                ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ex.exercise_type.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExercise(exercise)}
                  className="w-full text-left p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-500"
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

      {/* Start Workout Button */}
      {templateExercises.length > 0 && (
        <button
          onClick={onStartWorkout}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-medium"
        >
          Start This Workout
        </button>
      )}
    </div>
  );
}
