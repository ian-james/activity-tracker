import { useState, useEffect } from 'react';
import { WaterGoal, WaterLog, WaterLogCreate } from '../../types';
import { fetchApi } from '../../hooks/useApi';

export function WaterTracker() {
  const [goal, setGoal] = useState<WaterGoal | null>(null);
  const [todayLog, setTodayLog] = useState<WaterLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [addAmount, setAddAmount] = useState<number>(8); // Default 8 oz
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch goal
      const goalData = await fetchApi<WaterGoal>('/api/water/goal');
      setGoal(goalData);

      // Fetch today's log
      try {
        const logData = await fetchApi<WaterLog>(`/api/water/logs/${today}`);
        setTodayLog(logData);
      } catch (err) {
        // No log for today yet
        setTodayLog(null);
      }
    } catch (err) {
      console.error('Failed to fetch water data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async () => {
    if (!goal || addAmount <= 0) return;

    const newAmount = (todayLog?.amount_oz || 0) + addAmount;

    const logCreate: WaterLogCreate = {
      log_date: today,
      amount_oz: newAmount,
    };

    try {
      const updated = await fetchApi<WaterLog>('/api/water/logs', {
        method: 'POST',
        body: JSON.stringify(logCreate),
      });
      setTodayLog(updated);
    } catch (err) {
      console.error('Failed to log water:', err);
    }
  };

  const resetToday = async () => {
    try {
      await fetchApi(`/api/water/logs/${today}`, { method: 'DELETE' });
      setTodayLog(null);
    } catch (err) {
      console.error('Failed to reset water:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!goal) return null;

  const currentAmount = todayLog?.amount_oz || 0;
  const percentage = Math.min((currentAmount / goal.daily_goal_oz) * 100, 100);
  const remaining = Math.max(goal.daily_goal_oz - currentAmount, 0);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-xl">💧</span>
          Water Intake
        </h3>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {currentAmount.toFixed(0)} oz
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Goal: {goal.daily_goal_oz} oz
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 transition-all duration-300 flex items-center justify-center"
            style={{ width: `${percentage}%` }}
          >
            {percentage > 10 && (
              <span className="text-xs font-semibold text-white">
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {remaining.toFixed(0)} oz remaining
          </p>
        )}
        {percentage >= 100 && (
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
            ✓ Goal reached!
          </p>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => {
            setAddAmount(8);
            addWater();
          }}
          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
        >
          + 8 oz (Glass)
        </button>
        <button
          onClick={() => {
            setAddAmount(16);
            addWater();
          }}
          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
        >
          + 16 oz (Bottle)
        </button>
        <button
          onClick={() => {
            setAddAmount(32);
            addWater();
          }}
          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
        >
          + 32 oz (Nalgene)
        </button>
        <button
          onClick={() => {
            setAddAmount(12);
            addWater();
          }}
          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
        >
          + 12 oz (Can)
        </button>
      </div>

      {/* Reset Button */}
      {todayLog && (
        <button
          onClick={resetToday}
          className="w-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        >
          Reset Today
        </button>
      )}
    </div>
  );
}
