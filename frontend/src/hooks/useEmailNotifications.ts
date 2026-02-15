import { useState, useCallback } from 'react';

const API_BASE = '/api';

interface EmailPreferences {
  enable_weekly_email: boolean;
  email_address: string | null;
  last_email_sent_at: string | null;
}

interface EmailPreferencesUpdate {
  enable_weekly_email?: boolean;
  email_address?: string;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
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
      throw new Error('Not authenticated');
    }

    let errorDetail = `API error: ${res.status}`;
    try {
      const errorData = await res.json();
      errorDetail = errorData.detail || errorDetail;
    } catch {
      // Ignore JSON parse errors
    }

    throw new Error(errorDetail);
  }

  return res.json();
}

export function useEmailNotifications() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<EmailPreferences>('/email-notifications/preferences');
      setPreferences(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: EmailPreferencesUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<EmailPreferences>('/email-notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setPreferences(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTestEmail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{ success: boolean; message: string }>('/email-notifications/send-test', {
        method: 'POST',
      });
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send test email';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreferences,
    sendTestEmail,
  };
}
