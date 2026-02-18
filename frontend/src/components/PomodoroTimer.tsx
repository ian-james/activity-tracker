import { useState, useEffect } from 'react';
import { Activity, EnergyLevel, QualityRating, Exercise, ActivityCreate } from '../types';

type Phase = 'idle' | 'countdown' | 'work' | 'break' | 'complete';

interface PomodoroTimerProps {
  activities: Activity[];
  exercises: Exercise[];
  onLogActivity?: (activityId: number, energyLevel: EnergyLevel | null, qualityRating: QualityRating | null) => Promise<void>;
  onCreateActivity?: (activity: ActivityCreate) => Promise<void>;
  onDeactivateActivity?: (activityId: number) => Promise<void>;
}

interface SessionStats {
  completedSessions: number;
  totalFocusTime: number; // in minutes
}

export function PomodoroTimer({ activities, exercises, onLogActivity, onCreateActivity, onDeactivateActivity }: PomodoroTimerProps) {
  // Timer configuration
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes] = useState(5);
  const [autoLog, setAutoLog] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  // Timer state
  const [phase, setPhase] = useState<Phase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [countdownSeconds, setCountdownSeconds] = useState(5);

  // Session tracking
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    completedSessions: 0,
    totalFocusTime: 0,
  });

  // Activity logging state
  const [selectedEnergyLevel, setSelectedEnergyLevel] = useState<EnergyLevel | null>(null);
  const [selectedQualityRating, setSelectedQualityRating] = useState<QualityRating | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);

  // Suggested break activity
  const [suggestedExercise, setSuggestedExercise] = useState<Exercise | null>(null);

  // New activity form state
  const [showNewActivityForm, setShowNewActivityForm] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityPoints, setNewActivityPoints] = useState(1);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [isCurrentActivityOneOff, setIsCurrentActivityOneOff] = useState(false);

  // Update secondsLeft when workMinutes changes
  useEffect(() => {
    if (phase === 'idle') {
      setSecondsLeft(workMinutes * 60);
    }
  }, [workMinutes, phase]);

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownSeconds <= 0) {
      setPhase('work');
      setSecondsLeft(workMinutes * 60);
      setIsRunning(true);
      return;
    }
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, countdownSeconds, workMinutes]);

  // Main timer effect
  useEffect(() => {
    if (!isRunning || phase === 'countdown' || phase === 'idle' || phase === 'complete') return;

    if (secondsLeft <= 0) {
      if (phase === 'work') {
        // Work session complete
        const newStats = {
          completedSessions: sessionStats.completedSessions + 1,
          totalFocusTime: sessionStats.totalFocusTime + workMinutes,
        };
        setSessionStats(newStats);

        // Auto-log if enabled
        if (autoLog && selectedActivityId && onLogActivity) {
          onLogActivity(selectedActivityId, null, null).then(() => {
            // Deactivate one-off activities after logging
            if (isCurrentActivityOneOff && onDeactivateActivity) {
              onDeactivateActivity(selectedActivityId).catch((error) => {
                console.error('Failed to deactivate one-off activity:', error);
              });
              setIsCurrentActivityOneOff(false);
            }
          }).catch((error) => {
            console.error('Failed to auto-log activity:', error);
          });
        }

        // Suggest a random exercise for break
        if (exercises.length > 0) {
          const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
          setSuggestedExercise(randomExercise);
        }

        setPhase('break');
        setSecondsLeft(breakMinutes * 60);
        setIsRunning(true);
      } else if (phase === 'break') {
        // Break complete, return to idle
        setPhase('complete');
        setIsRunning(false);
        setSuggestedExercise(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, phase, workMinutes, breakMinutes, sessionStats, autoLog, selectedActivityId, onLogActivity, exercises]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsRunning(false);
    };
  }, []);

  const handleStart = () => {
    setCountdownSeconds(5);
    setPhase('countdown');
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhase('idle');
    setSecondsLeft(workMinutes * 60);
    setCountdownSeconds(5);
    setSuggestedExercise(null);
  };

  const handleSkipBreak = () => {
    setPhase('complete');
    setIsRunning(false);
    setSuggestedExercise(null);
  };

  const handleNewSession = () => {
    setPhase('idle');
    setSecondsLeft(workMinutes * 60);
    setLogSuccess(false);
    setSelectedEnergyLevel(null);
    setSelectedQualityRating(null);
    setIsCurrentActivityOneOff(false);
  };

  const handleLogFromComplete = async () => {
    if (!selectedActivityId || !onLogActivity) return;

    try {
      await onLogActivity(selectedActivityId, selectedEnergyLevel, selectedQualityRating);
      setLogSuccess(true);
      setTimeout(() => {
        setLogSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim() || !onCreateActivity) return;

    const activityName = newActivityName;
    const isOneOff = !saveForFuture;

    try {
      await onCreateActivity({
        name: activityName,
        points: newActivityPoints,
      });

      // Find and select the newly created activity
      setTimeout(() => {
        const newActivity = activities.find(a => a.name === activityName);
        if (newActivity) {
          setSelectedActivityId(newActivity.id);
          setIsCurrentActivityOneOff(isOneOff);
        }
      }, 100);

      setNewActivityName('');
      setNewActivityPoints(1);
      setSaveForFuture(true);
      setShowNewActivityForm(false);
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  };

  const handleCompleteEarly = () => {
    if (phase !== 'work') return;

    // Mark session as complete
    const newStats = {
      completedSessions: sessionStats.completedSessions + 1,
      totalFocusTime: sessionStats.totalFocusTime + workMinutes,
    };
    setSessionStats(newStats);

    // Auto-log if enabled
    if (autoLog && selectedActivityId && onLogActivity) {
      onLogActivity(selectedActivityId, null, null).then(() => {
        // Deactivate one-off activities after logging
        if (isCurrentActivityOneOff && onDeactivateActivity) {
          onDeactivateActivity(selectedActivityId).catch((error) => {
            console.error('Failed to deactivate one-off activity:', error);
          });
          setIsCurrentActivityOneOff(false);
        }
      }).catch((error) => {
        console.error('Failed to auto-log activity:', error);
      });
    }

    // Skip break and go straight to complete
    setPhase('complete');
    setIsRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Idle configuration screen
  if (phase === 'idle') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
            Pomodoro Timer
          </h2>

          {/* Work Duration Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Work Duration
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 5, 15, 25, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setWorkMinutes(minutes)}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    workMinutes === minutes
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>

          {/* Activity Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Link to Activity (Optional)
              </label>
              {onCreateActivity && !showNewActivityForm && (
                <button
                  onClick={() => setShowNewActivityForm(true)}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  + New Activity
                </button>
              )}
            </div>

            {showNewActivityForm ? (
              <form onSubmit={handleCreateActivity} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    placeholder="e.g., Deep Work on Project X"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={newActivityPoints}
                    onChange={(e) => setNewActivityPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveForFuture}
                      onChange={(e) => setSaveForFuture(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Save for future use (unchecked = one-time activity)
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm font-medium"
                  >
                    Create & Select
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewActivityForm(false);
                      setNewActivityName('');
                      setNewActivityPoints(1);
                      setSaveForFuture(true);
                    }}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <select
                value={selectedActivityId || ''}
                onChange={(e) => {
                  setSelectedActivityId(Number(e.target.value) || null);
                  setIsCurrentActivityOneOff(false); // Clear one-off flag when manually selecting activity
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">No activity selected</option>
                {activities.filter((a) => a.is_active).map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name} ({activity.points > 0 ? '+' : ''}{activity.points} pts)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Auto-log Toggle */}
          {selectedActivityId && (
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLog}
                  onChange={(e) => setAutoLog(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-log to daily tasks when session completes
                </span>
              </label>
            </div>
          )}

          {/* Session Statistics */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Today's Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {sessionStats.completedSessions}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sessions Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {sessionStats.totalFocusTime}m
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Focus Time</div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full bg-blue-500 text-white px-8 py-4 rounded-lg hover:bg-blue-600 font-semibold text-lg"
          >
            Start Pomodoro ({workMinutes} minutes)
          </button>
        </div>
      </div>
    );
  }

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-12 rounded-lg shadow text-center">
          <div className="text-6xl font-bold mb-4 text-yellow-600 dark:text-yellow-400">
            {countdownSeconds}
          </div>
          <div className="text-2xl font-semibold text-yellow-700 dark:text-yellow-300">
            Get Ready!
          </div>
          <div className="text-lg text-yellow-600 dark:text-yellow-400 mt-2">
            Prepare to focus
          </div>
        </div>
      </div>
    );
  }

  // Work phase screen
  if (phase === 'work') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 p-12 rounded-lg shadow text-center">
          <div className="text-7xl font-bold mb-6 text-green-600 dark:text-green-400">
            {formatTime(secondsLeft)}
          </div>
          <div className="text-3xl font-semibold text-green-700 dark:text-green-300 mb-2">
            🎯 Focus Time
          </div>
          {selectedActivityId && (
            <div className="text-lg text-green-600 dark:text-green-400 mb-4">
              Working on: {activities.find((a) => a.id === selectedActivityId)?.name}
            </div>
          )}
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Session {sessionStats.completedSessions + 1}
          </div>

          {/* Controls */}
          <div className="flex gap-4 justify-center mt-8 flex-wrap">
            {isRunning ? (
              <button
                onClick={handlePause}
                className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 font-semibold"
              >
                Resume
              </button>
            )}
            <button
              onClick={handleCompleteEarly}
              className="bg-purple-500 text-white px-8 py-3 rounded-lg hover:bg-purple-600 font-semibold"
            >
              Complete Early
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 font-semibold"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Break phase screen
  if (phase === 'break') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-12 rounded-lg shadow text-center">
          <div className="text-7xl font-bold mb-6 text-blue-600 dark:text-blue-400">
            {formatTime(secondsLeft)}
          </div>
          <div className="text-3xl font-semibold text-blue-700 dark:text-blue-300 mb-2">
            ☕ Break Time
          </div>
          <div className="text-lg text-blue-600 dark:text-blue-400 mb-4">
            Rest and recharge
          </div>

          {/* Suggested Exercise */}
          {suggestedExercise && (
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suggested break activity:
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {suggestedExercise.name}
              </div>
              {suggestedExercise.notes && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {suggestedExercise.notes}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center mt-8">
            {isRunning ? (
              <button
                onClick={handlePause}
                className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 font-semibold"
              >
                Resume
              </button>
            )}
            <button
              onClick={handleSkipBreak}
              className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 font-semibold"
            >
              Skip Break
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete screen with optional manual logging
  if (phase === 'complete') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-6">
            Session Complete!
          </div>

          {/* Session Summary */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {workMinutes}m
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Focus Time</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {sessionStats.completedSessions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions Today</div>
            </div>
          </div>

          {/* Manual Activity Logging (if not auto-logged) */}
          {!autoLog && selectedActivityId && onLogActivity && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Log Activity to Daily Tasks
              </h3>
              {logSuccess ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">✓</div>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    Activity logged successfully!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Energy Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Energy Level
                    </label>
                    <div className="flex gap-2 justify-center">
                      {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedEnergyLevel(level)}
                          className={`px-4 py-2 rounded font-medium ${
                            selectedEnergyLevel === level
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quality Rating
                    </label>
                    <div className="flex gap-2 justify-center">
                      {(['low', 'medium', 'high'] as QualityRating[]).map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setSelectedQualityRating(rating)}
                          className={`px-4 py-2 rounded font-medium ${
                            selectedQualityRating === rating
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {rating.charAt(0).toUpperCase() + rating.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleLogFromComplete}
                    className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold"
                  >
                    Log Activity
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Auto-log confirmation */}
          {autoLog && selectedActivityId && (
            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <div className="text-green-700 dark:text-green-300 font-medium">
                ✓ Activity auto-logged to daily tasks
              </div>
            </div>
          )}

          {/* New Session Button */}
          <button
            onClick={handleNewSession}
            className="w-full bg-blue-500 text-white px-8 py-4 rounded-lg hover:bg-blue-600 font-semibold text-lg"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return null;
}
