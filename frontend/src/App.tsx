import { useEffect, useState } from 'react';
import { useActivities, useLogs, useScores } from './hooks/useApi';
import { ActivityForm } from './components/ActivityForm';
import { ActivityList } from './components/ActivityList';
import { DailyTracker } from './components/DailyTracker';
import { ScoreDisplay } from './components/ScoreDisplay';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { DayOfWeek } from './types';

type View = 'tracker' | 'dashboard' | 'manage' | 'settings';

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
  const [view, setView] = useState<View>('tracker');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showActivities, setShowActivities] = useState(true);

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Activity Tracker</h1>
          <nav className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
            {[
              { id: 'tracker', label: 'Today' },
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'manage', label: 'Activities' },
              { id: 'settings', label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as View)}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  view === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {view === 'manage' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Your Activities</h2>
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
        )}

        {view === 'dashboard' && <Dashboard />}

        {view === 'settings' && <Settings />}

        {view === 'tracker' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => changeDate(-1)}
                className="text-2xl px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-800 dark:text-gray-100"
              >
                &lt;
              </button>
              <span className="text-lg font-medium text-gray-800 dark:text-gray-100">{formatDisplayDate(currentDate)}</span>
              <button
                onClick={() => changeDate(1)}
                className="text-2xl px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-800 dark:text-gray-100"
              >
                &gt;
              </button>
            </div>

            <div>
              <button
                onClick={() => setShowActivities(!showActivities)}
                className="flex items-center justify-between w-full mb-3"
              >
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Today's Activities</h2>
                <svg
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                    showActivities ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showActivities && (
                <DailyTracker
                  activities={activities}
                  logs={logs}
                  date={dateStr}
                  currentDate={currentDate}
                  onToggle={handleToggle}
                />
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Scores</h2>
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
