import { useState, useEffect } from 'react';
import { MealTemplate, MealTemplateCreate, MealType } from '../../types';
import { fetchApi } from '../../hooks/useApi';

interface MealTemplatesProps {
  onUseTemplate?: (templateId: number, date: string) => void;
  date?: string;
}

export function MealTemplates({ onUseTemplate, date }: MealTemplatesProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterType, setFilterType] = useState<MealType | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [filterType, favoritesOnly]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.append('meal_type', filterType);
      }
      if (favoritesOnly) {
        params.append('favorites_only', 'true');
      }

      const data = await fetchApi<MealTemplate[]>(
        `/api/meal-templates?${params.toString()}`
      );
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!name.trim() || !calories) {
      alert('Please enter a template name and calories');
      return;
    }

    const template: MealTemplateCreate = {
      name: name.trim(),
      meal_type: mealType,
      total_calories: parseFloat(calories),
      protein_g: protein ? parseFloat(protein) : 0,
      carbs_g: carbs ? parseFloat(carbs) : 0,
      fat_g: fat ? parseFloat(fat) : 0,
      is_favorite: false,
    };

    try {
      await fetchApi('/api/meal-templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });

      // Reset form
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setShowCreateForm(false);
      await fetchTemplates();
      alert('Template created successfully!');
    } catch (err) {
      console.error('Failed to create template:', err);
      alert(`Failed to create template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const toggleFavorite = async (templateId: number) => {
    try {
      await fetchApi(`/api/meal-templates/${templateId}/toggle-favorite`, {
        method: 'POST',
      });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const deleteTemplate = async (templateId: number) => {
    if (!confirm('Delete this meal template?')) return;

    try {
      await fetchApi(`/api/meal-templates/${templateId}`, {
        method: 'DELETE',
      });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const useTemplate = async (templateId: number) => {
    if (!date) {
      alert('Please select a date first');
      return;
    }

    try {
      await fetchApi(`/api/meal-templates/${templateId}/use?meal_date=${date}`, {
        method: 'POST',
      });
      if (onUseTemplate) {
        onUseTemplate(templateId, date);
      }
      alert('Meal added from template!');
    } catch (err) {
      console.error('Failed to use template:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Meal Templates & Favorites
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ New Template'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Create Template</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
            <input
              type="number"
              placeholder="Calories"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              placeholder="Protein (g)"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              placeholder="Carbs (g)"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              placeholder="Fat (g)"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={createTemplate}
            disabled={!name.trim() || !calories}
            className="w-full mt-3 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create Template
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MealType | 'all')}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="all">All Types</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            favoritesOnly
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          ⭐ Favorites Only
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p className="mb-2">No templates yet.</p>
          <p className="text-sm">Create templates for your frequently eaten meals!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {template.name}
                    </h4>
                    {template.is_favorite && <span className="text-yellow-500">⭐</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {template.meal_type}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(template.id)}
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  {template.is_favorite ? '⭐' : '☆'}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="text-center p-1 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    {template.total_calories}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">cal</div>
                </div>
                <div className="text-center p-1 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    {template.protein_g}g
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">P</div>
                </div>
                <div className="text-center p-1 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {template.carbs_g}g
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">C</div>
                </div>
                <div className="text-center p-1 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {template.fat_g}g
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">F</div>
                </div>
              </div>

              <div className="flex gap-2">
                {date && (
                  <button
                    onClick={() => useTemplate(template.id)}
                    className="flex-1 px-2 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    Use Template
                  </button>
                )}
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="px-2 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>

              {template.use_count > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
