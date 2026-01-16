export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'mon', label: 'Monday', short: 'M' },
  { value: 'tue', label: 'Tuesday', short: 'T' },
  { value: 'wed', label: 'Wednesday', short: 'W' },
  { value: 'thu', label: 'Thursday', short: 'Th' },
  { value: 'fri', label: 'Friday', short: 'F' },
  { value: 'sat', label: 'Saturday', short: 'Sa' },
  { value: 'sun', label: 'Sunday', short: 'Su' },
];

export interface Activity {
  id: number;
  name: string;
  points: number;
  is_active: boolean;
  days_of_week: DayOfWeek[] | null;
  category_id: number | null;
  created_at: string;
}

export interface ActivityCreate {
  name: string;
  points: number;
  days_of_week?: DayOfWeek[] | null;
  category_id?: number | null;
}

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface Log {
  id: number;
  activity_id: number;
  completed_at: string;
  energy_level?: EnergyLevel | null;
  created_at: string;
}

export interface LogCreate {
  activity_id: number;
  completed_at: string;
  energy_level?: EnergyLevel | null;
}

export interface Score {
  period: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_points: number;
  max_possible_points: number;
  completed_count: number;
  total_activities: number;
  percentage: number;
}

export interface HistoryEntry {
  date: string;
  total_points: number;
  max_possible_points: number;
  percentage: number;
  completed_count: number;
  total_activities: number;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  color?: string;
  icon?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
  icon?: string | null;
}

export interface CategorySummary {
  category_id: number | null;
  category_name: string;
  category_color: string;
  total_points: number;
  max_possible_points: number;
  completed_count: number;
  total_activities: number;
  percentage: number;
}
