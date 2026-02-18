import { useState, useEffect } from 'react';
import { MoodLog, MoodLogCreate, MoodTrend } from '../../types';
import { fetchApi } from '../../hooks/useApi';

export function MoodTracker() {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [trends, setTrends] = useState<MoodTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [newMood, setNewMood] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, trendsData] = await Promise.all([
        fetchApi<MoodLog[]>('/api/mood/logs?days=7'),
        fetchApi<MoodTrend[]>('/api/mood/trends?days=7'),
      ]);
      setLogs(logsData);
      setTrends(trendsData);
    } catch (err) {
      console.error('Failed to fetch mood data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMoodLog = async () => {
    const now = new Date();
    const logCreate: MoodLogCreate = {
      log_date: now.toISOString().split('T')[0],
      log_time: now.toTimeString().split(' ')[0],
      mood_rating: newMood,
      notes: notes.trim() || null,
    };

    try {
      await fetchApi<MoodLog>('/api/mood/logs', {
        method: 'POST',
        body: JSON.stringify(logCreate),
      });
      setShowLogForm(false);
      setNotes('');
      setNewMood(5);
      fetchData();
    } catch (err) {
      console.error('Failed to log mood:', err);
    }
  };

  const deleteMoodLog = async (id: number) => {
    try {
      await fetchApi(`/api/mood/logs/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete mood log:', err);
    }
  };

  const getMoodEmoji = (rating: number): string => {
    if (rating >= 9) return '😄';
    if (rating >= 7) return '😊';
    if (rating >= 5) return '😐';
    if (rating >= 3) return '😔';
    return '😢';
  };

  const getMoodColor = (rating: number): string => {
    if (rating >= 8) return 'text-green-600 dark:text-green-400';
    if (rating >= 6) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const averageMood = trends.length > 0
    ? trends.reduce((sum, t) => sum + t.average_mood, 0) / trends.length
    : null;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-xl">😊</span>
          Mood Tracker
        </h3>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
        >
          {showLogForm ? 'Cancel' : '+ Log Mood'}
        </button>
      </div>

      {/* Log Form */}
      {showLogForm && (
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How are you feeling? (1-10)
          </label>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="range"
              min="1"
              max="10"
              value={newMood}
              onChange={(e) => setNewMood(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className={`text-3xl ${getMoodColor(newMood)} font-bold min-w-[50px] text-center`}>
              {getMoodEmoji(newMood)} {newMood}
            </span>
          </div>
          <input
            type="text"
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm mb-2"
          />
          <button
            onClick={addMoodLog}
            className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            Save Mood
          </button>
        </div>
      )}

      {/* Average Mood */}
      {averageMood !== null && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              7-Day Average
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getMoodColor(averageMood)}`}>
                {getMoodEmoji(Math.round(averageMood))} {averageMood.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Recent Logs
        </h4>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No mood logs yet. Click "+ Log Mood" to start tracking!
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${getMoodColor(log.mood_rating)}`}>
                      {getMoodEmoji(log.mood_rating)}
                    </span>
                    <span className={`text-lg font-bold ${getMoodColor(log.mood_rating)}`}>
                      {log.mood_rating}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.log_date + 'T' + log.log_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">{log.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteMoodLog(log.id)}
                  className="text-red-500 hover:text-red-600 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
