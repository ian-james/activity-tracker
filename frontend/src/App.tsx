import { useEffect, useState } from 'react';
import { useActivities, useLogs, useScores } from './hooks/useApi';
import { ActivityForm } from './components/ActivityForm';
import { ActivityList } from './components/ActivityList';
import { DailyTracker } from './components/DailyTracker';
import { ScoreDisplay } from './components/ScoreDisplay';
import { DayOfWeek } from './types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showManage, setShowManage] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const dateStr = formatDate(currentDate);
  const { activities, fetchActivities, createActivity, deleteActivity } = useActivities();
  const { logs, fetchLogs, createLog, deleteLog } = useLogs(dateStr);
  const { dailyScore, weeklyScore, monthlyScore, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore } = useScores();

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchLogs();
    fetchDailyScore(dateStr);
    fetchWeeklyScore(dateStr);
    fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1);
  }, [dateStr, fetchLogs, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore, currentDate]);

  const handleToggle = async (activityId: number, complete: boolean, logId?: number) => {
    if (complete) {
      await createLog({ activity_id: activityId, completed_at: dateStr });
    } else if (logId) {
      await deleteLog(logId);
    }
    fetchDailyScore(dateStr);
    fetchWeeklyScore(dateStr);
    fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1);
  };

  const handleAddActivity = async (name: string, points: number, daysOfWeek: DayOfWeek[] | null) => {
    await createActivity({ name, points, days_of_week: daysOfWeek });
    setShowAddForm(false);
  };

  const handleDeleteActivity = async (id: number) => {
    await deleteActivity(id);
    fetchLogs();
    fetchDailyScore(dateStr);
    fetchWeeklyScore(dateStr);
    fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-4">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Activity Tracker</h1>
          <button
            onClick={() => setShowManage(!showManage)}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            {showManage ? 'Back to Tracker' : 'Manage Activities'}
          </button>
        </header>

        {showManage ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Activities</h2>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add Activity
                </button>
              )}
            </div>
            {showAddForm && (
              <ActivityForm onSubmit={handleAddActivity} onCancel={() => setShowAddForm(false)} />
            )}
            <ActivityList activities={activities} onDelete={handleDeleteActivity} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => changeDate(-1)}
                className="text-2xl px-3 py-1 hover:bg-gray-200 rounded"
              >
                &lt;
              </button>
              <span className="text-lg font-medium">{formatDisplayDate(currentDate)}</span>
              <button
                onClick={() => changeDate(1)}
                className="text-2xl px-3 py-1 hover:bg-gray-200 rounded"
              >
                &gt;
              </button>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Today's Activities</h2>
              <DailyTracker
                activities={activities}
                logs={logs}
                date={dateStr}
                currentDate={currentDate}
                onToggle={handleToggle}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Scores</h2>
              <ScoreDisplay
                dailyScore={dailyScore}
                weeklyScore={weeklyScore}
                monthlyScore={monthlyScore}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
