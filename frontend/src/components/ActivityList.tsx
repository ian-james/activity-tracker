import { useEffect } from 'react';
import { Activity, DAYS_OF_WEEK } from '../types';
import { useCategories } from '../hooks/useApi';

interface Props {
  activities: Activity[];
  onDelete: (id: number) => Promise<void>;
}

export function ActivityList({ activities, onDelete }: Props) {
  const { categories, fetchCategories } = useCategories();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  if (activities.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        No activities yet. Add one to get started!
      </div>
    );
  }

  const formatDays = (days: string[] | null) => {
    if (!days) return 'Every day';
    return days.map(d => {
      const dayInfo = DAYS_OF_WEEK.find(day => day.value === d);
      return dayInfo?.short || d;
    }).join(', ');
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg shadow"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800 dark:text-gray-200">{activity.name}</span>
              {activity.category_id && getCategoryName(activity.category_id) && (
                <span
                  className="text-xs px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: getCategoryName(activity.category_id)?.color }}
                >
                  {getCategoryName(activity.category_id)?.name}
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400">+{activity.points} pts</span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {formatDays(activity.days_of_week)}
            </div>
          </div>
          <button
            onClick={() => onDelete(activity.id)}
            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
