import { useEffect, useState } from 'react';
import { useHistory } from '../hooks/useApi';
import { HistoryEntry } from '../types';

type TimeRange = 7 | 14 | 30;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-yellow-500';
  return 'bg-red-400';
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
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="flex gap-1">
          {([7, 14, 30] as TimeRange[]).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === days
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-blue-600">{avgPercentage}%</div>
          <div className="text-gray-500 text-sm">Avg Completion</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-green-600">{totalPoints}</div>
          <div className="text-gray-500 text-sm">Total Points</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <div className="text-3xl font-bold text-purple-600">
            {bestDay ? `${bestDay.percentage}%` : '-'}
          </div>
          <div className="text-gray-500 text-sm">Best Day</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Daily Progress</h3>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No data yet</div>
        ) : (
          <div className="space-y-2">
            {/* Bar Chart */}
            <div className="flex items-end gap-1 h-40">
              {history.map((entry) => (
                <div
                  key={entry.date}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div className="text-xs text-gray-600 mb-1">
                    {entry.percentage}%
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${getBarColor(entry.percentage)}`}
                    style={{ height: `${Math.max(entry.percentage, 2)}%` }}
                    title={`${formatDate(entry.date)}: ${entry.total_points}/${entry.max_possible_points} pts (${entry.percentage}%)`}
                  />
                </div>
              ))}
            </div>
            {/* X-axis labels */}
            <div className="flex gap-1">
              {history.map((entry, i) => (
                <div
                  key={entry.date}
                  className="flex-1 text-center text-xs text-gray-500 truncate"
                >
                  {timeRange <= 14 || i % 3 === 0 ? formatShortDate(entry.date) : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Daily Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Completed</th>
                <th className="text-right py-2">Points</th>
                <th className="text-right py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((entry) => (
                <tr key={entry.date} className="border-b last:border-0">
                  <td className="py-2">{formatDate(entry.date)}</td>
                  <td className="text-right py-2">
                    {entry.completed_count}/{entry.total_activities}
                  </td>
                  <td className="text-right py-2">
                    {entry.total_points}/{entry.max_possible_points}
                  </td>
                  <td className="text-right py-2">
                    <span className={`font-medium ${
                      entry.percentage >= 80 ? 'text-green-600' :
                      entry.percentage >= 60 ? 'text-blue-600' :
                      entry.percentage >= 40 ? 'text-yellow-600' :
                      'text-red-500'
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
