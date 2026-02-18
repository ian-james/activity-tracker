import { useState, useEffect } from 'react';
import { DailyNutritionSummary } from '../../types';

const API_BASE = '/api';

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export function DietDashboard() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [summaries, setSummaries] = useState<DailyNutritionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState<string>('calories');

  useEffect(() => {
    const fetchNutritionData = async () => {
      setLoading(true);
      try {
        const promises = [];
        const today = new Date();
        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          promises.push(
            fetchApi<DailyNutritionSummary>(`/nutrition/summary/daily?date=${dateStr}`)
              .catch(() => null) // Skip days with errors
          );
        }
        const results = await Promise.all(promises);
        setSummaries(results.filter((s): s is DailyNutritionSummary => s !== null).reverse());
      } catch (error) {
        console.error('Failed to fetch nutrition data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNutritionData();
  }, [days]);

  const nutrients = [
    { key: 'calories', label: 'Calories', unit: '' },
    { key: 'protein_g', label: 'Protein', unit: 'g' },
    { key: 'carbs_g', label: 'Carbs', unit: 'g' },
    { key: 'fat_g', label: 'Fat', unit: 'g' },
    { key: 'fiber_g', label: 'Fiber', unit: 'g' },
    { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
    { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
    { key: 'iron_mg', label: 'Iron', unit: 'mg' },
    { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
    { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
  ];

  const selectedNutrientData = nutrients.find(n => n.key === selectedNutrient);

  // Calculate averages
  const avgPercentage = summaries.length > 0
    ? summaries.reduce((sum, s) => sum + (s.percentage[selectedNutrient as keyof typeof s.percentage] || 0), 0) / summaries.length
    : 0;

  const avgActual = summaries.length > 0
    ? summaries.reduce((sum, s) => sum + (s.actual[selectedNutrient as keyof typeof s.actual] || 0), 0) / summaries.length
    : 0;

  const daysMetGoal = summaries.filter(s => {
    const pct = s.percentage[selectedNutrient as keyof typeof s.percentage];
    return pct !== undefined && pct >= 100;
  }).length;

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-500 dark:bg-green-400';
    if (pct >= 70) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          Diet & Nutrition Trends
        </h3>
        <div className="flex gap-2">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                days === d
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading...</div>
      ) : summaries.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
          No nutrition data yet. Start logging meals in the Diet tab!
        </div>
      ) : (
        <>
          {/* Nutrient Selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Nutrient
            </label>
            <select
              value={selectedNutrient}
              onChange={(e) => setSelectedNutrient(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {nutrients.map((nutrient) => (
                <option key={nutrient.key} value={nutrient.key}>
                  {nutrient.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round(avgPercentage)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avg Goal Met</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(avgActual)}
                <span className="text-sm">{selectedNutrientData?.unit}</span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avg Daily</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {daysMetGoal}/{summaries.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Days Met Goal</div>
            </div>
          </div>

          {/* Daily Breakdown Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
              Daily {selectedNutrientData?.label} Progress
            </h4>
            {summaries.map((summary) => {
              const pct = summary.percentage[selectedNutrient as keyof typeof summary.percentage] || 0;
              const actual = summary.actual[selectedNutrient as keyof typeof summary.actual] || 0;
              const date = new Date(summary.date);

              return (
                <div key={summary.date} className="flex items-center gap-2">
                  <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`h-full ${getBarColor(pct)} transition-all duration-300`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end px-2">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 drop-shadow">
                        {Math.round(actual)}{selectedNutrientData?.unit}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 text-xs font-semibold text-right text-gray-800 dark:text-gray-200">
                    {Math.round(pct)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">≥100% (Met Goal)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-gray-600 dark:text-gray-400">70-99%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">&lt;70%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
