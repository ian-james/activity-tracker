import { Activity, DAYS_OF_WEEK } from '../types';

interface Props {
  activities: Activity[];
  onDelete: (id: number) => Promise<void>;
}

export function ActivityList({ activities, onDelete }: Props) {
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

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg shadow"
        >
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">{activity.name}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">+{activity.points} pts</span>
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
