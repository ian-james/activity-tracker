import { useState, useEffect } from 'react';
import { useWorkoutSessions } from '../../hooks/useWorkouts';
import { formatTime } from '../../hooks/useWorkoutTimer';

export function WorkoutHistory() {
  const { sessions, fetchSessions, deleteSession } = useWorkoutSessions(30);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this workout session?')) {
      try {
        await deleteSession(id);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const completedSessions = sessions.filter(s => s.completed_at);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Workout History</h3>
        <select
          value={daysFilter}
          onChange={(e) => setDaysFilter(parseInt(e.target.value))}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {completedSessions.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">
          No completed workouts yet. Start your first workout to see it here!
        </div>
      ) : (
        <div className="space-y-3">
          {completedSessions.map((session) => {
            const duration = session.total_duration || 0;
            const startDate = new Date(session.started_at);

            return (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">
                      {session.name || 'Workout Session'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Duration: </span>
                    <span className="font-medium">{formatTime(duration)}</span>
                  </div>
                  {session.paused_duration > 0 && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Paused: </span>
                      <span className="font-medium">{formatTime(session.paused_duration)}</span>
                    </div>
                  )}
                </div>

                {session.notes && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {session.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
