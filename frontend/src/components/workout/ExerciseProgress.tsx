import { useState, useEffect } from 'react';
import { Exercise, ExerciseProgressResponse, DailyProgressData } from '../../types';

interface ExerciseProgressProps {
  exercise: Exercise;
  onClose: () => void;
}

const API_BASE = '/api';

export function ExerciseProgress({ exercise, onClose }: ExerciseProgressProps) {
  const [progressData, setProgressData] = useState<ExerciseProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<'max_weight' | 'max_reps' | 'max_duration' | 'total_sets'>('max_weight');

  useEffect(() => {
    fetchProgress();
  }, [exercise.id, days]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/exercises/${exercise.id}/progress?days=${days}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setProgressData(data);

        // Auto-select appropriate metric based on exercise type
        if (exercise.exercise_type === 'weight') {
          setMetric('max_weight');
        } else if (exercise.exercise_type === 'reps') {
          setMetric('max_reps');
        } else if (exercise.exercise_type === 'time') {
          setMetric('max_duration');
        }
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading progress data...</div>
      </div>
    );
  }

  if (!progressData || progressData.progress.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {exercise.name} - Progress
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕ Close
          </button>
        </div>
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          No workout data for this exercise in the selected time period.
        </div>
      </div>
    );
  }

  const getMetricLabel = () => {
    switch (metric) {
      case 'max_weight': return `Max Weight (${progressData.progress[0]?.weight_unit || 'lbs'})`;
      case 'max_reps': return 'Max Reps';
      case 'max_duration': return 'Max Duration (seconds)';
      case 'total_sets': return 'Total Sets';
    }
  };

  const getMetricValue = (data: DailyProgressData) => {
    return data[metric] || 0;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {exercise.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Progress Tracking</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕ Close
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Time Period
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Metric
          </label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {exercise.exercise_type === 'weight' && (
              <option value="max_weight">Max Weight</option>
            )}
            {(exercise.exercise_type === 'reps' || exercise.exercise_type === 'weight') && (
              <option value="max_reps">Max Reps</option>
            )}
            {exercise.exercise_type === 'time' && (
              <option value="max_duration">Max Duration</option>
            )}
            <option value="total_sets">Total Sets</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
          <div className="text-sm text-gray-600 dark:text-gray-400">Workouts</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {progressData.summary.total_workouts}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Sets</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {progressData.summary.total_sets}
          </div>
        </div>
        {progressData.summary.total_reps > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Reps</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {progressData.summary.total_reps}
            </div>
          </div>
        )}
        {progressData.summary.total_duration > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.floor(progressData.summary.total_duration / 60)}m
            </div>
          </div>
        )}
      </div>

      {/* Graph */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {getMetricLabel()} Over Time
        </h4>
        <ProgressChart
          data={progressData.progress}
          metric={metric}
          metricLabel={getMetricLabel()}
          getValue={getMetricValue}
        />
      </div>
    </div>
  );
}

interface ProgressChartProps {
  data: DailyProgressData[];
  metric: string;
  metricLabel: string;
  getValue: (data: DailyProgressData) => number;
}

function ProgressChart({ data, metric, metricLabel, getValue }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No data to display
      </div>
    );
  }

  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(getValue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  // Create points for the line
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((getValue(d) - minValue) / valueRange) * chartHeight;
    return { x, y, date: d.date, value: getValue(d) };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return minValue + (valueRange / (yTicks - 1)) * i;
  });

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
      <svg width={width} height={height} className="text-gray-700 dark:text-gray-300">
        {/* Grid lines */}
        {yTickValues.map((value, i) => {
          const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize="12"
                fill="currentColor"
                opacity="0.6"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity="0.3"
        />

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity="0.3"
        />

        {/* Line path */}
        <path
          d={pathD}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#3B82F6"
              className="hover:r-6 cursor-pointer"
            >
              <title>{`${p.date}: ${p.value}`}</title>
            </circle>
          </g>
        ))}

        {/* X-axis labels (show every few dates) */}
        {points
          .filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0)
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity="0.6"
            >
              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}
      </svg>
    </div>
  );
}
