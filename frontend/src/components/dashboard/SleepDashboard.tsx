import { useState, useEffect } from 'react';
import { useSleepLogs } from '../../hooks/useApi';
import { SleepLogCreate, SleepQuality } from '../../types';

export function SleepDashboard() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const { sleepLogs, loading, fetchSleepLogs, logSleep, deleteSleepLog } = useSleepLogs(days);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<SleepLogCreate>({
    log_date: new Date().toISOString().split('T')[0],
    hours_slept: 8,
    quality_rating: null,
    notes: '',
  });

  useEffect(() => {
    fetchSleepLogs();
  }, [fetchSleepLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logSleep(formData);
    setShowForm(false);
    setFormData({
      log_date: new Date().toISOString().split('T')[0],
      hours_slept: 8,
      quality_rating: null,
      notes: '',
    });
  };

  // Calculate averages
  const avgHours = sleepLogs.length > 0
    ? sleepLogs.reduce((sum, log) => sum + log.hours_slept, 0) / sleepLogs.length
    : 0;

  const qualityCounts = sleepLogs.reduce((acc, log) => {
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
                {sleepLogs.length}
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

          {/* Quick Log Button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full mb-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ Log Sleep'}
          </button>

          {/* Log Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.log_date}
                    onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                    required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hours Slept
                  </label>
                  <input
                    type="number"
                    value={formData.hours_slept}
                    onChange={(e) => setFormData({ ...formData, hours_slept: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    max="24"
                    step="0.5"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quality
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['poor', 'fair', 'good', 'excellent'] as SleepQuality[]).map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => setFormData({ ...formData, quality_rating: quality })}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        formData.quality_rating === quality
                          ? getQualityBg(quality) + ' ' + getQualityColor(quality) + ' ring-2 ring-offset-1'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Save Sleep Log
              </button>
            </form>
          )}

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
            {sleepLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {log.hours_slept}h
                    </span>
                  </div>
                  {log.quality_rating && (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getQualityBg(log.quality_rating)} ${getQualityColor(log.quality_rating)}`}>
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
                <button
                  onClick={() => {
                    if (confirm('Delete this sleep log?')) {
                      deleteSleepLog(log.id);
                    }
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors ml-2"
                >
                  Delete
                </button>
              </div>
            ))}
            {sleepLogs.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                No sleep logs yet. Click "+ Log Sleep" to get started.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
