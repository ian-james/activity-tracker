import { useEffect, useState } from 'react';

interface ActivityStats {
  name: string;
  points: number;
  completed: number;
  expected: number;
  completion_rate: number;
}

interface DayCompletion {
  day: string;
  day_num: number;
  completed: number;
  total: number;
  completion_rate: number;
}

interface AnalyticsData {
  date_range: {
    start_date: string;
    end_date: string;
    days: number;
  };
  completion_by_day_of_week: DayCompletion[];
  best_activities: ActivityStats[];
  worst_activities: ActivityStats[];
  overall_stats: {
    total_activities: number;
    total_completions: number;
    average_per_day: number;
    overall_completion_rate: number;
  };
  trend: {
    direction: string;
    first_half_avg: number;
    second_half_avg: number;
  };
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/statistics?days=${days}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-gray-600 dark:text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          No analytics data available
        </p>
      </div>
    );
  }

  const getTrendIcon = (direction: string): string => {
    if (direction === 'improving') return '📈';
    if (direction === 'declining') return '📉';
    return '➡️';
  };

  const getTrendColor = (direction: string): string => {
    if (direction === 'improving') return 'text-green-600 dark:text-green-400';
    if (direction === 'declining') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-blue-500';
    if (rate >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.overall_stats.total_completions}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Completions</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.overall_stats.average_per_day}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Per Day</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.overall_stats.overall_completion_rate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className={`text-2xl font-bold ${getTrendColor(data.trend.direction)}`}>
            {getTrendIcon(data.trend.direction)} {data.trend.direction}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Trend</div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          📈 Trend Analysis
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">First Half Average</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {data.trend.first_half_avg}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">completions/day</div>
          </div>

          <div className={`text-4xl ${getTrendColor(data.trend.direction)}`}>
            {getTrendIcon(data.trend.direction)}
          </div>

          <div className="flex-1 text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Second Half Average</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {data.trend.second_half_avg}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">completions/day</div>
          </div>
        </div>

        <div className={`mt-4 p-3 rounded-lg text-sm ${
          data.trend.direction === 'improving'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : data.trend.direction === 'declining'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        }`}>
          <strong>
            {data.trend.direction === 'improving' && '🎉 Great job! Your activity completion is improving.'}
            {data.trend.direction === 'declining' && '⚠️ Your activity completion has declined. Consider adjusting your goals.'}
            {data.trend.direction === 'stable' && '✅ Your activity completion is consistent.'}
          </strong>
        </div>
      </div>

      {/* Completion by Day of Week */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Completion Rate by Day of Week
        </h3>
        <div className="space-y-3">
          {data.completion_by_day_of_week.map((day) => (
            <div key={day.day_num}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {day.day}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {day.completed}/{day.total} ({day.completion_rate}%)
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getCompletionColor(day.completion_rate)} transition-all`}
                  style={{ width: `${day.completion_rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Performing Activities */}
      {data.best_activities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            🏆 Best Performing Activities
          </h3>
          <div className="space-y-3">
            {data.best_activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'}</div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100">
                      {activity.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.completed}/{activity.expected} completed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {activity.completion_rate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {activity.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worst Performing Activities */}
      {data.worst_activities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            📊 Needs Improvement
          </h3>
          <div className="space-y-3">
            {data.worst_activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {activity.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.completed}/{activity.expected} completed
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {activity.completion_rate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {activity.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
