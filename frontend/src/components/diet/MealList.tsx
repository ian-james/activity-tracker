import { useState } from 'react';
import { Meal, MealCreate, MealTemplate } from '../../types';
import { MealForm } from './MealForm';
import { fetchApi } from '../../hooks/useApi';

interface Props {
  meals: Meal[];
  onDelete: (id: number) => void;
  onUpdate: (id: number, meal: MealCreate) => void;
  onAddFromTemplate?: (template: MealTemplate, date: string) => void;
  currentDate: string;
}

const MEAL_TYPE_ORDER = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
};

const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const MEAL_TYPE_ICONS = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

const MEAL_TYPE_COLORS = {
  breakfast: 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800',
  lunch: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800',
  dinner: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800',
  snack: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800',
};

export function MealList({ meals, onDelete, onUpdate, onAddFromTemplate, currentDate }: Props) {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState<string | null>(null); // meal_type
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadTemplates = async (mealType: string) => {
    setLoadingTemplates(true);
    try {
      const data = await fetchApi<MealTemplate[]>(`/meal-templates?meal_type=${mealType}`);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleShowTemplates = async (mealType: string) => {
    if (showTemplateSelector === mealType) {
      setShowTemplateSelector(null);
    } else {
      setShowTemplateSelector(mealType);
      await loadTemplates(mealType);
    }
  };

  const handleUseTemplate = async (template: MealTemplate) => {
    try {
      await fetchApi(`/meal-templates/${template.id}/use?meal_date=${currentDate}`, {
        method: 'POST',
      });
      setShowTemplateSelector(null);
      if (onAddFromTemplate) {
        onAddFromTemplate(template, currentDate);
      }
    } catch (err) {
      console.error('Failed to use template:', err);
      alert('Failed to add meal from template');
    }
  };

  // Group meals by type
  const mealsByType = meals.reduce((acc, meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = [];
    }
    acc[meal.meal_type].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>);

  // Sort meal types
  const sortedMealTypes = Object.keys(mealsByType).sort(
    (a, b) => MEAL_TYPE_ORDER[a as keyof typeof MEAL_TYPE_ORDER] - MEAL_TYPE_ORDER[b as keyof typeof MEAL_TYPE_ORDER]
  );

  const handleEdit = (meal: Meal) => {
    const mealCreate: MealCreate = {
      meal_date: meal.meal_date,
      meal_type: meal.meal_type,
      name: meal.name,
      total_calories: meal.total_calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      fiber_g: meal.fiber_g,
      vitamin_c_mg: meal.vitamin_c_mg,
      vitamin_d_mcg: meal.vitamin_d_mcg,
      calcium_mg: meal.calcium_mg,
      iron_mg: meal.iron_mg,
      notes: meal.notes,
    };
    setEditingMeal({ ...meal, ...mealCreate } as Meal);
  };

  const renderMealTypeSection = (mealType: string) => {
    const mealsForType = mealsByType[mealType] || [];
    const colorClass = MEAL_TYPE_COLORS[mealType as keyof typeof MEAL_TYPE_COLORS];
    const icon = MEAL_TYPE_ICONS[mealType as keyof typeof MEAL_TYPE_ICONS];
    const label = MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS];

    return (
      <div key={mealType} className={`bg-gradient-to-br ${colorClass} rounded-lg border-2 overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b-2 border-inherit">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {label}
              </h4>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({mealsForType.length} {mealsForType.length === 1 ? 'item' : 'items'})
              </span>
            </div>
            <button
              onClick={() => handleShowTemplates(mealType)}
              className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
            >
              {showTemplateSelector === mealType ? '− Hide Templates' : '+ Add from Template'}
            </button>
          </div>
        </div>

        {/* Template Selector */}
        {showTemplateSelector === mealType && (
          <div className="px-4 py-3 bg-white/70 dark:bg-gray-800/70 border-b-2 border-inherit">
            {loadingTemplates ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-2">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
                No templates for this meal type. Go to Templates tab to create one!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleUseTemplate(template)}
                    className="text-left p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{template.name}</span>
                          {template.is_favorite && <span className="text-yellow-500">⭐</span>}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">{template.total_calories} cal</span>
                          <span>P: {template.protein_g}g</span>
                          <span>C: {template.carbs_g}g</span>
                          <span>F: {template.fat_g}g</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meals */}
        <div className="divide-y-2 divide-inherit">
          {mealsForType.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No {label.toLowerCase()} logged yet
            </div>
          ) : (
            mealsForType.map((meal) => (
              <div key={meal.id} className="p-4 bg-white/30 dark:bg-gray-800/30">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{meal.name}</h5>

                    {/* Macros */}
                    <div className="flex gap-4 mt-2">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
                        {meal.total_calories} cal
                      </span>
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                        P: {meal.protein_g}g
                      </span>
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold">
                        C: {meal.carbs_g}g
                      </span>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                        F: {meal.fat_g}g
                      </span>
                      {meal.fiber_g > 0 && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                          Fiber: {meal.fiber_g}g
                        </span>
                      )}
                    </div>

                    {meal.notes && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">{meal.notes}</p>
                    )}

                    {/* Micronutrients */}
                    {(meal.vitamin_c_mg > 0 || meal.vitamin_d_mcg > 0 || meal.calcium_mg > 0 || meal.iron_mg > 0 ||
                      meal.magnesium_mg > 0 || meal.potassium_mg > 0 || meal.sodium_mg > 0 || meal.zinc_mg > 0 ||
                      meal.vitamin_b6_mg > 0 || meal.vitamin_b12_mcg > 0 || meal.omega3_g > 0) && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                          {expandedMeal === meal.id ? '− Hide' : '+ Show'} Micronutrients
                        </button>
                        {expandedMeal === meal.id && (
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {meal.vitamin_c_mg > 0 && (
                              <div className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Vit C:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.vitamin_c_mg}mg</span>
                              </div>
                            )}
                            {meal.vitamin_d_mcg > 0 && (
                              <div className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Vit D:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.vitamin_d_mcg}mcg</span>
                              </div>
                            )}
                            {meal.calcium_mg > 0 && (
                              <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Calcium:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.calcium_mg}mg</span>
                              </div>
                            )}
                            {meal.iron_mg > 0 && (
                              <div className="px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Iron:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.iron_mg}mg</span>
                              </div>
                            )}
                            {meal.magnesium_mg > 0 && (
                              <div className="px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Magnesium:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.magnesium_mg}mg</span>
                              </div>
                            )}
                            {meal.potassium_mg > 0 && (
                              <div className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Potassium:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.potassium_mg}mg</span>
                              </div>
                            )}
                            {meal.sodium_mg > 0 && (
                              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Sodium:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.sodium_mg}mg</span>
                              </div>
                            )}
                            {meal.zinc_mg > 0 && (
                              <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Zinc:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.zinc_mg}mg</span>
                              </div>
                            )}
                            {meal.vitamin_b6_mg > 0 && (
                              <div className="px-2 py-1 bg-pink-50 dark:bg-pink-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Vit B6:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.vitamin_b6_mg}mg</span>
                              </div>
                            )}
                            {meal.vitamin_b12_mcg > 0 && (
                              <div className="px-2 py-1 bg-rose-50 dark:bg-rose-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Vit B12:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.vitamin_b12_mcg}mcg</span>
                              </div>
                            )}
                            {meal.omega3_g > 0 && (
                              <div className="px-2 py-1 bg-teal-50 dark:bg-teal-900/20 rounded text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Omega-3:</span>
                                <span className="ml-1 text-gray-900 dark:text-gray-100">{meal.omega3_g}g</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(meal)}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this meal?')) {
                          onDelete(meal.id);
                        }
                      }}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (meals.length === 0 && !['breakfast', 'lunch', 'dinner', 'snack'].some(type => showTemplateSelector === type)) {
    return (
      <div className="space-y-4">
        {/* Show all meal type sections even when empty */}
        {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => renderMealTypeSection(mealType))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editingMeal && (
        <MealForm
          date={new Date(editingMeal.meal_date)}
          initialData={{
            meal_date: editingMeal.meal_date,
            meal_type: editingMeal.meal_type,
            name: editingMeal.name,
            total_calories: editingMeal.total_calories,
            protein_g: editingMeal.protein_g,
            carbs_g: editingMeal.carbs_g,
            fat_g: editingMeal.fat_g,
            fiber_g: editingMeal.fiber_g,
            vitamin_c_mg: editingMeal.vitamin_c_mg,
            vitamin_d_mcg: editingMeal.vitamin_d_mcg,
            calcium_mg: editingMeal.calcium_mg,
            iron_mg: editingMeal.iron_mg,
            notes: editingMeal.notes,
          }}
          onSubmit={(meal) => {
            onUpdate(editingMeal.id, meal);
            setEditingMeal(null);
          }}
          onCancel={() => setEditingMeal(null)}
        />
      )}

      {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => renderMealTypeSection(mealType))}
    </div>
  );
}
