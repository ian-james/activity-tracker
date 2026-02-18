import { useState } from 'react';
import { MealCreate } from '../../types';

interface SupplementLoggerProps {
  date: Date;
  onLogSupplement: (meal: MealCreate) => Promise<void>;
}

interface Supplement {
  name: string;
  nutrients: Partial<MealCreate>;
  icon: string;
}

const SUPPLEMENTS: Supplement[] = [
  {
    name: 'Multi-Vitamin',
    icon: '💊',
    nutrients: {
      vitamin_c_mg: 90,
      vitamin_d_mcg: 20,
      calcium_mg: 200,
      iron_mg: 18,
      magnesium_mg: 100,
      potassium_mg: 80,
      zinc_mg: 11,
      vitamin_b6_mg: 1.7,
      vitamin_b12_mcg: 2.4,
    },
  },
  {
    name: 'Daily Vitamin Pack',
    icon: '🔷',
    nutrients: {
      vitamin_c_mg: 1000,
      vitamin_d_mcg: 50,
      calcium_mg: 600,
      iron_mg: 18,
      magnesium_mg: 400,
      potassium_mg: 100,
      zinc_mg: 15,
      vitamin_b6_mg: 2,
      vitamin_b12_mcg: 6,
      omega3_g: 1,
    },
  },
  {
    name: 'Vitamin C (1000mg)',
    icon: '🍊',
    nutrients: {
      vitamin_c_mg: 1000,
    },
  },
  {
    name: 'Vitamin D (2000 IU)',
    icon: '☀️',
    nutrients: {
      vitamin_d_mcg: 50,
    },
  },
  {
    name: 'Calcium (500mg)',
    icon: '🦴',
    nutrients: {
      calcium_mg: 500,
    },
  },
  {
    name: 'Iron (18mg)',
    icon: '⚙️',
    nutrients: {
      iron_mg: 18,
    },
  },
  {
    name: 'Magnesium (400mg)',
    icon: '⚡',
    nutrients: {
      magnesium_mg: 400,
    },
  },
  {
    name: 'Zinc (15mg)',
    icon: '🛡️',
    nutrients: {
      zinc_mg: 15,
    },
  },
  {
    name: 'B-Complex',
    icon: '🅱️',
    nutrients: {
      vitamin_b6_mg: 2,
      vitamin_b12_mcg: 6,
    },
  },
  {
    name: 'Omega-3 (1000mg)',
    icon: '🐟',
    nutrients: {
      omega3_g: 1,
    },
  },
  {
    name: 'Potassium (99mg)',
    icon: '🍌',
    nutrients: {
      potassium_mg: 99,
    },
  },
];

export function SupplementLogger({ date, onLogSupplement }: SupplementLoggerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logging, setLogging] = useState<string | null>(null);

  const handleLogSupplement = async (supplement: Supplement) => {
    setLogging(supplement.name);
    try {
      const meal: MealCreate = {
        meal_date: date.toISOString().split('T')[0],
        meal_type: 'snack',
        name: `Supplement: ${supplement.name}`,
        total_calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        vitamin_c_mg: supplement.nutrients.vitamin_c_mg || 0,
        vitamin_d_mcg: supplement.nutrients.vitamin_d_mcg || 0,
        calcium_mg: supplement.nutrients.calcium_mg || 0,
        iron_mg: supplement.nutrients.iron_mg || 0,
        magnesium_mg: supplement.nutrients.magnesium_mg || 0,
        potassium_mg: supplement.nutrients.potassium_mg || 0,
        sodium_mg: supplement.nutrients.sodium_mg || 0,
        zinc_mg: supplement.nutrients.zinc_mg || 0,
        vitamin_b6_mg: supplement.nutrients.vitamin_b6_mg || 0,
        vitamin_b12_mcg: supplement.nutrients.vitamin_b12_mcg || 0,
        omega3_g: supplement.nutrients.omega3_g || 0,
        notes: 'Auto-logged from quick supplement buttons',
      };
      await onLogSupplement(meal);
    } catch (error) {
      console.error('Failed to log supplement:', error);
    } finally {
      setLogging(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-purple-100 dark:border-gray-600">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Quick Supplement Logger
          </h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quickly log vitamins and supplements. These count toward your daily micronutrient goals.
          </p>

          {/* Featured: Multi-vitamins */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Complete Vitamins
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {SUPPLEMENTS.slice(0, 2).map((supplement) => (
                <button
                  key={supplement.name}
                  onClick={() => handleLogSupplement(supplement)}
                  disabled={logging === supplement.name}
                  className="p-3 bg-white dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-gray-700 rounded-lg border border-purple-200 dark:border-gray-600 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{supplement.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {supplement.name}
                      </div>
                      {logging === supplement.name && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">Logging...</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Individual micronutrients */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Individual Supplements
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {SUPPLEMENTS.slice(2).map((supplement) => (
                <button
                  key={supplement.name}
                  onClick={() => handleLogSupplement(supplement)}
                  disabled={logging === supplement.name}
                  className="p-2 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg border border-purple-200 dark:border-gray-600 transition-colors disabled:opacity-50 text-center"
                >
                  <div className="text-2xl mb-1">{supplement.icon}</div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight">
                    {supplement.name.split('(')[0].trim()}
                  </div>
                  {logging === supplement.name && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">•••</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            Tip: Logged supplements appear in your meal list and count toward micronutrient goals
          </p>
        </div>
      )}
    </div>
  );
}
