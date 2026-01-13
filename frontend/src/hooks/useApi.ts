import { useState, useCallback } from 'react';
import { Activity, ActivityCreate, Log, LogCreate, Score, HistoryEntry } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Activity[]>('/activities');
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createActivity = useCallback(async (activity: ActivityCreate) => {
    await fetchApi<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
    await fetchActivities();
  }, [fetchActivities]);

  const deleteActivity = useCallback(async (id: number) => {
    await fetchApi(`/activities/${id}`, { method: 'DELETE' });
    await fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, fetchActivities, createActivity, deleteActivity };
}

export function useLogs(date: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Log[]>(`/logs?date=${date}`);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [date]);

  const createLog = useCallback(async (log: LogCreate) => {
    await fetchApi<Log>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    await fetchLogs();
  }, [fetchLogs]);

  const deleteLog = useCallback(async (id: number) => {
    await fetchApi(`/logs/${id}`, { method: 'DELETE' });
    await fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, fetchLogs, createLog, deleteLog };
}

export function useScores() {
  const [dailyScore, setDailyScore] = useState<Score | null>(null);
  const [weeklyScore, setWeeklyScore] = useState<Score | null>(null);
  const [monthlyScore, setMonthlyScore] = useState<Score | null>(null);

  const fetchDailyScore = useCallback(async (date: string) => {
    const data = await fetchApi<Score>(`/scores/daily?date=${date}`);
    setDailyScore(data);
  }, []);

  const fetchWeeklyScore = useCallback(async (date: string) => {
    const data = await fetchApi<Score>(`/scores/weekly?date=${date}`);
    setWeeklyScore(data);
  }, []);

  const fetchMonthlyScore = useCallback(async (year: number, month: number) => {
    const data = await fetchApi<Score>(`/scores/monthly?year=${year}&month=${month}`);
    setMonthlyScore(data);
  }, []);

  return { dailyScore, weeklyScore, monthlyScore, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore };
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (days: number = 7) => {
    setLoading(true);
    try {
      const data = await fetchApi<HistoryEntry[]>(`/scores/history?days=${days}`);
      setHistory(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { history, loading, fetchHistory };
}
