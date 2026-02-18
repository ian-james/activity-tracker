import { HistoryEntry } from '../types';
import { CalendarSquare } from './CalendarSquare';

interface CalendarGridProps {
  history: HistoryEntry[];
  timeRange: 7 | 14 | 28;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CalendarGrid({ history, timeRange }: CalendarGridProps) {
  // Calculate rows: 7 days -> 1 row, 14 days -> 2 rows, 28 days -> 4 rows
  const rows = timeRange / 7;

  // Organize history into week rows
  const weekRows = [];
  for (let i = 0; i < rows; i++) {
    weekRows.push(history.slice(i * 7, (i + 1) * 7));
  }

  return (
    <div className="space-y-2">
      {weekRows.map((week, weekIndex) => (
        <div key={weekIndex}>
          <div className="flex gap-1">
            {week.map((entry) => (
              <div key={entry.date} className="flex-1 max-w-[100px]">
                <CalendarSquare entry={entry} />
                <div className="mt-0.5 text-center">
                  <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                    {getDayLabel(entry.date)}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {getDateLabel(entry.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
