import { useState, useCallback } from 'react';
import { Activity, ActivityCreate, Log, LogCreate, Score, HistoryEntry } from '../types';
import { useMockData as useMockDataContext } from '../contexts/MockDataContext';
import {
  generateMockActivities,
  generateMockLogsForDate,
  generateMockScore,
  generateMockHistory,
} from '../utils/mockData';

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
  const { useMockData } = useMockDataContext();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        // Use mock data
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
        setActivities(generateMockActivities());
      } else {
        const data = await fetchApi<Activity[]>('/activities');
        setActivities(data);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  const createActivity = useCallback(async (activity: ActivityCreate) => {
    if (useMockData) {
      // Don't actually create when using mock data
      console.log('Mock mode: Create activity ignored', activity);
      return;
    }
    await fetchApi<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
    await fetchActivities();
  }, [fetchActivities, useMockData]);

  const deleteActivity = useCallback(async (id: number) => {
    if (useMockData) {
      // Don't actually delete when using mock data
      console.log('Mock mode: Delete activity ignored', id);
      return;
    }
    await fetchApi(`/activities/${id}`, { method: 'DELETE' });
    await fetchActivities();
  }, [fetchActivities, useMockData]);

  return { activities, loading, fetchActivities, createActivity, deleteActivity };
}

export function useLogs(date: string) {
  const { useMockData } = useMockDataContext();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setLogs(generateMockLogsForDate(date));
      } else {
        const data = await fetchApi<Log[]>(`/logs?date=${date}`);
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  }, [date, useMockData]);

  const createLog = useCallback(async (log: LogCreate) => {
    if (useMockData) {
      console.log('Mock mode: Create log ignored', log);
      return;
    }
    await fetchApi<Log>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    await fetchLogs();
  }, [fetchLogs, useMockData]);

  const deleteLog = useCallback(async (id: number) => {
    if (useMockData) {
      console.log('Mock mode: Delete log ignored', id);
      return;
    }
    await fetchApi(`/logs/${id}`, { method: 'DELETE' });
    await fetchLogs();
  }, [fetchLogs, useMockData]);

  return { logs, loading, fetchLogs, createLog, deleteLog };
}

export function useScores() {
  const { useMockData } = useMockDataContext();
  const [dailyScore, setDailyScore] = useState<Score | null>(null);
  const [weeklyScore, setWeeklyScore] = useState<Score | null>(null);
  const [monthlyScore, setMonthlyScore] = useState<Score | null>(null);

  const fetchDailyScore = useCallback(async (date: string) => {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setDailyScore(generateMockScore('daily', date));
    } else {
      const data = await fetchApi<Score>(`/scores/daily?date=${date}`);
      setDailyScore(data);
    }
  }, [useMockData]);

  const fetchWeeklyScore = useCallback(async (date: string) => {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setWeeklyScore(generateMockScore('weekly', date));
    } else {
      const data = await fetchApi<Score>(`/scores/weekly?date=${date}`);
      setWeeklyScore(data);
    }
  }, [useMockData]);

  const fetchMonthlyScore = useCallback(async (year: number, month: number) => {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const date = `${year}-${String(month).padStart(2, '0')}-01`;
      setMonthlyScore(generateMockScore('monthly', date));
    } else {
      const data = await fetchApi<Score>(`/scores/monthly?year=${year}&month=${month}`);
      setMonthlyScore(data);
    }
  }, [useMockData]);

  return { dailyScore, weeklyScore, monthlyScore, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore };
}

export function useHistory() {
  const { useMockData } = useMockDataContext();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (days: number = 7) => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setHistory(generateMockHistory(days));
      } else {
        const data = await fetchApi<HistoryEntry[]>(`/scores/history?days=${days}`);
        setHistory(data);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  return { history, loading, fetchHistory };
}
