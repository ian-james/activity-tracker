import { useState, useEffect } from 'react';
import { useActivities, useLogs } from '../../hooks/useApi';
import { SleepQuality, LogCreate } from '../../types';

export function SleepDashboard() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const { activities, fetchActivities } = useActivities();
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Find sleep activity - look for activity with "sleep" in the name
  const sleepActivity = activities.find(a =>
    a.is_active && a.name.toLowerCase().includes('sleep')
  );

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (!sleepActivity) return;

    const fetchSleepLogs = async () => {
      setLoading(true);
      try {
        const promises = [];
        const today = new Date();
        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          promises.push(
            fetch(`/api/logs?date=${dateStr}`, { credentials: 'include' })
              .then(res => res.ok ? res.json() : [])
              .catch(() => [])
          );
        }
        const results = await Promise.all(promises);
        const logs = results
          .flat()
          .filter(log => log.activity_id === sleepActivity.id)
          .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        setAllLogs(logs);
      } finally {
        setLoading(false);
      }
    };

    fetchSleepLogs();
  }, [sleepActivity, days]);

  // Calculate averages
  const logsWithDuration = allLogs.filter(log => log.duration_hours);
  const avgHours = logsWithDuration.length > 0
    ? logsWithDuration.reduce((sum, log) => sum + log.duration_hours, 0) / logsWithDuration.length
    : 0;

  const qualityCounts = allLogs.reduce((acc, log) => {
    if (log.quality_rating) {
      acc[log.quality_rating] = (acc[log.quality_rating] || 0) + 1;
    }
    return acc;
  }, {} as Record<SleepQuality, number>);

  const totalWithQuality = Object.values(qualityCounts).reduce((sum, count) => sum + count, 0);

  const getQualityColor = (quality: SleepQuality | null) => {
    if (!quality) return 'text-gray-500 dark:text-gray-400';
    switch (quality) {
      case 'excellent': return 'text-green-600 dark:text-green-400';
      case 'good': return 'text-blue-600 dark:text-blue-400';
      case 'fair': return 'text-yellow-600 dark:text-yellow-400';
      case 'poor': return 'text-red-600 dark:text-red-400';
    }
  };

  const getQualityBg = (quality: SleepQuality) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 dark:bg-green-900/30';
      case 'good': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'fair': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'poor': return 'bg-red-100 dark:bg-red-900/30';
    }
  };

  const getQualityBarBg = (quality: SleepQuality) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500 dark:bg-green-400';
      case 'good': return 'bg-blue-500 dark:bg-blue-400';
      case 'fair': return 'bg-yellow-500 dark:bg-yellow-400';
      case 'poor': return 'bg-red-500 dark:bg-red-400';
    }
  };

  if (!sleepActivity) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="text-xl">😴</span>
            Sleep Quality & Time
          </h3>
        </div>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <p className="mb-2">No Sleep activity found.</p>
          <p className="text-sm">Create an activity with "Sleep" in the name on the Activities page to start tracking sleep.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-xl">😴</span>
          Sleep Quality & Time
        </h3>
        <div className="flex gap-2">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                days === d
                  ? 'bg-purple-500 text-white'
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
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {avgHours > 0 ? avgHours.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avg Hours</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {allLogs.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Nights Logged</div>
            </div>
            {totalWithQuality > 0 && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(((qualityCounts.good || 0) + (qualityCounts.excellent || 0)) / totalWithQuality * 100)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Good+ Quality</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {qualityCounts.excellent || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Excellent Nights</div>
                </div>
              </>
            )}
          </div>

          {/* Info about logging */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              💡 <strong>Tip:</strong> Log sleep from the Today page by completing the "{sleepActivity.name}" activity.
              Add duration and quality rating when logging.
            </p>
          </div>

          {/* Quality Distribution */}
          {totalWithQuality > 0 && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">
                Sleep Quality Distribution
              </h4>
              <div className="space-y-2">
                {(['excellent', 'good', 'fair', 'poor'] as SleepQuality[]).map((quality) => {
                  const count = qualityCounts[quality] || 0;
                  const percentage = (count / totalWithQuality) * 100;

                  return count > 0 ? (
                    <div key={quality} className="flex items-center gap-2">
                      <div className="w-20 text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {quality}
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden relative">
                        <div
                          className={`h-full ${getQualityBarBg(quality)} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end px-2">
                          <span className={`text-xs font-semibold ${getQualityColor(quality)}`}>
                            {count} night{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="w-12 text-xs font-semibold text-right text-gray-800 dark:text-gray-200">
                        {Math.round(percentage)}%
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Recent Logs */}
          <div className="space-y-2">
            {allLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {new Date(log.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {log.duration_hours && (
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {log.duration_hours}h
                      </span>
                    )}
                  </div>
                  {log.quality_rating && (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getQualityBg(log.quality_rating as SleepQuality)} ${getQualityColor(log.quality_rating as SleepQuality)}`}>
                        {log.quality_rating === 'excellent' && '⭐ '}
                        {log.quality_rating === 'good' && '✓ '}
                        {log.quality_rating === 'fair' && '~ '}
                        {log.quality_rating === 'poor' && '✗ '}
                        {log.quality_rating.charAt(0).toUpperCase() + log.quality_rating.slice(1)} Sleep
                      </span>
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{log.notes}</p>
                  )}
                </div>
              </div>
            ))}
            {allLogs.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                No sleep logs yet. Complete the "{sleepActivity.name}" activity on the Today page to start tracking.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
