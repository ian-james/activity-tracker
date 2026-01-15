import { useEffect, useState } from 'react';

interface StreakData {
  activity_id: number;
  activity_name: string;
  points: number;
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
}

interface StreakSummary {
  total_activities: number;
  active_streaks: number;
  best_current_streak: number;
  best_longest_streak: number;
}

interface StreaksResponse {
  streaks: StreakData[];
  summary: StreakSummary;
}

export function Streaks() {
  const [data, setData] = useState<StreaksResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreaks();
  }, []);

  const fetchStreaks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/streaks', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch streaks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-gray-600 dark:text-gray-400">Loading streaks...</div>
      </div>
    );
  }

  if (!data || data.streaks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Activity Streaks
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No activity data yet. Complete activities to start building streaks!
        </p>
      </div>
    );
  }

  const getStreakEmoji = (streak: number): string => {
    if (streak === 0) return '⚪';
    if (streak < 3) return '🔵';
    if (streak < 7) return '🟢';
    if (streak < 14) return '🟡';
    if (streak < 30) return '🟠';
    return '🔥';
  };

  const getStreakBadge = (streak: number): string => {
    if (streak === 0) return 'No Streak';
    if (streak < 3) return 'Starting';
    if (streak < 7) return 'Building';
    if (streak < 14) return 'Strong';
    if (streak < 30) return 'Impressive';
    return 'On Fire!';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.summary.active_streaks}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Streaks</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.summary.best_current_streak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Best Current</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.summary.best_longest_streak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Best Ever</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.summary.total_activities}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Activities</div>
        </div>
      </div>

      {/* Streak List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Activity Streaks
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Keep your streaks alive by completing activities daily
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.streaks.map((streak) => (
            <div
              key={streak.activity_id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-3xl">
                    {getStreakEmoji(streak.current_streak)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">
                      {streak.activity_name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {streak.points} points
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      {streak.current_streak}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getStreakBadge(streak.current_streak)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                      {streak.longest_streak}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Best
                    </div>
                  </div>

                  {streak.last_completed && (
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(streak.last_completed).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar for current streak */}
              {streak.current_streak > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min((streak.current_streak / 30) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {streak.current_streak < 30 ? `${30 - streak.current_streak} days to 30-day milestone` : '30+ day streak!'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Motivation Message */}
      {data.summary.active_streaks > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow p-6 text-white">
          <div className="text-lg font-semibold mb-2">
            🎯 Keep it up!
          </div>
          <div className="text-sm opacity-90">
            You have {data.summary.active_streaks} active {data.summary.active_streaks === 1 ? 'streak' : 'streaks'}.
            Don't break the chain!
          </div>
        </div>
      )}
    </div>
  );
}
