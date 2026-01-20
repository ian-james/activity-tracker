import { useState, useCallback } from 'react';
import {
  Exercise,
  ExerciseCreate,
  ExerciseUpdate,
  WorkoutSession,
  WorkoutSessionCreate,
  WorkoutSessionUpdate,
  SessionExercise,
  SessionExerciseCreate,
  ExerciseSet,
  ExerciseSetCreate,
  UserPreferences,
  UserPreferencesUpdate,
  WorkoutTemplate,
  WorkoutTemplateCreate,
  WorkoutTemplateUpdate,
  TemplateExercise,
  TemplateExerciseCreate,
} from '../types';

const API_BASE = '/api';

class ApiException extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = 'ApiException';
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/';
        throw new ApiException(401, 'Not authenticated');
      }

      let errorDetail = `API error: ${res.status}`;
      try {
        const errorData = await res.json();
        errorDetail = errorData.detail || errorDetail;
      } catch {
        errorDetail = res.statusText || errorDetail;
      }
      throw new ApiException(res.status, errorDetail);
    }

    return res.json();
  } catch (err) {
    if (err instanceof ApiException) {
      throw err;
    }
    throw new ApiException(0, err instanceof Error ? err.message : 'Network error');
  }
}

// Exercises Hook
export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Exercise[]>('/exercises');
      setExercises(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch exercises');
      setError(error);
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createExercise = useCallback(async (exercise: ExerciseCreate) => {
    setError(null);
    try {
      await fetchApi<Exercise>('/exercises', {
        method: 'POST',
        body: JSON.stringify(exercise),
      });
      await fetchExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create exercise');
      setError(error);
      throw error;
    }
  }, [fetchExercises]);

  const updateExercise = useCallback(async (id: number, exercise: ExerciseUpdate) => {
    setError(null);
    try {
      await fetchApi<Exercise>(`/exercises/${id}`, {
        method: 'PUT',
        body: JSON.stringify(exercise),
      });
      await fetchExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update exercise');
      setError(error);
      throw error;
    }
  }, [fetchExercises]);

  const deleteExercise = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/exercises/${id}`, { method: 'DELETE' });
      await fetchExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete exercise');
      setError(error);
      throw error;
    }
  }, [fetchExercises]);

  return { exercises, loading, error, fetchExercises, createExercise, updateExercise, deleteExercise };
}

// Workout Sessions Hook
export function useWorkoutSessions(days: number = 30) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<WorkoutSession[]>(`/workouts/sessions?days=${days}`);
      setSessions(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch sessions');
      setError(error);
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchActiveSession = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchApi<WorkoutSession | null>('/workouts/active-session');
      setActiveSession(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch active session');
      setError(error);
      console.error('Error fetching active session:', error);
      return null;
    }
  }, []);

  const createSession = useCallback(async (session: WorkoutSessionCreate) => {
    setError(null);
    try {
      const newSession = await fetchApi<WorkoutSession>('/workouts/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      });
      setActiveSession(newSession);
      await fetchSessions();
      return newSession;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create session');
      setError(error);
      throw error;
    }
  }, [fetchSessions]);

  const updateSession = useCallback(async (id: number, session: WorkoutSessionUpdate) => {
    setError(null);
    try {
      const updated = await fetchApi<WorkoutSession>(`/workouts/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(session),
      });
      if (activeSession?.id === id) {
        setActiveSession(updated);
      }
      await fetchSessions();
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update session');
      setError(error);
      throw error;
    }
  }, [fetchSessions, activeSession]);

  const deleteSession = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/workouts/sessions/${id}`, { method: 'DELETE' });
      if (activeSession?.id === id) {
        setActiveSession(null);
      }
      await fetchSessions();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete session');
      setError(error);
      throw error;
    }
  }, [fetchSessions, activeSession]);

  return {
    sessions,
    activeSession,
    loading,
    error,
    fetchSessions,
    fetchActiveSession,
    createSession,
    updateSession,
    deleteSession,
  };
}

// Session Exercises Hook
export function useSessionExercises(sessionId: number | null) {
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessionExercises = useCallback(async () => {
    if (!sessionId) {
      setSessionExercises([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<SessionExercise[]>(`/workouts/sessions/${sessionId}/exercises`);
      setSessionExercises(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch session exercises');
      setError(error);
      console.error('Error fetching session exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const addSessionExercise = useCallback(async (sessionExercise: SessionExerciseCreate) => {
    setError(null);
    try {
      await fetchApi<SessionExercise>('/workouts/session-exercises', {
        method: 'POST',
        body: JSON.stringify(sessionExercise),
      });
      await fetchSessionExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add exercise to session');
      setError(error);
      throw error;
    }
  }, [fetchSessionExercises]);

  const deleteSessionExercise = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/workouts/session-exercises/${id}`, { method: 'DELETE' });
      await fetchSessionExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove exercise from session');
      setError(error);
      throw error;
    }
  }, [fetchSessionExercises]);

  return {
    sessionExercises,
    loading,
    error,
    fetchSessionExercises,
    addSessionExercise,
    deleteSessionExercise,
  };
}

// Exercise Sets Hook
export function useExerciseSets(sessionExerciseId: number | null) {
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSets = useCallback(async () => {
    if (!sessionExerciseId) {
      setSets([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<ExerciseSet[]>(`/workouts/session-exercises/${sessionExerciseId}/sets`);
      setSets(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch sets');
      setError(error);
      console.error('Error fetching sets:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionExerciseId]);

  const logSet = useCallback(async (set: ExerciseSetCreate) => {
    setError(null);
    try {
      await fetchApi<ExerciseSet>('/workouts/exercise-sets', {
        method: 'POST',
        body: JSON.stringify(set),
      });
      await fetchSets();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to log set');
      setError(error);
      throw error;
    }
  }, [fetchSets]);

  const deleteSet = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/workouts/exercise-sets/${id}`, { method: 'DELETE' });
      await fetchSets();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete set');
      setError(error);
      throw error;
    }
  }, [fetchSets]);

  return { sets, loading, error, fetchSets, logSet, deleteSet };
}

// User Preferences Hook
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<UserPreferences>('/preferences');
      setPreferences(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch preferences');
      setError(error);
      console.error('Error fetching preferences:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (prefs: UserPreferencesUpdate) => {
    setError(null);
    try {
      const updated = await fetchApi<UserPreferences>('/preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      setPreferences(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update preferences');
      setError(error);
      throw error;
    }
  }, []);

  return { preferences, loading, error, fetchPreferences, updatePreferences };
}

// Workout Templates Hook
export function useWorkoutTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<WorkoutTemplate[]>('/templates');
      setTemplates(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch templates');
      setError(error);
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (template: WorkoutTemplateCreate) => {
    setError(null);
    try {
      const newTemplate = await fetchApi<WorkoutTemplate>('/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
      await fetchTemplates();
      return newTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create template');
      setError(error);
      throw error;
    }
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (id: number, template: WorkoutTemplateUpdate) => {
    setError(null);
    try {
      await fetchApi<WorkoutTemplate>(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(template),
      });
      await fetchTemplates();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update template');
      setError(error);
      throw error;
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/templates/${id}`, { method: 'DELETE' });
      await fetchTemplates();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete template');
      setError(error);
      throw error;
    }
  }, [fetchTemplates]);

  return { templates, loading, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
}

// Template Exercises Hook
export function useTemplateExercises(templateId: number | null) {
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplateExercises = useCallback(async () => {
    if (!templateId) {
      setTemplateExercises([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<TemplateExercise[]>(`/templates/${templateId}/exercises`);
      setTemplateExercises(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch template exercises');
      setError(error);
      console.error('Error fetching template exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const addTemplateExercise = useCallback(async (templateExercise: TemplateExerciseCreate) => {
    setError(null);
    try {
      await fetchApi<TemplateExercise>('/templates/exercises', {
        method: 'POST',
        body: JSON.stringify(templateExercise),
      });
      await fetchTemplateExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add exercise to template');
      setError(error);
      throw error;
    }
  }, [fetchTemplateExercises]);

  const deleteTemplateExercise = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/templates/exercises/${id}`, { method: 'DELETE' });
      await fetchTemplateExercises();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove exercise from template');
      setError(error);
      throw error;
    }
  }, [fetchTemplateExercises]);

  return {
    templateExercises,
    loading,
    error,
    fetchTemplateExercises,
    addTemplateExercise,
    deleteTemplateExercise,
  };
}
