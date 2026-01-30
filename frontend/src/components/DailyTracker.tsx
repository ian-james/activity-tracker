import { useState, useEffect, useMemo } from 'react';
import { Activity, Log, DayOfWeek, EnergyLevel, QualityRating } from '../types';
import { useCategories } from '../hooks/useApi';
import { ActivityStatsModal } from './ActivityStatsModal';

const WEEKDAY_MAP: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const ENERGY_ICONS = {
  low: '🔋',
  medium: '⚡',
  high: '⚡⚡',
};

const QUALITY_ICONS = {
  low: '⭐',
  medium: '⭐⭐',
  high: '⭐⭐⭐',
};

interface Props {
  activities: Activity[];
  logs: Log[];
  date: string;
  currentDate: Date;
  onToggle: (activityId: number, isCompleted: boolean, logId?: number, energyLevel?: EnergyLevel | null, qualityRating?: QualityRating | null, ratingValue?: number | null, notes?: string | null) => Promise<void>;
}

function isScheduledForDay(
  activity: Activity,
  date: Date
): boolean {
  // Check biweekly scheduling first
  if (activity.schedule_frequency === 'biweekly') {
    if (!activity.biweekly_start_date) return false;
    const startDate = new Date(activity.biweekly_start_date);
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return false; // Before start date
    const weeksDiff = Math.floor(daysDiff / 7);
    // Only show on even weeks (0, 2, 4, ...)
    if (weeksDiff % 2 !== 0) return false;
  }

  // Check day of week
  if (activity.days_of_week === null) return true; // No schedule means every day
  // JavaScript getDay(): 0 = Sunday, 1 = Monday, etc.
  // Our map: 0 = Monday, so we need to convert
  const jsDay = date.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert Sunday=0 to index 6
  const dayName = WEEKDAY_MAP[dayIndex];
  return activity.days_of_week.includes(dayName);
}

type ViewMode = 'category' | 'schedule';
type SortOption = 'name-asc' | 'name-desc' | 'points-high' | 'points-low' | 'category' | 'completion';

export function DailyTracker({ activities, logs, currentDate, onToggle }: Props) {
  const { categories, fetchCategories } = useCategories();
  const [selectingEnergyFor, setSelectingEnergyFor] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null);
  const [selectingRatingFor, setSelectingRatingFor] = useState<number | null>(null);
  const [notesFor, setNotesFor] = useState<number | null>(null);
  const [logNotes, setLogNotes] = useState<string>('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [scheduleOrder, setScheduleOrder] = useState<number[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [skippedActivities, setSkippedActivities] = useState<Set<number>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
  const [filterCompletion, setFilterCompletion] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  // Stats modal
  const [statsActivityId, setStatsActivityId] = useState<number | null>(null);
  const [statsActivityName, setStatsActivityName] = useState<string>('');

  const completedIds = new Set(logs.map((l) => l.activity_id));
  const scheduledActivities = activities.filter((a) => isScheduledForDay(a, currentDate));

  // Apply filters and search
  const filteredActivities = scheduledActivities.filter((activity) => {
    // Skip filter
    if (skippedActivities.has(activity.id)) return false;

    // Search filter
    if (searchQuery && !activity.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filterCategory !== 'all' && activity.category_id !== filterCategory) {
      return false;
    }

    // Completion filter
    const isCompleted = completedIds.has(activity.id);
    if (filterCompletion === 'completed' && !isCompleted) return false;
    if (filterCompletion === 'incomplete' && isCompleted) return false;

    // Show incomplete only toggle
    if (showIncompleteOnly && isCompleted) return false;

    return true;
  });

  // Apply sorting
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'points-high':
        return b.points - a.points;
      case 'points-low':
        return a.points - b.points;
      case 'category': {
        const catA = categories.find(c => c.id === a.category_id)?.name || 'Uncategorized';
        const catB = categories.find(c => c.id === b.category_id)?.name || 'Uncategorized';
        return catA.localeCompare(catB);
      }
      case 'completion': {
        const completeA = completedIds.has(a.id) ? 0 : 1;
        const completeB = completedIds.has(b.id) ? 0 : 1;
        return completeB - completeA; // Incomplete first
      }
      default:
        return 0;
    }
  });

  const activeActivities = sortedActivities;
  const skippedActivityList = scheduledActivities.filter((a) => skippedActivities.has(a.id));

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Load schedule order from localStorage
  useEffect(() => {
    const dateKey = currentDate.toISOString().split('T')[0];
    const stored = localStorage.getItem(`schedule-order-${dateKey}`);
    if (stored) {
      try {
        setScheduleOrder(JSON.parse(stored));
      } catch {
        setScheduleOrder([]);
      }
    } else {
      setScheduleOrder([]);
    }
  }, [currentDate]);

  // Load skipped activities from localStorage
  useEffect(() => {
    const dateKey = currentDate.toISOString().split('T')[0];
    const stored = localStorage.getItem(`skipped-activities-${dateKey}`);
    if (stored) {
      try {
        setSkippedActivities(new Set(JSON.parse(stored)));
      } catch {
        setSkippedActivities(new Set());
      }
    } else {
      setSkippedActivities(new Set());
    }
  }, [currentDate]);

  // Save schedule order to localStorage
  const updateScheduleOrder = (newOrder: number[]) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    setScheduleOrder(newOrder);
    localStorage.setItem(`schedule-order-${dateKey}`, JSON.stringify(newOrder));
  };

  // Toggle skipped status for an activity
  const toggleSkipActivity = (activityId: number) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    setSkippedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      localStorage.setItem(`skipped-activities-${dateKey}`, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleActivityClick = (activity: Activity, isCompleted: boolean, logId?: number) => {
    if (isCompleted) {
      // If already completed, uncomplete it
      onToggle(activity.id, false, logId);
    } else {
      // Initialize notes with activity template notes
      setLogNotes(activity.notes || '');
      setNotesFor(activity.id);
      setShowNotesInput(false); // Don't show notes by default
      // Branch based on completion type
      if (activity.completion_type === 'checkbox') {
        // Simple checkbox - show notes input
        setSelectingEnergyFor(null);
        setSelectingRatingFor(null);
      } else if (activity.completion_type === 'rating') {
        // Show rating selector
        setSelectingRatingFor(activity.id);
      } else {
        // energy_quality - show energy level selector
        setSelectingEnergyFor(activity.id);
        setSelectedEnergy(null);
      }
    }
  };

  const handleEnergySelect = (activityId: number, energyLevel: EnergyLevel | null) => {
    // Store energy selection and keep selector open for quality rating
    setSelectedEnergy(energyLevel);
  };

  const handleQualitySelect = async (activityId: number, qualityRating: QualityRating | null) => {
    // Complete the activity with both energy and quality
    await onToggle(activityId, true, undefined, selectedEnergy, qualityRating, null, logNotes || null);
    setSelectingEnergyFor(null);
    setSelectedEnergy(null);
    setNotesFor(null);
    setLogNotes('');
  };

  const handleRatingSelect = async (activityId: number, ratingValue: number) => {
    // Complete the activity with rating value
    await onToggle(activityId, true, undefined, null, null, ratingValue, logNotes || null);
    setSelectingRatingFor(null);
    setNotesFor(null);
    setLogNotes('');
  };

  const handleSimpleComplete = async (activityId: number) => {
    // Complete checkbox-type activity with notes
    await onToggle(activityId, true, undefined, null, null, null, logNotes || null);
    setNotesFor(null);
    setLogNotes('');
  };

  const handleCancelNotes = () => {
    setNotesFor(null);
    setLogNotes('');
    setShowNotesInput(false);
    setSelectingEnergyFor(null);
    setSelectingRatingFor(null);
    setSelectedEnergy(null);
  };

  const toggleCategoryCollapse = (categoryKey: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  const groupedActivities = () => {
    const grouped = new Map<string, { name: string; color: string; activities: Activity[] }>();

    activeActivities.forEach(activity => {
      const category = categories.find(c => c.id === activity.category_id);
      const key = category ? `cat-${category.id}` : 'uncategorized';
      const name = category?.name || 'Uncategorized';
      const color = category?.color || '#9CA3AF';

      if (!grouped.has(key)) {
        grouped.set(key, { name, color, activities: [] });
      }
      grouped.get(key)!.activities.push(activity);
    });

    // Apply schedule order to activities within each category
    const orderedActivities = getOrderedActivities();
    const orderMap = new Map(orderedActivities.map((a, idx) => [a.id, idx]));

    grouped.forEach((group) => {
      group.activities.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Number.MAX_VALUE;
        const orderB = orderMap.get(b.id) ?? Number.MAX_VALUE;
        return orderA - orderB;
      });
    });

    return Array.from(grouped.entries());
  };

  // Get activities in their custom order (for "My Schedule" view)
  // This doesn't update state, just returns ordered list
  const getOrderedActivities = () => {
    // Get all activity IDs that are active (not skipped) for today
    const activeIds = new Set(activeActivities.map(a => a.id));

    // Filter stored order to only include active activities for today
    const validOrder = scheduleOrder.filter(id => activeIds.has(id));

    // Add any new activities that aren't in the order yet (at the end)
    const orderedIds = new Set(validOrder);
    const newActivities = activeActivities.filter(a => !orderedIds.has(a.id));
    const finalOrder = [...validOrder, ...newActivities.map(a => a.id)];

    // Return activities in the specified order
    return finalOrder.map(id => activeActivities.find(a => a.id === id)).filter(Boolean) as Activity[];
  };

  const handleDragStart = (activityId: number) => {
    setDraggedItem(activityId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === targetId) return;

    const orderedActivities = getOrderedActivities();
    const draggedIndex = orderedActivities.findIndex(a => a.id === draggedItem);
    const targetIndex = orderedActivities.findIndex(a => a.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...orderedActivities.map(a => a.id)];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    updateScheduleOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

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

  if (activeActivities.length === 0 && skippedActivityList.length > 0) {
    return (
      <div className="space-y-3">
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">
          All activities skipped for today.
        </div>
        {/* Skipped Activities Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-gray-700">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              Skipped Activities ({skippedActivityList.length})
            </span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 opacity-60">
            {skippedActivityList.map((activity) => renderActivityItem(activity, false))}
          </div>
        </div>
      </div>
    );
  }

  const renderActivityItem = (activity: Activity, showDragHandle: boolean = false) => {
    const isCompleted = completedIds.has(activity.id);
    const log = logs.find((l) => l.activity_id === activity.id);
    const showingEnergySelector = selectingEnergyFor === activity.id;
    const showingRatingSelector = selectingRatingFor === activity.id;
    const showingSelector = showingEnergySelector || showingRatingSelector;
    const category = categories.find(c => c.id === activity.category_id);

    return (
      <div key={activity.id} className="bg-white dark:bg-gray-800">
        <div
          draggable={showDragHandle}
          onDragStart={() => showDragHandle && handleDragStart(activity.id)}
          onDragOver={(e) => showDragHandle && handleDragOver(e, activity.id)}
          onDragEnd={handleDragEnd}
          onClick={() => !showingSelector && handleActivityClick(activity, isCompleted, log?.id)}
          className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
            isCompleted
              ? 'bg-green-50 dark:bg-green-900/20'
              : showingSelector
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          } ${draggedItem === activity.id ? 'opacity-50' : ''} ${showDragHandle ? 'cursor-move' : ''}`}
        >
          <div className="flex items-center gap-3">
            {showDragHandle && (
              <div className="text-gray-400 dark:text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            )}
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
              <div className="flex items-center gap-2">
                {showDragHandle && category && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                    title={category.name}
                  />
                )}
                <span className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {activity.name}
                </span>
                {isCompleted && log?.rating_value && (
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded" title={`Rating: ${log.rating_value}/${activity.rating_scale || 5}`}>
                    {log.rating_value}/{activity.rating_scale || 5}
                  </span>
                )}
                {isCompleted && log?.energy_level && (
                  <span className="text-lg" title={`Energy: ${log.energy_level}`}>
                    {ENERGY_ICONS[log.energy_level]}
                  </span>
                )}
                {isCompleted && log?.quality_rating && (
                  <span className="text-lg" title={`Quality: ${log.quality_rating}`}>
                    {QUALITY_ICONS[log.quality_rating]}
                  </span>
                )}
              </div>
              <div>
                {activity.days_of_week && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    [{activity.days_of_week.map(d => d.charAt(0).toUpperCase()).join('')}]
                  </span>
                )}
                {isCompleted && log?.notes && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
                    {log.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${
              activity.points < 0
                ? (isCompleted ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400')
                : (isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400')
            }`}>
              {activity.points > 0 ? '+' : ''}{activity.points} pts
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStatsActivityId(activity.id);
                setStatsActivityName(activity.name);
              }}
              className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
              title="View statistics"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSkipActivity(activity.id);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Skip for today"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Rating Selector */}
        {showingRatingSelector && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800 space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Rate your performance (1-{activity.rating_scale || 5}):
            </p>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: activity.rating_scale || 5 }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  onClick={() => handleRatingSelect(activity.id, value)}
                  className="flex-1 min-w-[60px] py-3 px-3 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 text-lg font-bold"
                >
                  {value}
                </button>
              ))}
            </div>
            {notesFor === activity.id && !showNotesInput && (
              <button
                onClick={() => setShowNotesInput(true)}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                + Add notes
              </button>
            )}
            {notesFor === activity.id && showNotesInput && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Notes (optional):
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder={activity.notes || "Add notes for this activity..."}
                  rows={2}
                  className="w-full border border-purple-200 dark:border-purple-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-y"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            )}
            <button
              onClick={handleCancelNotes}
              className="w-full mt-2 py-1 px-3 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Energy and Quality Selector */}
        {showingEnergySelector && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 space-y-3">
            {/* Energy Level Selector */}
            {selectedEnergy === null ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">How was your energy level?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEnergySelect(activity.id, 'low')}
                    className="flex-1 py-2 px-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-sm font-medium"
                  >
                    🔋 Low
                  </button>
                  <button
                    onClick={() => handleEnergySelect(activity.id, 'medium')}
                    className="flex-1 py-2 px-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium"
                  >
                    ⚡ Medium
                  </button>
                  <button
                    onClick={() => handleEnergySelect(activity.id, 'high')}
                    className="flex-1 py-2 px-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 text-sm font-medium"
                  >
                    ⚡⚡ High
                  </button>
                </div>
                {notesFor === activity.id && !showNotesInput && (
                  <button
                    onClick={() => setShowNotesInput(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    + Add notes
                  </button>
                )}
                {notesFor === activity.id && showNotesInput && (
                  <div className="mt-2">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Notes (optional):
                    </label>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder={activity.notes || "Add notes for this activity..."}
                      rows={2}
                      className="w-full border border-blue-200 dark:border-blue-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-y"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                )}
                <button
                  onClick={handleCancelNotes}
                  className="w-full mt-2 py-1 px-3 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* Quality Rating Selector */
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">How well did you do?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQualitySelect(activity.id, 'low')}
                    className="flex-1 py-2 px-3 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 text-sm font-medium"
                  >
                    ⭐ Okay
                  </button>
                  <button
                    onClick={() => handleQualitySelect(activity.id, 'medium')}
                    className="flex-1 py-2 px-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium"
                  >
                    ⭐⭐ Good
                  </button>
                  <button
                    onClick={() => handleQualitySelect(activity.id, 'high')}
                    className="flex-1 py-2 px-3 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 text-sm font-medium"
                  >
                    ⭐⭐⭐ Excellent
                  </button>
                </div>
                {notesFor === activity.id && !showNotesInput && (
                  <button
                    onClick={() => setShowNotesInput(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    + Add notes
                  </button>
                )}
                {notesFor === activity.id && showNotesInput && (
                  <div className="mt-2">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Notes (optional):
                    </label>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder={activity.notes || "Add notes for this activity..."}
                      rows={2}
                      className="w-full border border-blue-200 dark:border-blue-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-y"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                )}
                <button
                  onClick={handleCancelNotes}
                  className="w-full mt-2 py-1 px-3 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Simple Checkbox Selector (with notes only) */}
        {notesFor === activity.id && !showingEnergySelector && !showingRatingSelector && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 space-y-3">
            {!showNotesInput && (
              <button
                onClick={() => setShowNotesInput(true)}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                + Add notes
              </button>
            )}
            {showNotesInput && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Notes (optional):
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder={activity.notes || "Add notes for this activity..."}
                  rows={2}
                  className="w-full border border-green-200 dark:border-green-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-y"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleSimpleComplete(activity.id)}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
              >
                Complete
              </button>
              <button
                onClick={handleCancelNotes}
                className="flex-1 py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="points-high">Points (High to Low)</option>
            <option value="points-low">Points (Low to High)</option>
            <option value="category">Category</option>
            <option value="completion">Incomplete First</option>
          </select>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showIncompleteOnly}
              onChange={(e) => setShowIncompleteOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show incomplete only</span>
          </label>

          {(searchQuery || filterCategory !== 'all' || filterCompletion !== 'all' || showIncompleteOnly) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterCompletion('all');
                setShowIncompleteOnly(false);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        <button
          onClick={() => setViewMode('category')}
          className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
            viewMode === 'category'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          By Category
        </button>
        <button
          onClick={() => setViewMode('schedule')}
          className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
            viewMode === 'schedule'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          My Schedule
        </button>
      </div>

      {/* Category View */}
      {viewMode === 'category' && groupedActivities().map(([key, group]) => {
        const isCollapsed = collapsedCategories.has(key);
        const completedCount = group.activities.filter(a => completedIds.has(a.id)).length;
        const totalCount = group.activities.length;

        return (
          <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategoryCollapse(key)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {group.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {completedCount}/{totalCount}
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                  isCollapsed ? '' : 'rotate-180'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {group.activities.map((activity) => renderActivityItem(activity, false))}
              </div>
            )}
          </div>
        );
      })}

      {/* Schedule View */}
      {viewMode === 'schedule' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Drag and drop to organize your day
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {getOrderedActivities().map((activity) => renderActivityItem(activity, true))}
          </div>
        </div>
      )}

      {/* Skipped Activities Section */}
      {skippedActivityList.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="font-medium text-gray-800 dark:text-gray-200">
              Skipped for Today ({skippedActivityList.length})
            </span>
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                showSkipped ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSkipped && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 opacity-60">
              {skippedActivityList.map((activity) => renderActivityItem(activity, false))}
            </div>
          )}
        </div>
      )}

      {/* Stats Modal */}
      {statsActivityId !== null && (
        <ActivityStatsModal
          activityId={statsActivityId}
          activityName={statsActivityName}
          onClose={() => {
            setStatsActivityId(null);
            setStatsActivityName('');
          }}
        />
      )}
    </div>
  );
}
