import { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useActivities, useLogs, useScores } from './hooks/useApi';
import { useExercises } from './hooks/useWorkouts';
import { ActivityForm } from './components/ActivityForm';
import { ActivityList } from './components/ActivityList';
import { DailyTracker } from './components/DailyTracker';
import { ScoreDisplay } from './components/ScoreDisplay';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { CategoryManager } from './components/CategoryManager';
import { LoginScreen } from './components/LoginScreen';
import { RequestPasswordReset } from './components/RequestPasswordReset';
import { ResetPassword } from './components/ResetPassword';
import { Workout } from './components/Workout';
import { TodoList } from './components/TodoList';
import { PomodoroTimer } from './components/PomodoroTimer';
import { ActivitiesPage } from './components/ActivitiesPage';
import { Diet } from './components/Diet';
import { useAuth } from './contexts/AuthContext';
import { DayOfWeek, Activity, EnergyLevel, QualityRating, Score, CompletionType, ScheduleFrequency } from './types';

type View = 'tracker' | 'dashboard' | 'manage' | 'workout' | 'todo' | 'diet' | 'settings';

function formatDate(date: Date): string {
  // Use local date, not UTC, to avoid timezone shifting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isScheduledForDay(activity: Activity, date: Date): boolean {
  // Check biweekly scheduling first
  if (activity.schedule_frequency === 'biweekly') {
    if (!activity.biweekly_start_date) return false;
    const startDate = new Date(activity.biweekly_start_date);
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return false;
    const weeksDiff = Math.floor(daysDiff / 7);
    if (weeksDiff % 2 !== 0) return false;
  }

  // Check day of week
  if (activity.days_of_week === null) return true;
  const WEEKDAY_MAP: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const jsDay = date.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const dayName = WEEKDAY_MAP[dayIndex];
  return activity.days_of_week.includes(dayName);
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('tracker');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showActivities, setShowActivities] = useState(true);
  const [showPomodoroSidebar, setShowPomodoroSidebar] = useState(false);

  const dateStr = formatDate(currentDate);
  const { activities, fetchActivities, createActivity, updateActivity, deleteActivity } = useActivities();
  const { logs, fetchLogs, createLog, deleteLog } = useLogs(dateStr);
  const { dailyScore, weeklyScore, monthlyScore, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore } = useScores();
  const { exercises, fetchExercises } = useExercises();

  useEffect(() => {
    fetchActivities();
    fetchExercises();
  }, [fetchActivities, fetchExercises]);

  useEffect(() => {
    fetchLogs();
    fetchDailyScore(dateStr);
    fetchWeeklyScore(dateStr);
    fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1);
  }, [dateStr, fetchLogs, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore, currentDate]);

  // Calculate adjusted daily score excluding skipped activities
  const adjustedDailyScore = useMemo(() => {
    if (!dailyScore) return null;

    console.log('=== ADJUSTED SCORE CALC ===');
    console.log('Original dailyScore:', dailyScore);

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

    if (skippedIds.length === 0) {
      console.log('No skipped activities, returning original score');
      return dailyScore;
    }

    // Find skipped activities that are scheduled for today
    const skippedActivities = activities.filter(
      a => skippedIds.includes(a.id) && isScheduledForDay(a, currentDate)
    );

    // Calculate total points for skipped activities (only positive points affect max)
    const skippedPositivePoints = skippedActivities.reduce((sum, a) => sum + (a.points > 0 ? a.points : 0), 0);
    const skippedCount = skippedActivities.length;

    // Adjust the score
    const adjustedMaxPoints = dailyScore.max_possible_points - skippedPositivePoints;
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

    console.log('Adjusted score:', adjusted);
    console.log('======================');

    return adjusted;
  }, [dailyScore, activities, dateStr, currentDate]);

  const handleToggle = async (activityId: number, complete: boolean, logId?: number, energyLevel?: EnergyLevel | null, qualityRating?: QualityRating | null, ratingValue?: number | null, notes?: string | null) => {
    if (complete) {
      await createLog({ activity_id: activityId, completed_at: dateStr, energy_level: energyLevel, quality_rating: qualityRating, rating_value: ratingValue, notes: notes });
    } else if (logId) {
      await deleteLog(logId);
    }
    await Promise.all([
      fetchDailyScore(dateStr),
      fetchWeeklyScore(dateStr),
      fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1)
    ]);
  };

  const handleSubmitActivity = async (
    name: string,
    points: number,
    daysOfWeek: DayOfWeek[] | null,
    categoryId: number | null,
    completionType: CompletionType,
    ratingScale: number | null,
    scheduleFrequency: ScheduleFrequency,
    biweeklyStartDate: string | null,
    notes: string | null
  ) => {
    if (editingActivity) {
      await updateActivity(editingActivity.id, {
        name,
        points,
        days_of_week: daysOfWeek,
        category_id: categoryId,
        completion_type: completionType,
        rating_scale: ratingScale,
        schedule_frequency: scheduleFrequency,
        biweekly_start_date: biweeklyStartDate,
        notes
      });
      setEditingActivity(null);
    } else {
      await createActivity({
        name,
        points,
        days_of_week: daysOfWeek,
        category_id: categoryId,
        completion_type: completionType,
        rating_scale: ratingScale,
        schedule_frequency: scheduleFrequency,
        biweekly_start_date: biweeklyStartDate,
        notes
      });
      setShowAddForm(false);
    }
    // Ensure activities are refreshed along with logs and scores
    await Promise.all([
      fetchActivities(),
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
      fetchActivities(),
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

  const handleLogActivity = async (activityId: number, energyLevel: EnergyLevel | null, qualityRating: QualityRating | null) => {
    try {
      const now = new Date();
      const todayStr = formatDate(now);

      // If we're not viewing today, switch to today first
      const currentDateStr = formatDate(currentDate);
      if (currentDateStr !== todayStr) {
        setCurrentDate(now);
      }

      await createLog({
        activity_id: activityId,
        completed_at: todayStr, // Backend expects just the date, not full ISO timestamp
        energy_level: energyLevel,
        quality_rating: qualityRating,
      });

      // Force a refresh of all data for today
      await Promise.all([
        fetchLogs(),
        fetchDailyScore(todayStr),
        fetchWeeklyScore(todayStr),
        fetchMonthlyScore(now.getFullYear(), now.getMonth() + 1)
      ]);
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  };

  const handleCreateActivityFromPomodoro = async (activityData: { name: string; points: number }) => {
    try {
      await createActivity(activityData);
    } catch (error) {
      console.error('Failed to create activity:', error);
      throw error;
    }
  };

  const handleDeactivateActivity = async (activityId: number) => {
    try {
      await deleteActivity(activityId); // DELETE endpoint marks as inactive, doesn't actually delete
    } catch (error) {
      console.error('Failed to deactivate activity:', error);
      throw error;
    }
  };

  const handleMarkAllComplete = async () => {
    const confirmed = window.confirm(
      'Mark all scheduled activities for today as complete?'
    );

    if (!confirmed) return;

    try {
      // Get all activities scheduled for today that aren't already completed
      const scheduledActivities = activities.filter(a =>
        a.is_active && isScheduledForDay(a, currentDate)
      );

      // Find activities that don't have logs yet
      const loggedActivityIds = new Set(logs.map(log => log.activity_id));
      const unloggedActivities = scheduledActivities.filter(
        a => !loggedActivityIds.has(a.id)
      );

      // Create logs for all unlogged activities
      await Promise.all(
        unloggedActivities.map(activity =>
          createLog({
            activity_id: activity.id,
            completed_at: dateStr,
            energy_level: null,
            quality_rating: null,
            rating_value: null,
            notes: null,
          })
        )
      );

      // Refresh all data
      await Promise.all([
        fetchLogs(),
        fetchDailyScore(dateStr),
        fetchWeeklyScore(dateStr),
        fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1)
      ]);
    } catch (error) {
      console.error('Failed to mark all complete:', error);
      alert('Failed to mark all activities as complete. Please try again.');
    }
  };

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      'Reset all activities for today? This will remove all completions.'
    );

    if (!confirmed) return;

    try {
      // Delete all logs for today
      await Promise.all(logs.map(log => deleteLog(log.id)));

      // Refresh all data
      await Promise.all([
        fetchLogs(),
        fetchDailyScore(dateStr),
        fetchWeeklyScore(dateStr),
        fetchMonthlyScore(currentDate.getFullYear(), currentDate.getMonth() + 1)
      ]);
    } catch (error) {
      console.error('Failed to reset all:', error);
      alert('Failed to reset activities. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Activity Tracker</h1>
            <div className="flex items-center gap-3">
              {user?.profile_picture && (
                <img
                  src={user.profile_picture}
                  alt={user.name || user.email || ''}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.name || user?.email}
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
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'tracker', label: 'Today' },
              { id: 'todo', label: 'Todo' },
              { id: 'diet', label: 'Diet' },
              { id: 'workout', label: 'Workout' },
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
          <ActivitiesPage
            activities={activities}
            showAddForm={showAddForm}
            editingActivity={editingActivity}
            onSubmitActivity={handleSubmitActivity}
            onCancelForm={handleCancelForm}
            onEditActivity={handleEditActivity}
            onDeleteActivity={handleDeleteActivity}
            onShowAddForm={() => setShowAddForm(true)}
          />
        )}

        {view === 'dashboard' && <Dashboard />}

        {view === 'workout' && <Workout />}

        {view === 'todo' && <TodoList />}

        {view === 'diet' && <Diet />}

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
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Scores</h2>
              <ScoreDisplay
                dailyScore={adjustedDailyScore}
                weeklyScore={weeklyScore}
                monthlyScore={monthlyScore}
              />
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
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={handleMarkAllComplete}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      ✓ Mark All Complete
                    </button>
                    <button
                      onClick={handleResetAll}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      ↺ Reset All
                    </button>
                  </div>

                  <DailyTracker
                    activities={activities}
                    logs={logs}
                    date={dateStr}
                    currentDate={currentDate}
                    onToggle={handleToggle}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Floating Pomodoro Button */}
        <button
          onClick={() => setShowPomodoroSidebar(!showPomodoroSidebar)}
          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-40"
          title="Toggle Pomodoro Timer"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Pomodoro Sidebar */}
        {showPomodoroSidebar && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowPomodoroSidebar(false)}
            />

            {/* Sidebar Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Pomodoro Timer</h2>
                <button
                  onClick={() => setShowPomodoroSidebar(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <PomodoroTimer
                  activities={activities}
                  exercises={exercises}
                  onLogActivity={handleLogActivity}
                  onCreateActivity={handleCreateActivityFromPomodoro}
                  onDeactivateActivity={handleDeactivateActivity}
                />
              </div>
            </div>
          </>
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

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginScreen />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <RequestPasswordReset />}
        />
        <Route
          path="/reset-password/:token"
          element={user ? <Navigate to="/" replace /> : <ResetPassword />}
        />

        {/* Protected routes */}
        <Route
          path="/*"
          element={user ? <AuthenticatedApp /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
