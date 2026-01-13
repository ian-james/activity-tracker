import { Activity, Log, DayOfWeek } from '../types';

const WEEKDAY_MAP: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface Props {
  activities: Activity[];
  logs: Log[];
  date: string;
  currentDate: Date;
  onToggle: (activityId: number, isCompleted: boolean, logId?: number) => Promise<void>;
}

function isScheduledForDay(daysOfWeek: DayOfWeek[] | null, date: Date): boolean {
  if (daysOfWeek === null) return true; // No schedule means every day
  // JavaScript getDay(): 0 = Sunday, 1 = Monday, etc.
  // Our map: 0 = Monday, so we need to convert
  const jsDay = date.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert Sunday=0 to index 6
  const dayName = WEEKDAY_MAP[dayIndex];
  return daysOfWeek.includes(dayName);
}

export function DailyTracker({ activities, logs, currentDate, onToggle }: Props) {
  const completedIds = new Set(logs.map((l) => l.activity_id));
  const scheduledActivities = activities.filter((a) => isScheduledForDay(a.days_of_week, currentDate));

  if (activities.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        No activities to track. Add some activities first!
      </div>
    );
  }

  if (scheduledActivities.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
        No activities scheduled for this day.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scheduledActivities.map((activity) => {
        const isCompleted = completedIds.has(activity.id);
        const log = logs.find((l) => l.activity_id === activity.id);

        return (
          <div
            key={activity.id}
            onClick={() => onToggle(activity.id, !isCompleted, log?.id)}
            className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
              isCompleted
                ? 'bg-green-100 dark:bg-green-900 border-2 border-green-400 dark:border-green-500'
                : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600 text-white'
                    : 'border-gray-400 dark:border-gray-500'
                }`}
              >
                {isCompleted && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div>
                <span className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {activity.name}
                </span>
                {activity.days_of_week && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    [{activity.days_of_week.map(d => d.charAt(0).toUpperCase()).join('')}]
                  </span>
                )}
              </div>
            </div>
            <span className={`font-semibold ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              +{activity.points} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}
