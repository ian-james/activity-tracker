import { useEffect, useState, useMemo } from 'react';
import { useActivities, useLogs, useScores } from './hooks/useApi';
import { ActivityForm } from './components/ActivityForm';
import { ActivityList } from './components/ActivityList';
import { DailyTracker } from './components/DailyTracker';
import { ScoreDisplay } from './components/ScoreDisplay';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { CategoryManager } from './components/CategoryManager';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { DayOfWeek, Activity, EnergyLevel, QualityRating, Score } from './types';

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

function isScheduledForDay(daysOfWeek: DayOfWeek[] | null, date: Date): boolean {
  if (daysOfWeek === null) return true;
  const WEEKDAY_MAP: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const jsDay = date.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const dayName = WEEKDAY_MAP[dayIndex];
  return daysOfWeek.includes(dayName);
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('tracker');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showActivities, setShowActivities] = useState(true);

  const dateStr = formatDate(currentDate);
  const { activities, fetchActivities, createActivity, updateActivity, deleteActivity } = useActivities();
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

  // Calculate adjusted daily score excluding skipped activities
  const adjustedDailyScore = useMemo(() => {
    if (!dailyScore) return null;

    // Get skipped activities from localStorage
    const stored = localStorage.getItem(`skipped-activities-${dateStr}`);
    let skippedIds: number[] = [];
    if (stored) {
      try {
        skippedIds = JSON.parse(stored);
      } catch {
        skippedIds = [];
      }
    }

    if (skippedIds.length === 0) return dailyScore;

    // Find skipped activities that are scheduled for today
    const skippedActivities = activities.filter(
      a => skippedIds.includes(a.id) && isScheduledForDay(a.days_of_week, currentDate)
    );

    // Calculate total points for skipped activities
    const skippedPoints = skippedActivities.reduce((sum, a) => sum + a.points, 0);
    const skippedCount = skippedActivities.length;

    // Adjust the score
    const adjustedMaxPoints = dailyScore.max_possible_points - skippedPoints;
    const adjustedTotalActivities = dailyScore.total_activities - skippedCount;
    const adjustedPercentage = adjustedTotalActivities > 0
      ? Math.round((dailyScore.completed_count / adjustedTotalActivities) * 100)
      : 0;

    const adjusted: Score = {
      ...dailyScore,
      max_possible_points: adjustedMaxPoints,
      total_activities: adjustedTotalActivities,
      percentage: adjustedPercentage,
    };

    return adjusted;
  }, [dailyScore, activities, dateStr, currentDate]);

  const handleToggle = async (activityId: number, complete: boolean, logId?: number, energyLevel?: EnergyLevel | null, qualityRating?: QualityRating | null) => {
    if (complete) {
      await createLog({ activity_id: activityId, completed_at: dateStr, energy_level: energyLevel, quality_rating: qualityRating });
    } else if (logId) {
      await deleteLog(logId);
    }
    await Promise.all([
      fetchDailyScore(dateStr),
      fetchWeeklyScore(dateStr),
      fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1)
    ]);
  };

  const handleSubmitActivity = async (name: string, points: number, daysOfWeek: DayOfWeek[] | null, categoryId: number | null) => {
    if (editingActivity) {
      await updateActivity(editingActivity.id, { name, points, days_of_week: daysOfWeek, category_id: categoryId });
      setEditingActivity(null);
    } else {
      await createActivity({ name, points, days_of_week: daysOfWeek, category_id: categoryId });
      setShowAddForm(false);
    }
    await Promise.all([
      fetchLogs(),
      fetchDailyScore(dateStr),
      fetchWeeklyScore(dateStr),
      fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1)
    ]);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setShowAddForm(false);
  };

  const handleDeleteActivity = async (id: number) => {
    await deleteActivity(id);
    await Promise.all([
      fetchLogs(),
      fetchDailyScore(dateStr),
      fetchWeeklyScore(dateStr),
      fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1)
    ]);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingActivity(null);
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Activity Tracker</h1>
            <div className="flex items-center gap-3">
              {user.profile_picture && (
                <img
                  src={user.profile_picture}
                  alt={user.name || user.email}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
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
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Your Activities</h2>
                {!showAddForm && !editingActivity && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Add Activity
                  </button>
                )}
              </div>
              {showAddForm && (
                <ActivityForm onSubmit={handleSubmitActivity} onCancel={handleCancelForm} />
              )}
              {editingActivity && (
                <ActivityForm
                  onSubmit={handleSubmitActivity}
                  onCancel={handleCancelForm}
                  initialActivity={editingActivity}
                />
              )}
              <ActivityList activities={activities} onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
            </div>

            <div className="border-t border-gray-300 dark:border-gray-700 pt-8">
              <CategoryManager />
            </div>
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
                dailyScore={adjustedDailyScore}
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

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show authenticated app
  return <AuthenticatedApp />;
}

export default App;
