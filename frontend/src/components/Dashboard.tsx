import { useEffect, useState } from 'react';
import { useHistory, useCategorySummary } from '../hooks/useApi';
import { CalendarGrid } from './CalendarGrid';
import { Streaks } from './Streaks';
import { Analytics } from './Analytics';

type TimeRange = 7 | 14 | 28;
type DashboardView = 'overview' | 'streaks' | 'analytics';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function Dashboard() {
  const { history, loading, fetchHistory } = useHistory();
  const { categorySummaries, loading: categoriesLoading, fetchCategorySummary } = useCategorySummary();
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [view, setView] = useState<DashboardView>('overview');

  useEffect(() => {
    fetchHistory(timeRange);
    fetchCategorySummary(timeRange);
  }, [fetchHistory, fetchCategorySummary, timeRange]);

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
      {/* View Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'streaks', label: 'Streaks' },
            { id: 'analytics', label: 'Analytics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as DashboardView)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                view === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'overview' && (
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
        )}
      </div>

      {/* Streaks View */}
      {view === 'streaks' && <Streaks />}

      {/* Analytics View */}
      {view === 'analytics' && <Analytics />}

      {/* Overview View */}
      {view === 'overview' && (
        <>
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

          {/* Daily Progress */}
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

          {/* Category Progress */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex items-center justify-between w-full text-left mb-4"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Category Progress</h3>
              <svg
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                  showCategories ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCategories && (
              <div>
                {categoriesLoading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
                ) : categorySummaries.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">No category data yet</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categorySummaries.map((summary) => (
                      <div
                        key={summary.category_id ?? 'uncategorized'}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: summary.category_color }}
                          />
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {summary.category_name}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Completion</span>
                            <span
                              className="font-semibold"
                              style={{ color: summary.category_color }}
                            >
                              {summary.percentage}%
                            </span>
                          </div>

                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${summary.percentage}%`,
                                backgroundColor: summary.category_color,
                              }}
                            />
                          </div>

                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>{summary.completed_count}/{summary.total_activities} activities</span>
                            <span>{summary.total_points}/{summary.max_possible_points} pts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Daily Breakdown</h3>
              <svg
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                  showBreakdown ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showBreakdown && (
              <div className="overflow-x-auto mt-4">
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
