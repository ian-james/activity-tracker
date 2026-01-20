import { useState, useCallback } from 'react';
import { Todo, TodoCreate, TodoUpdate } from '../types';

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

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Todo[]>('/todos');
      setTodos(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch todos');
      setError(error);
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTodo = useCallback(async (todo: TodoCreate) => {
    setError(null);
    try {
      await fetchApi<Todo>('/todos', {
        method: 'POST',
        body: JSON.stringify(todo),
      });
      await fetchTodos();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create todo');
      setError(error);
      throw error;
    }
  }, [fetchTodos]);

  const updateTodo = useCallback(async (id: number, todo: TodoUpdate) => {
    setError(null);
    try {
      await fetchApi<Todo>(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(todo),
      });
      await fetchTodos();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update todo');
      setError(error);
      throw error;
    }
  }, [fetchTodos]);

  const deleteTodo = useCallback(async (id: number) => {
    setError(null);
    try {
      await fetchApi(`/todos/${id}`, { method: 'DELETE' });
      await fetchTodos();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete todo');
      setError(error);
      throw error;
    }
  }, [fetchTodos]);

  const clearCompleted = useCallback(async () => {
    setError(null);
    try {
      await fetchApi('/todos/completed/all', { method: 'DELETE' });
      await fetchTodos();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear completed todos');
      setError(error);
      throw error;
    }
  }, [fetchTodos]);

  const clearInProgress = useCallback(async () => {
    setError(null);
    try {
      await fetchApi('/todos/in-progress/all', { method: 'DELETE' });
      await fetchTodos();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear in-progress todos');
      setError(error);
      throw error;
    }
  }, [fetchTodos]);

  const reorderTodos = useCallback(async (todoIds: number[]) => {
    setError(null);
    try {
      await fetchApi('/todos/reorder', {
        method: 'POST',
        body: JSON.stringify(todoIds),
      });
      await fetchTodos();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reorder todos');
      setError(error);
      throw error;
    }
  }, [fetchTodos]);

  return {
    todos,
    loading,
    error,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
    clearInProgress,
    reorderTodos,
  };
}
