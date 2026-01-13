import { useEffect, useState } from 'react';
import { useHistory } from '../hooks/useApi';
import { HistoryEntry } from '../types';
import { CalendarGrid } from './CalendarGrid';

type TimeRange = 7 | 14 | 28;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function Dashboard() {
  const { history, loading, fetchHistory } = useHistory();
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  useEffect(() => {
    fetchHistory(timeRange);
  }, [fetchHistory, timeRange]);

  const avgPercentage = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / history.length)
    : 0;

  const totalPoints = history.reduce((sum, h) => sum + h.total_points, 0);
  const maxPoints = history.reduce((sum, h) => sum + h.max_possible_points, 0);

  const bestDay = history.length > 0
    ? history.reduce((best, h) => h.percentage > best.percentage ? h : best, history[0])
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Dashboard</h2>
        <div className="flex gap-1">
          {([7, 14, 28] as TimeRange[]).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === days
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{avgPercentage}%</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Avg Completion</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalPoints}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Total Points</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {bestDay ? `${bestDay.percentage}%` : '-'}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">Best Day</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Daily Progress</h3>
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">No data yet</div>
        ) : (
          <CalendarGrid history={history} timeRange={timeRange} />
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-gray-900 dark:text-gray-100">Date</th>
                <th className="text-right py-2 text-gray-900 dark:text-gray-100">Completed</th>
                <th className="text-right py-2 text-gray-900 dark:text-gray-100">Points</th>
                <th className="text-right py-2 text-gray-900 dark:text-gray-100">Score</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((entry) => (
                <tr key={entry.date} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <td className="py-2 text-gray-800 dark:text-gray-200">{formatDate(entry.date)}</td>
                  <td className="text-right py-2 text-gray-800 dark:text-gray-200">
                    {entry.completed_count}/{entry.total_activities}
                  </td>
                  <td className="text-right py-2 text-gray-800 dark:text-gray-200">
                    {entry.total_points}/{entry.max_possible_points}
                  </td>
                  <td className="text-right py-2">
                    <span className={`font-medium ${
                      entry.percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                      entry.percentage >= 60 ? 'text-blue-600 dark:text-blue-400' :
                      entry.percentage >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-500 dark:text-red-400'
                    }`}>
                      {entry.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
