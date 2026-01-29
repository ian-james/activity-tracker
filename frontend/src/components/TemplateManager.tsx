import { useState, useEffect, FormEvent } from 'react';
import { useTemplates, ActivityTemplate } from '../contexts/TemplatesContext';
import { DayOfWeek, DAYS_OF_WEEK, CompletionType, ScheduleFrequency } from '../types';
import { useCategories, useActivities } from '../hooks/useApi';

const POINT_OPTIONS = [-200, -100, -50, -25, -10, -5, 5, 10, 25, 50, 100, 200];

interface TemplateManagerProps {
  refreshTrigger?: number;
}

export function TemplateManager({ refreshTrigger }: TemplateManagerProps) {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { categories, fetchCategories } = useCategories();
  const { createActivity } = useActivities();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [name, setName] = useState('');
  const [points, setPoints] = useState(10);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [completionType, setCompletionType] = useState<CompletionType>('checkbox');
  const [ratingScale, setRatingScale] = useState<number>(5);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('weekly');
  const [biweeklyStartDate, setBiweeklyStartDate] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Refetch categories when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchCategories();
    }
  }, [refreshTrigger, fetchCategories]);

  const isEditMode = !!editingTemplate;

  const resetForm = () => {
    setName('');
    setPoints(10);
    setSelectedDays([]);
    setCategoryId(null);
    setCompletionType('checkbox');
    setRatingScale(5);
    setScheduleFrequency('weekly');
    setBiweeklyStartDate('');
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template: ActivityTemplate) => {
    setName(template.name);
    setPoints(template.points);
    setSelectedDays(template.days || []);
    setCategoryId(template.category_id);
    setCompletionType(template.completion_type);
    setRatingScale(template.rating_scale || 5);
    setScheduleFrequency(template.schedule_frequency);
    setBiweeklyStartDate(template.biweekly_start_date || '');
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
      category_id: categoryId,
      completion_type: completionType,
      rating_scale: completionType === 'rating' ? ratingScale : null,
      schedule_frequency: scheduleFrequency,
      biweekly_start_date: scheduleFrequency === 'biweekly' ? biweeklyStartDate : null,
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

  const handleCreateFromTemplate = async (template: ActivityTemplate) => {
    setCreatingFromTemplate(template.id);
    try {
      await createActivity({
        name: template.name,
        points: template.points,
        days_of_week: template.days,
        category_id: template.category_id,
        completion_type: template.completion_type,
        rating_scale: template.rating_scale,
        schedule_frequency: template.schedule_frequency,
        biweekly_start_date: template.biweekly_start_date,
      });
      setSuccessMessage(`Created "${template.name}" activity!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create activity from template:', error);
      alert('Failed to create activity. Please try again.');
    } finally {
      setCreatingFromTemplate(null);
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

  const toggleCategoryCollapse = (categoryKey: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  const groupedTemplates = () => {
    const grouped = new Map<string, { name: string; color: string; templates: ActivityTemplate[] }>();

    templates.forEach(template => {
      const category = categories.find(c => c.id === template.category_id);
      const key = category ? `cat-${category.id}` : 'uncategorized';
      const name = category?.name || 'Uncategorized';
      const color = category?.color || '#9CA3AF';

      if (!grouped.has(key)) {
        grouped.set(key, { name, color, templates: [] });
      }
      grouped.get(key)!.templates.push(template);
    });

    return Array.from(grouped.entries());
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

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

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
              className="w-32 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              {POINT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p > 0 ? '+' : ''}{p} pts
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
              Category (optional):
            </label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
              Completion Type:
            </label>
            <select
              value={completionType}
              onChange={(e) => setCompletionType(e.target.value as CompletionType)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value="energy_quality">Energy & Quality Levels</option>
              <option value="rating">Rating Scale</option>
              <option value="checkbox">Simple Checkbox</option>
            </select>
          </div>

          {completionType === 'rating' && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                Rating Scale:
              </label>
              <select
                value={ratingScale}
                onChange={(e) => setRatingScale(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                <option value={3}>3-point scale (1-3)</option>
                <option value={5}>5-point scale (1-5)</option>
                <option value={10}>10-point scale (1-10)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
              Schedule Frequency:
            </label>
            <select
              value={scheduleFrequency}
              onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks (Biweekly)</option>
            </select>
          </div>

          {scheduleFrequency === 'biweekly' && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                Start Date (first occurrence):
              </label>
              <input
                type="date"
                value={biweeklyStartDate}
                onChange={(e) => setBiweeklyStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Days of Week (leave empty for every day):
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

      <div className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
            No templates yet. Add one to get started!
          </p>
        ) : (
          groupedTemplates().map(([key, group]) => {
            const isCollapsed = collapsedCategories.has(key);
            return (
              <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategoryCollapse(key)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({group.templates.length})
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                      isCollapsed ? '' : 'rotate-180'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {group.templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800"
                      >
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {template.name}
                            <span className={`ml-2 text-sm ${template.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {template.points > 0 ? '+' : ''}{template.points} pts
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2">
                            <span>{formatDays(template.days)}</span>
                            <span>•</span>
                            <span>
                              {template.completion_type === 'checkbox' && '✓ Checkbox'}
                              {template.completion_type === 'rating' && `⭐ Rating (1-${template.rating_scale})`}
                              {template.completion_type === 'energy_quality' && '⚡ Energy/Quality'}
                            </span>
                            {template.schedule_frequency === 'biweekly' && (
                              <>
                                <span>•</span>
                                <span>📅 Biweekly</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateFromTemplate(template)}
                            disabled={creatingFromTemplate === template.id}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            {creatingFromTemplate === template.id ? 'Creating...' : 'Use'}
                          </button>
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
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
