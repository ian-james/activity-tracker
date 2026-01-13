import { useState, FormEvent } from 'react';
import { DayOfWeek, DAYS_OF_WEEK } from '../types';

interface Props {
  onSubmit: (name: string, points: number, daysOfWeek: DayOfWeek[] | null) => Promise<void>;
  onCancel: () => void;
}

const POINT_OPTIONS = [5, 10, 25, 50, 100, 200];

const TEMPLATES = [
  { name: 'Workout', points: 25, days: null },
  { name: 'Cycling', points: 25, days: ['mon', 'wed', 'fri'] as DayOfWeek[] },
  { name: 'Yoga', points: 25, days: ['tue', 'thu'] as DayOfWeek[] },
  { name: 'Take Vitamins', points: 5, days: null },
  { name: 'Meal Prep', points: 10, days: ['sun'] as DayOfWeek[] },
  { name: 'Read 30 mins', points: 10, days: null },
];

export function ActivityForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [points, setPoints] = useState(10);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const days = selectedDays.length > 0 ? selectedDays : null;
      await onSubmit(name.trim(), points, days);
      setName('');
      setPoints(10);
      setSelectedDays([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTemplateClick = async (template: { name: string; points: number; days: DayOfWeek[] | null }) => {
    setSubmitting(true);
    try {
      await onSubmit(template.name, template.points, template.days);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
      <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">Add New Activity</h3>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Quick add:</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => handleTemplateClick(template)}
              disabled={submitting}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1 rounded text-sm disabled:opacity-50 text-gray-800 dark:text-gray-200"
            >
              {template.name} (+{template.points})
              {template.days && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  [{template.days.map(d => d.charAt(0).toUpperCase()).join('')}]
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Or create custom:</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Activity name"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              disabled={submitting}
            />
            <select
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-24 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              disabled={submitting}
            >
              {POINT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p} pts
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Schedule (leave empty for every day):
            </p>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`w-10 h-10 rounded text-sm font-medium transition-colors ${
                    selectedDays.includes(day.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                  disabled={submitting}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
