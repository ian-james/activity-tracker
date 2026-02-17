import { useState } from 'react';
import { MealCreate, MealType } from '../../types';

interface Props {
  date: Date;
  initialData?: MealCreate;
  onSubmit: (meal: MealCreate) => void;
  onCancel: () => void;
}

export function MealForm({ date, initialData, onSubmit, onCancel }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<MealCreate>(
    initialData || {
      meal_date: date.toISOString().split('T')[0],
      meal_type: 'breakfast',
      name: '',
      total_calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      vitamin_c_mg: 0,
      vitamin_d_mcg: 0,
      calcium_mg: 0,
      iron_mg: 0,
      notes: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: keyof MealCreate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {initialData ? 'Edit Meal' : 'Add Meal'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Meal Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meal Type
          </label>
          <select
            value={formData.meal_type}
            onChange={(e) => updateField('meal_type', e.target.value as MealType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>

        {/* Meal Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meal Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Grilled chicken with rice"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Core Macros */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calories *
            </label>
            <input
              type="number"
              value={formData.total_calories}
              onChange={(e) => updateField('total_calories', parseFloat(e.target.value) || 0)}
              required
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protein (g) *
            </label>
            <input
              type="number"
              value={formData.protein_g}
              onChange={(e) => updateField('protein_g', parseFloat(e.target.value) || 0)}
              required
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carbs (g) *
            </label>
            <input
              type="number"
              value={formData.carbs_g}
              onChange={(e) => updateField('carbs_g', parseFloat(e.target.value) || 0)}
              required
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fat (g) *
            </label>
            <input
              type="number"
              value={formData.fat_g}
              onChange={(e) => updateField('fat_g', parseFloat(e.target.value) || 0)}
              required
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Fiber */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fiber (g)
          </label>
          <input
            type="number"
            value={formData.fiber_g}
            onChange={(e) => updateField('fiber_g', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Advanced Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAdvanced ? '− Hide' : '+ Show'} Micronutrients
        </button>

        {/* Advanced Fields */}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vitamin C (mg)
              </label>
              <input
                type="number"
                value={formData.vitamin_c_mg}
                onChange={(e) => updateField('vitamin_c_mg', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vitamin D (mcg)
              </label>
              <input
                type="number"
                value={formData.vitamin_d_mcg}
                onChange={(e) => updateField('vitamin_d_mcg', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calcium (mg)
              </label>
              <input
                type="number"
                value={formData.calcium_mg}
                onChange={(e) => updateField('calcium_mg', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iron (mg)
              </label>
              <input
                type="number"
                value={formData.iron_mg}
                onChange={(e) => updateField('iron_mg', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {initialData ? 'Update' : 'Add'} Meal
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
