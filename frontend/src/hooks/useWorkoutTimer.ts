import { useState, useEffect, useCallback, useRef } from 'react';

export interface WorkoutTimerState {
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedDuration: number;
}

/**
 * Hook for managing workout session timer
 * Tracks total elapsed time, pause/resume state, and paused duration
 */
export function useWorkoutTimer(startTime?: string) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedDuration, setPausedDuration] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  // Initialize elapsed time based on start time
  useEffect(() => {
    if (startTime && isRunning && !isPaused) {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start - pausedDuration * 1000) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    }
  }, [startTime, isRunning, isPaused, pausedDuration]);

  // Update timer every second when running
  useEffect(() => {
    if (isRunning && !isPaused && startTime) {
      intervalRef.current = window.setInterval(() => {
        const start = new Date(startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start - pausedDuration * 1000) / 1000);
        setElapsedSeconds(Math.max(0, elapsed));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isRunning, isPaused, startTime, pausedDuration]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
      pauseStartRef.current = Date.now();
    }
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (isRunning && isPaused && pauseStartRef.current) {
      const pauseDuration = Math.floor((Date.now() - pauseStartRef.current) / 1000);
      setPausedDuration(prev => prev + pauseDuration);
      setIsPaused(false);
      pauseStartRef.current = null;
    }
  }, [isRunning, isPaused]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
    setPausedDuration(0);
    pauseStartRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    elapsedSeconds,
    isRunning,
    isPaused,
    pausedDuration,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}

/**
 * Hook for countdown/rest timer
 */
export function useRestTimer() {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && remainingSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isActive, remainingSeconds]);

  const startCountdown = useCallback((seconds: number) => {
    setRemainingSeconds(seconds);
    setIsActive(true);
  }, []);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    if (remainingSeconds > 0) {
      setIsActive(true);
    }
  }, [remainingSeconds]);

  const cancel = useCallback(() => {
    setIsActive(false);
    setRemainingSeconds(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    setRemainingSeconds(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    remainingSeconds,
    isActive,
    isComplete: remainingSeconds === 0 && !isActive,
    startCountdown,
    pause,
    resume,
    cancel,
    skip,
  };
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
