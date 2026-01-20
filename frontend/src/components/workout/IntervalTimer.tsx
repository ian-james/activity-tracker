import { useState, useEffect } from 'react';
import { Exercise, SessionExercise } from '../../types';

interface IntervalTimerProps {
  sessionExercises: SessionExercise[];
  exercises: Exercise[];
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  onComplete: () => void;
  onStop: () => void;
}

type Phase = 'work' | 'rest' | 'complete';

export function IntervalTimer({
  sessionExercises,
  exercises,
  workSeconds,
  restSeconds,
  rounds,
  onComplete,
  onStop,
}: IntervalTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('work');
  const [timeRemaining, setTimeRemaining] = useState(workSeconds);

  const currentSessionExercise = sessionExercises[currentExerciseIndex];
  const currentExercise = currentSessionExercise
    ? exercises.find((e) => e.id === currentSessionExercise.exercise_id)
    : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsRunning(false);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!isCountingDown) return;

    if (countdownSeconds <= 0) {
      setIsCountingDown(false);
      setIsRunning(true);
      return;
    }

    const interval = setInterval(() => {
      setCountdownSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCountingDown, countdownSeconds]);

  // Main interval timer effect
  useEffect(() => {
    if (!isRunning || isCountingDown) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up for current phase
          advancePhase();
          return prev; // advancePhase will set the new time
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isCountingDown, phase, currentExerciseIndex, currentRound]);

  const advancePhase = () => {
    if (phase === 'work') {
      // After work, go to rest (unless it's the last exercise in the last round)
      const isLastExercise = currentExerciseIndex === sessionExercises.length - 1;
      const isLastRound = currentRound === rounds;

      if (isLastExercise && isLastRound) {
        // Workout complete
        setPhase('complete');
        setIsRunning(false);
        onComplete();
      } else {
        setPhase('rest');
        setTimeRemaining(restSeconds);
      }
    } else if (phase === 'rest') {
      // After rest, move to next exercise or next round
      if (currentExerciseIndex < sessionExercises.length - 1) {
        setCurrentExerciseIndex((prev) => prev + 1);
        setPhase('work');
        setTimeRemaining(workSeconds);
      } else {
        // Completed all exercises, move to next round
        if (currentRound < rounds) {
          setCurrentRound((prev) => prev + 1);
          setCurrentExerciseIndex(0);
          setPhase('work');
          setTimeRemaining(workSeconds);
        }
      }
    }
  };

  const handleSkip = () => {
    setIsRunning(false);
    advancePhase();
  };

  const handleStart = () => {
    setHasStarted(true);
    setCountdownSeconds(5);
    setIsCountingDown(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    setIsCountingDown(false);
  };

  const handleResume = () => {
    setCountdownSeconds(5);
    setIsCountingDown(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCountingDown(false);
    setHasStarted(false);
    setCurrentRound(1);
    setCurrentExerciseIndex(0);
    setPhase('work');
    setTimeRemaining(workSeconds);
  };

  const handleFinish = () => {
    if (confirm('Finish workout early? Progress will not be saved.')) {
      onStop();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalSeconds = phase === 'work' ? workSeconds : restSeconds;
    return ((totalSeconds - timeRemaining) / totalSeconds) * 100;
  };

  if (phase === 'complete') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-8 rounded-lg shadow text-center border-4 border-green-500">
          <div className="mb-4">
            <span className="text-3xl font-bold uppercase text-green-600 dark:text-green-400">
              🎉 WORKOUT COMPLETE!
            </span>
          </div>

          <div className="text-7xl font-bold mb-6 text-green-600 dark:text-green-400">
            ✓
          </div>

          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Great Job!
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 p-3 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{rounds}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Round{rounds > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionExercises.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Exercise{sessionExercises.length > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.ceil((sessionExercises.length * (workSeconds + restSeconds) * rounds) / 60)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Minutes</div>
            </div>
          </div>

          <button
            onClick={onStop}
            className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 font-medium text-lg"
          >
            Exit Interval Mode
          </button>
        </div>
      </div>
    );
  }

  // Ready state - show before workout starts
  if (!hasStarted) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
            Interval Workout Ready
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatTime(workSeconds)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Work Time</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatTime(restSeconds)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rest Time</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{rounds}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rounds</div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Exercises:</h4>
            <div className="space-y-2">
              {sessionExercises.map((se, idx) => {
                const ex = exercises.find((e) => e.id === se.exercise_id);
                return (
                  <div key={se.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="bg-gray-200 dark:bg-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span>{ex?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
            Total workout time: ~{Math.ceil((sessionExercises.length * (workSeconds + restSeconds) * rounds) / 60)} minutes
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStart}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 font-medium text-lg"
            >
              Start Workout
            </button>
            <button
              onClick={handleFinish}
              className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 font-medium text-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="mb-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Round {currentRound} of {rounds}</span>
          <span>Exercise {currentExerciseIndex + 1} of {sessionExercises.length}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              phase === 'work' ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Timer Display */}
      <div
        className={`p-8 rounded-lg shadow text-center ${
          isCountingDown
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-4 border-yellow-500'
            : phase === 'work'
            ? 'bg-green-50 dark:bg-green-900/20 border-4 border-green-500'
            : 'bg-blue-50 dark:bg-blue-900/20 border-4 border-blue-500'
        }`}
      >
        {isCountingDown ? (
          <>
            <div className="mb-4">
              <span className="text-3xl font-bold uppercase text-yellow-600 dark:text-yellow-400">
                🏁 GET READY
              </span>
            </div>

            {phase === 'work' && currentExercise && (
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                {currentExercise.name}
              </h3>
            )}

            <div className="text-9xl font-bold font-mono mb-6 text-yellow-600 dark:text-yellow-400 animate-pulse">
              {countdownSeconds}
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get into position...
            </p>
          </>
        ) : (
          <>
            <div className="mb-4">
              <span
                className={`text-3xl font-bold uppercase ${
                  phase === 'work'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {phase === 'work' ? '💪 WORK' : '⏸️ REST'}
              </span>
            </div>

            {phase === 'work' && currentExercise && (
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                {currentExercise.name}
              </h3>
            )}

            {phase === 'rest' && (
              <h3 className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                Take a break
              </h3>
            )}

            <div
              className={`text-8xl font-bold font-mono mb-6 ${
                phase === 'work'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
              } ${timeRemaining <= 3 ? 'animate-pulse' : ''}`}
            >
              {formatTime(timeRemaining)}
            </div>
          </>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          {!isRunning && !isCountingDown ? (
            <button
              onClick={handleStart}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 font-medium text-lg"
            >
              Start
            </button>
          ) : isCountingDown ? (
            <button
              onClick={handlePause}
              className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 font-medium text-lg"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 font-medium text-lg"
            >
              Pause
            </button>
          )}

          {!isRunning && !isCountingDown && hasStarted && (
            <button
              onClick={handleResume}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 font-medium text-lg"
            >
              Resume
            </button>
          )}

          <button
            onClick={handleFinish}
            className="bg-red-500 text-white px-8 py-3 rounded-lg hover:bg-red-600 font-medium text-lg"
          >
            Finish Workout
          </button>
        </div>

        {!isCountingDown && (
          <div className="flex gap-4 justify-center mt-4">
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 font-medium"
            >
              Reset
            </button>
            <button
              onClick={handleSkip}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium"
            >
              Skip
            </button>
          </div>
        )}
      </div>

      {/* Next Exercise Preview */}
      {currentExerciseIndex < sessionExercises.length - 1 && phase === 'rest' && (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Up next:</p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {exercises.find((e) => e.id === sessionExercises[currentExerciseIndex + 1].exercise_id)?.name}
          </p>
        </div>
      )}
    </div>
  );
}
