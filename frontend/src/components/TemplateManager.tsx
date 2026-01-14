import { useState, FormEvent } from 'react';
import { useTemplates, ActivityTemplate } from '../contexts/TemplatesContext';
import { DayOfWeek, DAYS_OF_WEEK } from '../types';

export function TemplateManager() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [name, setName] = useState('');
  const [points, setPoints] = useState(10);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);

  const isEditMode = !!editingTemplate;

  const resetForm = () => {
    setName('');
    setPoints(10);
    setSelectedDays([]);
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template: ActivityTemplate) => {
    setName(template.name);
    setPoints(template.points);
    setSelectedDays(template.days || []);
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const templateData = {
      name: name.trim(),
      points,
      days: selectedDays.length > 0 ? selectedDays : null,
    };

    if (isEditMode && editingTemplate) {
      updateTemplate(editingTemplate.id, templateData);
    } else {
      addTemplate(templateData);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this template?')) {
      deleteTemplate(id);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const formatDays = (days: DayOfWeek[] | null) => {
    if (!days || days.length === 0) return 'Every day';
    return days.map(d => {
      const dayInfo = DAYS_OF_WEEK.find(day => day.value === d);
      return dayInfo?.short || d;
    }).join(', ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Quick Add Templates
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your quick add activity templates
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
          >
            Add Template
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <h4 className="font-medium text-gray-800 dark:text-gray-200">
            {isEditMode ? 'Edit Template' : 'New Template'}
          </h4>

          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
            <select
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-24 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              {[5, 10, 25, 50, 100, 200].map((p) => (
                <option key={p} value={p}>
                  {p} pts
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Schedule (leave empty for every day):
            </p>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`w-10 h-10 rounded text-sm font-medium transition-colors ${
                    selectedDays.includes(day.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            >
              {isEditMode ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
            No templates yet. Add one to get started!
          </p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
            >
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {template.name}
                  <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm">
                    +{template.points} pts
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDays(template.days)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
