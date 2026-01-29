import { useEffect, useState } from 'react';

interface ActivityStats {
  activity_id: number;
  activity_name: string;
  total_completions: number;
  completion_rate: number;
  current_streak: number;
  best_streak: number;
  last_completed: string | null;
  avg_energy: number | null;
  avg_quality: number | null;
  avg_rating: number | null;
}

interface Props {
  activityId: number;
  activityName: string;
  onClose: () => void;
}

export function ActivityStatsModal({ activityId, activityName, onClose }: Props) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [activityId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/activities/${activityId}/stats`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatEnergyLevel = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value <= 1.33) return '🔋 Low';
    if (value <= 2.33) return '⚡ Medium';
    return '⚡⚡ High';
  };

  const formatQualityRating = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value <= 1.33) return '⭐ Okay';
    if (value <= 2.33) return '⭐⭐ Good';
    return '⭐⭐⭐ Excellent';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Activity Statistics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading statistics...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {stats && !loading && !error && (
            <div className="space-y-6">
              {/* Activity Name */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activity_name}
                </h3>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.total_completions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Total Completions
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.completion_rate}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Completion Rate
                  </div>
                </div>
              </div>

              {/* Streaks */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Streaks
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Current Streak</span>
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      🔥 {stats.current_streak} {stats.current_streak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">Best Streak</span>
                    <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ⭐ {stats.best_streak} {stats.best_streak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Last Completed */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Last Completed
                </h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {formatDate(stats.last_completed)}
                  </span>
                </div>
              </div>

              {/* Averages (if available) */}
              {(stats.avg_energy !== null || stats.avg_quality !== null || stats.avg_rating !== null) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Average Performance
                  </h4>
                  <div className="space-y-2">
                    {stats.avg_energy !== null && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">Energy Level</span>
                        <span className="text-lg font-medium">
                          {formatEnergyLevel(stats.avg_energy)}
                        </span>
                      </div>
                    )}
                    {stats.avg_quality !== null && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">Quality Rating</span>
                        <span className="text-lg font-medium">
                          {formatQualityRating(stats.avg_quality)}
                        </span>
                      </div>
                    )}
                    {stats.avg_rating !== null && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">Rating</span>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {stats.avg_rating.toFixed(1)} / 5
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
