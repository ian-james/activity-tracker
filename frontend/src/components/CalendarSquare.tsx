import { useState } from 'react';
import { HistoryEntry } from '../types';

interface CalendarSquareProps {
  entry: HistoryEntry;
}

function getSquareColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500 dark:bg-green-600';
  if (percentage >= 60) return 'bg-blue-500 dark:bg-blue-600';
  if (percentage >= 40) return 'bg-yellow-500 dark:bg-yellow-600';
  return 'bg-red-400 dark:bg-red-500';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function CalendarSquare({ entry }: CalendarSquareProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Square */}
      <div
        className={`aspect-square rounded-lg transition-all cursor-pointer hover:scale-105 hover:shadow-lg ${getSquareColor(
          entry.percentage
        )}`}
      >
        {/* Show percentage inside square */}
        <div className="flex items-center justify-center h-full">
          <span className="text-white text-xs font-semibold">
            {entry.percentage}%
          </span>
        </div>
      </div>

      {/* Hover Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
          <div className="font-semibold">{formatDate(entry.date)}</div>
          <div>{entry.percentage}% complete</div>
          <div>
            {entry.total_points}/{entry.max_possible_points} pts
          </div>
          <div>
            {entry.completed_count}/{entry.total_activities} activities
          </div>
          {/* Arrow pointer */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
        </div>
      )}
    </div>
  );
}
