import { HistoryEntry } from '../types';
import { CalendarSquare } from './CalendarSquare';

interface CalendarGridProps {
  history: HistoryEntry[];
  timeRange: 7 | 14 | 28;
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
    <div className="space-y-3">
      {weekRows.map((week, weekIndex) => (
        <div key={weekIndex} className="flex gap-2">
          {week.map((entry) => (
            <CalendarSquare key={entry.date} entry={entry} />
          ))}
        </div>
      ))}
    </div>
  );
}
