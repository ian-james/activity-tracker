import { useState, useMemo, useEffect, useRef } from 'react';
import { Activity } from '../types';
import { ActivityForm } from './ActivityForm';
import { TemplateManager } from './TemplateManager';
import { SpecialDayManager } from './SpecialDayManager';
import { CategoryManager } from './CategoryManager';
import { useCategories } from '../hooks/useApi';
import { useTemplates } from '../contexts/TemplatesContext';

interface Props {
  activities: Activity[];
  showAddForm: boolean;
  editingActivity: Activity | null;
  onSubmitActivity: (...args: any[]) => Promise<void>;
  onCancelForm: () => void;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (id: number) => Promise<void>;
  onShowAddForm: () => void;
}

export function ActivitiesPage({
  activities,
  showAddForm,
  editingActivity,
  onSubmitActivity,
  onCancelForm,
  onEditActivity,
  onDeleteActivity,
  onShowAddForm,
}: Props) {
  const { categories, fetchCategories } = useCategories();
  const { addTemplate } = useTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(true);
  const [showSpecialDays, setShowSpecialDays] = useState(true);
  const [showActivitiesList, setShowActivitiesList] = useState(true);
  const [showCategories, setShowCategories] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [categoryRefreshTrigger, setCategoryRefreshTrigger] = useState(0);
  const [templateSuccessMessage, setTemplateSuccessMessage] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Fetch categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Auto-focus and scroll to form when editing or adding
  useEffect(() => {
    if ((showAddForm || editingActivity) && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus first input in the form after a small delay
      setTimeout(() => {
        const firstInput = formRef.current?.querySelector('input, select, textarea') as HTMLElement;
        firstInput?.focus();
      }, 300);
    }
  }, [showAddForm, editingActivity]);

  // Filter and group activities
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(activity =>
      activity.name.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  const groupedActivities = useMemo(() => {
    const grouped = new Map<string, { name: string; color: string; activities: Activity[] }>();

    filteredActivities.forEach(activity => {
      const category = categories.find(c => c.id === activity.category_id);
      const key = category ? `cat-${category.id}` : 'uncategorized';
      const name = category?.name || 'Uncategorized';
      const color = category?.color || '#9CA3AF';

      if (!grouped.has(key)) {
        grouped.set(key, { name, color, activities: [] });
      }
      grouped.get(key)!.activities.push(activity);
    });

    return Array.from(grouped.entries());
  }, [filteredActivities, categories]);

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

  const handleDeleteActivity = async (id: number) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      await onDeleteActivity(id);
    }
  };

  const handleConvertToTemplate = (activity: Activity) => {
    addTemplate({
      name: activity.name,
      points: activity.points,
      days: activity.days_of_week,
      category_id: activity.category_id,
      completion_type: activity.completion_type,
      rating_scale: activity.rating_scale,
      schedule_frequency: activity.schedule_frequency,
      biweekly_start_date: activity.biweekly_start_date,
    });
    setTemplateSuccessMessage(`"${activity.name}" saved as template!`);
    setTimeout(() => setTemplateSuccessMessage(''), 3000);
  };

  const getCompletionTypeLabel = (activity: Activity) => {
    if (activity.completion_type === 'checkbox') return '✓';
    if (activity.completion_type === 'rating') return `⭐${activity.rating_scale}`;
    return '⚡';
  };

  const getScheduleLabel = (activity: Activity) => {
    const daysLabel = activity.days_of_week
      ? `[${activity.days_of_week.map(d => d.charAt(0).toUpperCase()).join('')}]`
      : 'Every day';
    const freqLabel = activity.schedule_frequency === 'biweekly' ? ' (Biweekly)' : '';
    return daysLabel + freqLabel;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Manage Activities</h2>
        {!showAddForm && !editingActivity && (
          <button
            onClick={onShowAddForm}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Activity
          </button>
        )}
      </div>

      {/* Success Message */}
      {templateSuccessMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          ✓ {templateSuccessMessage}
        </div>
      )}

      {/* Add/Edit Activity Form */}
      {(showAddForm || editingActivity) && (
        <div ref={formRef}>
          {showAddForm && (
            <ActivityForm onSubmit={onSubmitActivity} onCancel={onCancelForm} />
          )}
          {editingActivity && (
            <ActivityForm
              onSubmit={onSubmitActivity}
              onCancel={onCancelForm}
              initialActivity={editingActivity}
            />
          )}
        </div>
      )}

      {/* Quick Add Templates Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={() => {
            setShowTemplates(!showTemplates);
            if (!showTemplates) {
              // Refresh categories when opening the templates section
              fetchCategories();
              setCategoryRefreshTrigger(prev => prev + 1);
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick Add Templates</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pre-configured activities for quick creation</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              showTemplates ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showTemplates && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <TemplateManager refreshTrigger={categoryRefreshTrigger} />
          </div>
        )}
      </div>

      {/* Special Days Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={() => {
            setShowSpecialDays(!showSpecialDays);
            if (!showSpecialDays) {
              fetchCategories();
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Special Days</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mark rest, recovery, and vacation days</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              showSpecialDays ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showSpecialDays && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <SpecialDayManager />
          </div>
        )}
      </div>

      {/* Activities List Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={() => setShowActivitiesList(!showActivitiesList)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Your Activities</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activities.length} total {activities.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              showActivitiesList ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showActivitiesList && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {/* Search Bar */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pl-10 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No activities found matching your search.' : 'No activities yet. Add one to get started!'}
                </div>
              ) : (
                groupedActivities.map(([key, group]) => {
                const isCollapsed = collapsedCategories.has(key);
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleCategoryCollapse(key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {group.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({group.activities.length})
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
                      <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-900">
                        {group.activities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {activity.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400" title="Completion type">
                                  {getCompletionTypeLabel(activity)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3">
                                <span className={activity.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {activity.points > 0 ? '+' : ''}{activity.points} pts
                                </span>
                                <span>•</span>
                                <span>{getScheduleLabel(activity)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConvertToTemplate(activity)}
                                className="text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-1 text-sm"
                                title="Save as template"
                              >
                                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Template
                              </button>
                              <button
                                onClick={() => onEditActivity(activity)}
                                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Category Manager Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          onClick={() => {
            setShowCategories(!showCategories);
            if (!showCategories) {
              fetchCategories();
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Category Manager</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage activity categories</p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              showCategories ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCategories && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <CategoryManager />
          </div>
        )}
      </div>
    </div>
  );
}
