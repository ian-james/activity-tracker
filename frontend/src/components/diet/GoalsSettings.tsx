import { useState, useEffect } from 'react';
import { useNutritionGoals } from '../../hooks/useApi';
import { NutritionGoalsUpdate } from '../../types';

export function GoalsSettings() {
  const { goals, fetchGoals, updateGoals } = useNutritionGoals();
  const [formData, setFormData] = useState<NutritionGoalsUpdate>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (goals) {
      setFormData({
        base_calories: goals.base_calories,
        protein_g: goals.protein_g,
        carbs_g: goals.carbs_g,
        fat_g: goals.fat_g,
        fiber_g: goals.fiber_g,
        vitamin_c_mg: goals.vitamin_c_mg,
        vitamin_d_mcg: goals.vitamin_d_mcg,
        calcium_mg: goals.calcium_mg,
        iron_mg: goals.iron_mg,
        adjust_for_activity: goals.adjust_for_activity,
        calories_per_activity_point: goals.calories_per_activity_point,
        target_weight: goals.target_weight,
        weight_unit: goals.weight_unit,
      });
    }
  }, [goals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateGoals(formData);
      alert('Goals updated successfully!');
    } catch (error) {
      alert('Failed to update goals');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof NutritionGoalsUpdate>(
    field: K,
    value: NutritionGoalsUpdate[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!goals) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Nutrition Goals</h2>
        <p className="text-gray-600 mt-1">Set your daily nutrition targets</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Calorie Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Calorie Goals</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Daily Calories
            </label>
            <input
              type="number"
              value={formData.base_calories}
              onChange={(e) => updateField('base_calories', parseInt(e.target.value) || 0)}
              min="0"
              step="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="adjust_for_activity"
              checked={formData.adjust_for_activity}
              onChange={(e) => updateField('adjust_for_activity', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="adjust_for_activity" className="text-sm text-gray-700">
              Adjust calories based on activity points
            </label>
          </div>

          {formData.adjust_for_activity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calories per Activity Point
              </label>
              <input
                type="number"
                value={formData.calories_per_activity_point}
                onChange={(e) => updateField('calories_per_activity_point', parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: If you earn 50 activity points and this is set to 10, your calorie goal increases by 500
              </p>
            </div>
          )}
        </div>

        {/* Macronutrient Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Macronutrient Goals</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={formData.protein_g}
                onChange={(e) => updateField('protein_g', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={formData.carbs_g}
                onChange={(e) => updateField('carbs_g', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                value={formData.fat_g}
                onChange={(e) => updateField('fat_g', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiber (g)
              </label>
              <input
                type="number"
                value={formData.fiber_g}
                onChange={(e) => updateField('fiber_g', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Micronutrient Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Micronutrient Goals (Optional)</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vitamin C (mg)
              </label>
              <input
                type="number"
                value={formData.vitamin_c_mg}
                onChange={(e) => updateField('vitamin_c_mg', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vitamin D (mcg)
              </label>
              <input
                type="number"
                value={formData.vitamin_d_mcg}
                onChange={(e) => updateField('vitamin_d_mcg', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calcium (mg)
              </label>
              <input
                type="number"
                value={formData.calcium_mg}
                onChange={(e) => updateField('calcium_mg', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iron (mg)
              </label>
              <input
                type="number"
                value={formData.iron_mg}
                onChange={(e) => updateField('iron_mg', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Weight Goal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Weight Goal</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Weight (optional)
              </label>
              <input
                type="number"
                value={formData.target_weight || ''}
                onChange={(e) => updateField('target_weight', parseFloat(e.target.value) || null)}
                min="0"
                step="0.1"
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight Unit
              </label>
              <select
                value={formData.weight_unit}
                onChange={(e) => updateField('weight_unit', e.target.value as 'lbs' | 'kg')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
      </form>
    </div>
  );
}
