import { Activity, Log, Score, HistoryEntry, DayOfWeek, Category, CategorySummary } from '../types';

// Generate mock categories
export function generateMockCategories(): Category[] {
  return [
    {
      id: 1,
      name: 'Health & Fitness',
      color: '#10B981',
      icon: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Personal Development',
      color: '#3B82F6',
      icon: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Productivity',
      color: '#F59E0B',
      icon: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Wellness',
      color: '#8B5CF6',
      icon: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];
}

// Generate mock activities
export function generateMockActivities(): Activity[] {
  return [
    {
      id: 1,
      name: 'Morning Workout',
      points: 25,
      is_active: true,
      days_of_week: ['mon', 'wed', 'fri'],
      category_id: 1, // Health & Fitness
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Read 30 minutes',
      points: 10,
      is_active: true,
      days_of_week: null,
      category_id: 2, // Personal Development
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Meditation',
      points: 10,
      is_active: true,
      days_of_week: null,
      category_id: 4, // Wellness
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: 'Yoga',
      points: 25,
      is_active: true,
      days_of_week: ['tue', 'thu', 'sat'],
      category_id: 1, // Health & Fitness
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 5,
      name: 'Take Vitamins',
      points: 5,
      is_active: true,
      days_of_week: null,
      category_id: 4, // Wellness
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 6,
      name: 'Journal',
      points: 10,
      is_active: true,
      days_of_week: null,
      category_id: 2, // Personal Development
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 7,
      name: 'Meal Prep',
      points: 50,
      is_active: true,
      days_of_week: ['sun'],
      category_id: null, // Uncategorized
      completion_type: 'checkbox',
      rating_scale: null,
      schedule_frequency: 'weekly',
      biweekly_start_date: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];
}

// Generate mock logs for a specific date
export function generateMockLogsForDate(date: string): Log[] {
  const today = new Date();
  const targetDate = new Date(date);
  const isToday = targetDate.toDateString() === today.toDateString();

  // Random completion rate (higher for recent days)
  const completionRate = isToday ? 0.7 : Math.random() * 0.3 + 0.5;

  const logs: Log[] = [];
  const activities = generateMockActivities();

  activities.forEach((activity) => {
    // Check if activity is scheduled for this day
    const dayOfWeek = getDayOfWeek(targetDate);
    if (activity.days_of_week && !activity.days_of_week.includes(dayOfWeek)) {
      return;
    }

    // Randomly complete based on completion rate
    if (Math.random() < completionRate) {
      logs.push({
        id: Math.floor(Math.random() * 100000),
        activity_id: activity.id,
        completed_at: date,
        created_at: date,
      });
    }
  });

  return logs;
}

// Generate mock scores for a period
export function generateMockScore(period: 'daily' | 'weekly' | 'monthly', date: string): Score {
  const activities = generateMockActivities();
  const totalActivities = activities.filter(a => a.days_of_week === null).length;

  let maxPossiblePoints = 0;
  let totalPoints = 0;
  let completedCount = 0;

  // Calculate based on period
  if (period === 'daily') {
    maxPossiblePoints = activities.reduce((sum, a) => {
      const dayOfWeek = getDayOfWeek(new Date(date));
      if (a.days_of_week === null || a.days_of_week.includes(dayOfWeek)) {
        return sum + a.points;
      }
      return sum;
    }, 0);

    const completionRate = Math.random() * 0.3 + 0.6;
    totalPoints = Math.round(maxPossiblePoints * completionRate);
    completedCount = Math.round(totalActivities * completionRate);
  } else if (period === 'weekly') {
    // 7 days
    maxPossiblePoints = activities.reduce((sum, a) => {
      if (a.days_of_week === null) {
        return sum + (a.points * 7);
      }
      return sum + (a.points * a.days_of_week.length);
    }, 0);

    const completionRate = Math.random() * 0.2 + 0.65;
    totalPoints = Math.round(maxPossiblePoints * completionRate);
    completedCount = Math.round(totalActivities * 7 * completionRate);
  } else {
    // ~30 days
    maxPossiblePoints = activities.reduce((sum, a) => {
      if (a.days_of_week === null) {
        return sum + (a.points * 30);
      }
      return sum + (a.points * Math.floor(30 / 7) * a.days_of_week.length);
    }, 0);

    const completionRate = Math.random() * 0.2 + 0.6;
    totalPoints = Math.round(maxPossiblePoints * completionRate);
    completedCount = Math.round(totalActivities * 30 * completionRate);
  }

  const percentage = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;

  return {
    period,
    start_date: date,
    end_date: date,
    total_points: totalPoints,
    max_possible_points: maxPossiblePoints,
    completed_count: completedCount,
    total_activities: totalActivities,
    percentage,
  };
}

// Generate mock history
export function generateMockHistory(days: number): HistoryEntry[] {
  const history: HistoryEntry[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const activities = generateMockActivities();
    const dayOfWeek = getDayOfWeek(date);

    // Calculate scheduled activities for this day
    const scheduledActivities = activities.filter(a =>
      a.days_of_week === null || a.days_of_week.includes(dayOfWeek)
    );

    const maxPossiblePoints = scheduledActivities.reduce((sum, a) => sum + a.points, 0);

    // Generate a realistic completion pattern (higher on weekends, varies throughout)
    let baseCompletionRate = 0.7;
    if (dayOfWeek === 'sat' || dayOfWeek === 'sun') {
      baseCompletionRate = 0.85;
    }

    // Add some randomness and create a wave pattern
    const wave = Math.sin(i / 3) * 0.15;
    const random = (Math.random() - 0.5) * 0.2;
    const completionRate = Math.max(0.3, Math.min(1, baseCompletionRate + wave + random));

    const totalPoints = Math.round(maxPossiblePoints * completionRate);
    const percentage = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;
    const completedCount = Math.round(scheduledActivities.length * completionRate);

    history.push({
      date: dateStr,
      total_points: totalPoints,
      max_possible_points: maxPossiblePoints,
      percentage,
      completed_count: completedCount,
      total_activities: scheduledActivities.length,
    });
  }

  return history;
}

// Generate mock category summaries
export function generateMockCategorySummaries(days: number): CategorySummary[] {
  const categories = generateMockCategories();
  const activities = generateMockActivities();

  const summaries: CategorySummary[] = [];

  // Group activities by category
  const categoryMap = new Map<number | null, Activity[]>();
  activities.forEach(activity => {
    const catId = activity.category_id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, []);
    }
    categoryMap.get(catId)!.push(activity);
  });

  // Calculate summaries for each category
  categories.forEach(category => {
    const categoryActivities = categoryMap.get(category.id) || [];
    if (categoryActivities.length === 0) return;

    // Calculate max possible points over the period
    let maxPossiblePoints = 0;
    let totalScheduledActivities = 0;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayOfWeek = getDayOfWeek(date);

      categoryActivities.forEach(activity => {
        if (activity.days_of_week === null || activity.days_of_week.includes(dayOfWeek)) {
          maxPossiblePoints += activity.points;
          totalScheduledActivities++;
        }
      });
    }

    // Simulate completion with varying rates per category
    const completionRates = {
      1: 0.75, // Health & Fitness - good completion
      2: 0.85, // Personal Development - excellent completion
      3: 0.65, // Productivity - moderate completion
      4: 0.80, // Wellness - good completion
    };
    const completionRate = completionRates[category.id as keyof typeof completionRates] || 0.7;

    const totalPoints = Math.round(maxPossiblePoints * completionRate);
    const completedCount = Math.round(totalScheduledActivities * completionRate);
    const percentage = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;

    summaries.push({
      category_id: category.id,
      category_name: category.name,
      category_color: category.color,
      total_points: totalPoints,
      max_possible_points: maxPossiblePoints,
      completed_count: completedCount,
      total_activities: totalScheduledActivities,
      percentage,
    });
  });

  // Add uncategorized if there are any
  const uncategorizedActivities = categoryMap.get(null) || [];
  if (uncategorizedActivities.length > 0) {
    let maxPossiblePoints = 0;
    let totalScheduledActivities = 0;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayOfWeek = getDayOfWeek(date);

      uncategorizedActivities.forEach(activity => {
        if (activity.days_of_week === null || activity.days_of_week.includes(dayOfWeek)) {
          maxPossiblePoints += activity.points;
          totalScheduledActivities++;
        }
      });
    }

    const completionRate = 0.6; // Lower completion for uncategorized
    const totalPoints = Math.round(maxPossiblePoints * completionRate);
    const completedCount = Math.round(totalScheduledActivities * completionRate);
    const percentage = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;

    summaries.push({
      category_id: null,
      category_name: 'Uncategorized',
      category_color: '#6B7280',
      total_points: totalPoints,
      max_possible_points: maxPossiblePoints,
      completed_count: completedCount,
      total_activities: totalScheduledActivities,
      percentage,
    });
  }

  return summaries;
}

// Helper function to get day of week
function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}
