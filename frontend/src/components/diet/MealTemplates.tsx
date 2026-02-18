import { useState, useEffect } from 'react';
import { MealTemplate, MealTemplateCreate, MealType } from '../../types';
import { fetchApi } from '../../hooks/useApi';

interface MealTemplatesProps {
  onUseTemplate?: (templateId: number, date: string) => void;
  date?: string;
}

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

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
  const [fiber, setFiber] = useState('');
  const [vitaminC, setVitaminC] = useState('');
  const [vitaminD, setVitaminD] = useState('');
  const [calcium, setCalcium] = useState('');
  const [iron, setIron] = useState('');

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
        `/meal-templates?${params.toString()}`
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
      fiber_g: fiber ? parseFloat(fiber) : 0,
      vitamin_c_mg: vitaminC ? parseFloat(vitaminC) : 0,
      vitamin_d_mcg: vitaminD ? parseFloat(vitaminD) : 0,
      calcium_mg: calcium ? parseFloat(calcium) : 0,
      iron_mg: iron ? parseFloat(iron) : 0,
      is_favorite: false,
    };

    try {
      await fetchApi('/meal-templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });

      // Reset form
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFiber('');
      setVitaminC('');
      setVitaminD('');
      setCalcium('');
      setIron('');
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
      await fetchApi(`/meal-templates/${templateId}/toggle-favorite`, {
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
      await fetchApi(`/meal-templates/${templateId}`, {
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
      await fetchApi(`/meal-templates/${templateId}/use?meal_date=${date}`, {
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

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
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
              className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="breakfast">🍳 Breakfast</option>
              <option value="lunch">🥗 Lunch</option>
              <option value="dinner">🍽️ Dinner</option>
              <option value="snack">🍎 Snack</option>
            </select>
          </div>

          {/* Macronutrients */}
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Macronutrients</h5>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Calories*"
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
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Fiber (g)"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Micronutrients */}
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Micronutrients (optional)</h5>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Vitamin C (mg)"
                value={vitaminC}
                onChange={(e) => setVitaminC(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Vitamin D (mcg)"
                value={vitaminD}
                onChange={(e) => setVitaminD(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Calcium (mg)"
                value={calcium}
                onChange={(e) => setCalcium(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                placeholder="Iron (mg)"
                value={iron}
                onChange={(e) => setIron(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
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
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              {/* Header with icon and favorite */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{MEAL_TYPE_ICONS[template.meal_type]}</span>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {template.name}
                    </h4>
                    {template.is_favorite && <span className="text-yellow-500">⭐</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize ml-9">
                    {template.meal_type}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(template.id)}
                  className="text-gray-400 hover:text-yellow-500 transition-colors text-xl"
                >
                  {template.is_favorite ? '⭐' : '☆'}
                </button>
              </div>

              {/* Macronutrients */}
              <div className="mb-3">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Macronutrients</h5>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="text-center p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <div className="font-bold text-purple-700 dark:text-purple-300">
                      {template.total_calories}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">cal</div>
                  </div>
                  <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                    <div className="font-bold text-red-700 dark:text-red-300">
                      {template.protein_g}g
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">protein</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                    <div className="font-bold text-yellow-700 dark:text-yellow-300">
                      {template.carbs_g}g
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">carbs</div>
                  </div>
                  <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                    <div className="font-bold text-blue-700 dark:text-blue-300">
                      {template.fat_g}g
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">fat</div>
                  </div>
                  <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                    <div className="font-bold text-green-700 dark:text-green-300">
                      {template.fiber_g || 0}g
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">fiber</div>
                  </div>
                </div>
              </div>

              {/* Micronutrients */}
              <div className="mb-3">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Micronutrients</h5>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                    <div className="font-bold text-orange-700 dark:text-orange-300">
                      {template.vitamin_c_mg || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">Vit C mg</div>
                  </div>
                  <div className="text-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                    <div className="font-bold text-amber-700 dark:text-amber-300">
                      {template.vitamin_d_mcg || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">Vit D mcg</div>
                  </div>
                  <div className="text-center p-2 bg-teal-100 dark:bg-teal-900/30 rounded">
                    <div className="font-bold text-teal-700 dark:text-teal-300">
                      {template.calcium_mg || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">Ca mg</div>
                  </div>
                  <div className="text-center p-2 bg-rose-100 dark:bg-rose-900/30 rounded">
                    <div className="font-bold text-rose-700 dark:text-rose-300">
                      {template.iron_mg || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">Fe mg</div>
                  </div>
                </div>
              </div>

              {/* Actions - Only Delete button */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {template.use_count > 0 && (
                    <span>Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
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
}
