import { useState, useEffect } from 'react';
import { SpecialDay, SpecialDayType } from '../types';
import { useSpecialDays } from '../hooks/useApi';

const DAY_TYPE_LABELS: Record<SpecialDayType, string> = {
  rest: 'Rest Day',
  recovery: 'Recovery Day',
  vacation: 'Vacation',
};

const DAY_TYPE_COLORS: Record<SpecialDayType, string> = {
  rest: '#3B82F6', // blue
  recovery: '#10B981', // green
  vacation: '#F59E0B', // amber
};

const DAY_TYPE_ICONS: Record<SpecialDayType, string> = {
  rest: '🛌',
  recovery: '🏥',
  vacation: '🏖️',
};

export function SpecialDayManager() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState<SpecialDayType>('rest');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get date range for current month +/- 1 month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  const { specialDays, loading, fetchSpecialDays, createSpecialDay, deleteSpecialDay } = useSpecialDays(startDate, endDate);

  useEffect(() => {
    fetchSpecialDays();
  }, [fetchSpecialDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setSubmitting(true);
    try {
      await createSpecialDay({
        date: selectedDate,
        day_type: selectedType,
        notes: notes.trim() || undefined,
      });
      // Reset form
      setSelectedDate('');
      setNotes('');
      setSelectedType('rest');
    } catch (error) {
      console.error('Failed to create special day:', error);
      alert('Failed to create special day. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (date: string) => {
    if (!confirm('Are you sure you want to remove this special day?')) return;

    try {
      await deleteSpecialDay(date);
    } catch (error) {
      console.error('Failed to delete special day:', error);
      alert('Failed to delete special day. Please try again.');
    }
  };

  // Group special days by type
  const groupedDays = specialDays.reduce((acc, day) => {
    if (!acc[day.day_type]) {
      acc[day.day_type] = [];
    }
    acc[day.day_type].push(day);
    return acc;
  }, {} as Record<SpecialDayType, SpecialDay[]>);

  // Sort days within each group
  Object.keys(groupedDays).forEach(type => {
    groupedDays[type as SpecialDayType].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Special Days
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Mark days as rest, recovery, or vacation. Activities on these days won't count toward your score.
        </p>
      </div>

      {/* Add Special Day Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Day Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DAY_TYPE_LABELS) as SpecialDayType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedType === type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={submitting}
              >
                <div className="text-2xl mb-1">{DAY_TYPE_ICONS[type]}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {DAY_TYPE_LABELS[type]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this day..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
            rows={2}
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedDate}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Adding...' : 'Add Special Day'}
        </button>
      </form>

      {/* List of Special Days */}
      {loading ? (
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          Loading special days...
        </div>
      ) : specialDays.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          No special days marked yet.
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.keys(groupedDays) as SpecialDayType[]).map((type) => {
            const days = groupedDays[type];
            if (!days || days.length === 0) return null;

            return (
              <div key={type} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{DAY_TYPE_ICONS[type]}</span>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                    {DAY_TYPE_LABELS[type]} ({days.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {days.map((day) => (
                    <div
                      key={day.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {day.notes && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {day.notes}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(day.date)}
                        className="ml-3 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Remove special day"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
