import { useState } from 'react';
import { Meal, MealCreate } from '../../types';
import { MealForm } from './MealForm';

interface Props {
  meals: Meal[];
  onDelete: (id: number) => void;
  onUpdate: (id: number, meal: MealCreate) => void;
}

const MEAL_TYPE_ORDER = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
};

const MEAL_TYPE_LABELS = {
  breakfast: '🍳 Breakfast',
  lunch: '🥗 Lunch',
  dinner: '🍽️ Dinner',
  snack: '🍎 Snack',
};

export function MealList({ meals, onDelete, onUpdate }: Props) {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

  if (meals.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-lg">No meals logged yet</p>
        <p className="text-gray-400 text-sm mt-1">Click "Add Meal" to get started</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-4">
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

      {sortedMealTypes.map((mealType) => (
        <div key={mealType} className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">
              {MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS]}
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {mealsByType[mealType].map((meal) => (
              <div key={meal.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{meal.name}</h5>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{meal.total_calories} cal</span>
                      <span>P: {meal.protein_g}g</span>
                      <span>C: {meal.carbs_g}g</span>
                      <span>F: {meal.fat_g}g</span>
                      {meal.fiber_g > 0 && <span>Fiber: {meal.fiber_g}g</span>}
                    </div>
                    {meal.notes && (
                      <p className="mt-2 text-sm text-gray-500 italic">{meal.notes}</p>
                    )}

                    {/* Expandable micronutrients */}
                    {(meal.vitamin_c_mg > 0 || meal.vitamin_d_mcg > 0 || meal.calcium_mg > 0 || meal.iron_mg > 0) && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          {expandedMeal === meal.id ? '− Hide' : '+ Show'} micronutrients
                        </button>
                        {expandedMeal === meal.id && (
                          <div className="mt-2 flex gap-3 text-xs text-gray-600">
                            {meal.vitamin_c_mg > 0 && <span>Vit C: {meal.vitamin_c_mg}mg</span>}
                            {meal.vitamin_d_mcg > 0 && <span>Vit D: {meal.vitamin_d_mcg}mcg</span>}
                            {meal.calcium_mg > 0 && <span>Calcium: {meal.calcium_mg}mg</span>}
                            {meal.iron_mg > 0 && <span>Iron: {meal.iron_mg}mg</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(meal)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this meal?')) {
                          onDelete(meal.id);
                        }
                      }}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
