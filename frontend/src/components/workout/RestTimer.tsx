import { useState } from 'react';
import { useRestTimer, formatTime } from '../../hooks/useWorkoutTimer';

interface RestTimerProps {
  restSeconds: number;
}

const QUICK_REST_TIMES = [30, 45, 60, 90, 120, 180]; // seconds

export function RestTimer({ restSeconds }: RestTimerProps) {
  const { remainingSeconds, isActive, isComplete, startCountdown, pause, resume, skip } = useRestTimer();
  const [customTime, setCustomTime] = useState(restSeconds);

  const handleStart = () => {
    startCountdown(customTime);
  };

  const handleQuickStart = (seconds: number) => {
    setCustomTime(seconds);
    startCountdown(seconds);
  };

  if (isComplete && remainingSeconds === 0 && !isActive) {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
        <div className="flex items-center justify-between">
          <span className="text-green-700 dark:text-green-400 font-medium">Rest complete!</span>
          <button
            onClick={handleStart}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Start again
          </button>
        </div>
      </div>
    );
  }

  if (!isActive && remainingSeconds === 0) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customTime}
            onChange={(e) => setCustomTime(parseInt(e.target.value) || 0)}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Rest time (seconds)"
          />
          <button
            onClick={handleStart}
            className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
          >
            Start Rest
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {QUICK_REST_TIMES.map((seconds) => (
            <button
              key={seconds}
              onClick={() => handleQuickStart(seconds)}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded"
            >
              {seconds}s
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rest Timer</span>
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
          {formatTime(remainingSeconds)}
        </span>
      </div>

      <div className="flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={pause}
              className="flex-1 bg-yellow-500 text-white px-3 py-1 text-sm rounded hover:bg-yellow-600"
            >
              Pause
            </button>
            <button
              onClick={skip}
              className="flex-1 bg-gray-500 text-white px-3 py-1 text-sm rounded hover:bg-gray-600"
            >
              Skip
            </button>
          </>
        ) : (
          <>
            <button
              onClick={resume}
              className="flex-1 bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600"
            >
              Resume
            </button>
            <button
              onClick={skip}
              className="flex-1 bg-gray-500 text-white px-3 py-1 text-sm rounded hover:bg-gray-600"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
