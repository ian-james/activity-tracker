import { useState, useEffect, FormEvent } from 'react';
import { useTemplates, ActivityTemplate } from '../contexts/TemplatesContext';
import { DayOfWeek, DAYS_OF_WEEK } from '../types';
import { useCategories } from '../hooks/useApi';

export function TemplateManager() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { categories, fetchCategories } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [name, setName] = useState('');
  const [points, setPoints] = useState(10);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const isEditMode = !!editingTemplate;

  const resetForm = () => {
    setName('');
    setPoints(10);
    setSelectedDays([]);
    setCategoryId(null);
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template: ActivityTemplate) => {
    setName(template.name);
    setPoints(template.points);
    setSelectedDays(template.days || []);
    setCategoryId(template.category_id);
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
