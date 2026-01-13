import { useState } from 'react';
import { Score } from '../types';

interface Props {
  dailyScore: Score | null;
  weeklyScore: Score | null;
  monthlyScore: Score | null;
}

type Tab = 'daily' | 'weekly' | 'monthly';

export function ScoreDisplay({ dailyScore, weeklyScore, monthlyScore }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('daily');

  const scores: Record<Tab, Score | null> = {
    daily: dailyScore,
    weekly: weeklyScore,
    monthly: monthlyScore,
  };

  const score = scores[activeTab];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {(['daily', 'weekly', 'monthly'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {score ? (
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {score.total_points} / {score.max_possible_points}
            </div>
            <div className="text-gray-500 dark:text-gray-400">points</div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-blue-500 dark:bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${Math.min(score.percentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>{score.completed_count} / {score.total_activities} completed</span>
            <span className="font-semibold">{score.percentage}%</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading scores...</div>
      )}
    </div>
  );
}
