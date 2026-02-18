import { DailyNutritionSummary } from '../../types';

interface Props {
  summary: DailyNutritionSummary;
}

export function NutritionSummary({ summary }: Props) {
  const { goals, actual, percentage, activity_points, adjusted_calorie_goal } = summary;

  const getProgressColor = (pct: number) => {
    if (pct >= 95) return 'bg-green-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (pct: number) => {
    if (pct >= 95) return 'text-green-700 dark:text-green-400';
    if (pct >= 70) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-red-700 dark:text-red-400';
  };

  const MacroBar = ({ label, current, goal, unit, pct }: {
    label: string;
    current: number;
    goal: number;
    unit: string;
    pct: number;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`font-semibold ${getProgressTextColor(pct)}`}>
          {Math.round(current)}{unit} / {goal}{unit} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${getProgressColor(pct)} transition-all duration-300`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );

  // Calculate calories burned bonus
  const calorieBonus = adjusted_calorie_goal - goals.base_calories;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 space-y-4 border border-blue-100 dark:border-gray-600">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Daily Nutrition</h3>
          {calorieBonus > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              🎯 +{Math.round(calorieBonus)} calories from {activity_points} activity points
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <MacroBar
          label="Calories"
          current={actual.calories}
          goal={adjusted_calorie_goal}
          unit=""
          pct={percentage.calories}
        />
        <MacroBar
          label="Protein"
          current={actual.protein_g}
          goal={goals.protein_g}
          unit="g"
          pct={percentage.protein_g}
        />
        <MacroBar
          label="Carbs"
          current={actual.carbs_g}
          goal={goals.carbs_g}
          unit="g"
          pct={percentage.carbs_g}
        />
        <MacroBar
          label="Fat"
          current={actual.fat_g}
          goal={goals.fat_g}
          unit="g"
          pct={percentage.fat_g}
        />
        <MacroBar
          label="Fiber"
          current={actual.fiber_g}
          goal={goals.fiber_g}
          unit="g"
          pct={percentage.fiber_g}
        />
      </div>

      {/* Macro Split */}
      <div className="pt-4 border-t border-blue-200 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">Macro Split</p>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Protein:</span>{' '}
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {((actual.protein_g * 4 / actual.calories) * 100 || 0).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Carbs:</span>{' '}
            <span className="font-semibold text-green-700 dark:text-green-400">
              {((actual.carbs_g * 4 / actual.calories) * 100 || 0).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Fat:</span>{' '}
            <span className="font-semibold text-yellow-700 dark:text-yellow-400">
              {((actual.fat_g * 9 / actual.calories) * 100 || 0).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
