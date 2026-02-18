export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type CompletionType = 'checkbox' | 'rating' | 'energy_quality';
export type ScheduleFrequency = 'weekly' | 'biweekly';
export type SpecialDayType = 'rest' | 'recovery' | 'vacation';

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
  calories_burned: number;
  is_active: boolean;
  days_of_week: DayOfWeek[] | null;
  category_id: number | null;
  completion_type: CompletionType;
  rating_scale: number | null;
  schedule_frequency: ScheduleFrequency;
  biweekly_start_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityCreate {
  name: string;
  points: number;
  calories_burned?: number;
  days_of_week?: DayOfWeek[] | null;
  category_id?: number | null;
  completion_type?: CompletionType;
  rating_scale?: number | null;
  schedule_frequency?: ScheduleFrequency;
  biweekly_start_date?: string | null;
  notes?: string | null;
}

export type EnergyLevel = 'low' | 'medium' | 'high';
export type QualityRating = 'low' | 'medium' | 'high';

export interface Log {
  id: number;
  activity_id: number;
  completed_at: string;
  energy_level?: EnergyLevel | null;
  quality_rating?: QualityRating | null;
  rating_value?: number | null;
  duration_hours?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface LogCreate {
  activity_id: number;
  completed_at: string;
  energy_level?: EnergyLevel | null;
  quality_rating?: QualityRating | null;
  rating_value?: number | null;
  duration_hours?: number | null;
  notes?: string | null;
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

// Exercise Tracking Types

export type ExerciseType = 'reps' | 'time' | 'weight';
export type WeightUnit = 'lbs' | 'kg';

export interface Exercise {
  id: number;
  user_id: number;
  name: string;
  exercise_type: ExerciseType;
  default_value: number | null;
  default_weight_unit: WeightUnit | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExerciseCreate {
  name: string;
  exercise_type: ExerciseType;
  default_value?: number | null;
  default_weight_unit?: WeightUnit | null;
  notes?: string | null;
}

export interface ExerciseUpdate {
  name?: string;
  exercise_type?: ExerciseType;
  default_value?: number | null;
  default_weight_unit?: WeightUnit | null;
  notes?: string | null;
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  name: string | null;
  started_at: string;
  completed_at: string | null;
  paused_duration: number;
  total_duration: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSessionCreate {
  name?: string | null;
  started_at: string;
  notes?: string | null;
}

export interface WorkoutSessionUpdate {
  name?: string | null;
  completed_at?: string | null;
  paused_duration?: number;
  total_duration?: number;
  notes?: string | null;
}

export interface SessionExercise {
  id: number;
  workout_session_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_value: number | null;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
}

export interface SessionExerciseCreate {
  workout_session_id: number;
  exercise_id: number;
  order_index: number;
  target_sets?: number;
  target_value?: number | null;
  rest_seconds?: number;
  notes?: string | null;
}

export interface ExerciseSet {
  id: number;
  session_exercise_id: number;
  set_number: number;
  reps: number | null;
  duration_seconds: number | null;
  weight: number | null;
  weight_unit: WeightUnit | null;
  completed_at: string;
  notes: string | null;
  created_at: string;
}

export interface ExerciseSetCreate {
  session_exercise_id: number;
  set_number: number;
  reps?: number | null;
  duration_seconds?: number | null;
  weight?: number | null;
  weight_unit?: WeightUnit | null;
  completed_at: string;
  notes?: string | null;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  weight_unit: WeightUnit;
  default_rest_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesUpdate {
  weight_unit?: WeightUnit;
  default_rest_seconds?: number;
}

// Extended types with related data for UI
export interface SessionExerciseWithDetails extends SessionExercise {
  exercise: Exercise;
  sets: ExerciseSet[];
}

// Workout Template Types

export interface WorkoutTemplate {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplateCreate {
  name: string;
  description?: string | null;
}

export interface WorkoutTemplateUpdate {
  name?: string;
  description?: string | null;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_value: number | null;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
}

export interface TemplateExerciseCreate {
  template_id: number;
  exercise_id: number;
  order_index: number;
  target_sets?: number;
  target_value?: number | null;
  rest_seconds?: number;
  notes?: string | null;
}

// Extended template type with exercises
export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

// Exercise Progress Types

export interface DailyProgressData {
  date: string;
  total_sets: number;
  total_reps: number;
  total_duration: number;
  max_weight: number;
  max_reps: number;
  max_duration: number;
  avg_weight: number;
  weight_unit: WeightUnit | null;
}

export interface ExerciseProgressSummary {
  total_workouts: number;
  total_sets: number;
  total_reps: number;
  total_duration: number;
}

export interface ExerciseProgressResponse {
  exercise: Exercise;
  start_date: string;
  end_date: string;
  progress: DailyProgressData[];
  summary: ExerciseProgressSummary;
}

// Todo Types

export type TodoCategory = 'personal' | 'professional';

export interface Todo {
  id: number;
  user_id: number;
  text: string;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  category: TodoCategory;
  created_at: string;
  updated_at: string;
}

export interface TodoCreate {
  text: string;
  order_index?: number;
  category?: TodoCategory;
}

export interface TodoUpdate {
  text?: string;
  is_completed?: boolean;
  order_index?: number;
  category?: TodoCategory;
}

// Special Day Types

export interface SpecialDay {
  id: number;
  user_id: number;
  date: string;
  day_type: SpecialDayType;
  notes: string | null;
  created_at: string;
}

export interface SpecialDayCreate {
  date: string;
  day_type: SpecialDayType;
  notes?: string | null;
}

export interface SpecialDayUpdate {
  day_type?: SpecialDayType;
  notes?: string | null;
}

// Diet Tracking Types

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionGoals {
  id: number;
  user_id: number;
  base_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  potassium_mg: number;
  sodium_mg: number;
  zinc_mg: number;
  vitamin_b6_mg: number;
  vitamin_b12_mcg: number;
  omega3_g: number;
  adjust_for_activity: boolean;
  calories_per_activity_point: number;
  target_weight: number | null;
  weight_unit: WeightUnit;
  created_at: string;
  updated_at: string;
}

export interface NutritionGoalsUpdate {
  base_calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  sodium_mg?: number;
  zinc_mg?: number;
  vitamin_b6_mg?: number;
  vitamin_b12_mcg?: number;
  omega3_g?: number;
  adjust_for_activity?: boolean;
  calories_per_activity_point?: number;
  target_weight?: number | null;
  weight_unit?: WeightUnit;
}

export interface Meal {
  id: number;
  user_id: number;
  meal_date: string;
  meal_type: MealType;
  name: string;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  potassium_mg: number;
  sodium_mg: number;
  zinc_mg: number;
  vitamin_b6_mg: number;
  vitamin_b12_mcg: number;
  omega3_g: number;
  notes: string | null;
  created_at: string;
}

export interface MealCreate {
  meal_date: string;
  meal_type: MealType;
  name: string;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  sodium_mg?: number;
  zinc_mg?: number;
  vitamin_b6_mg?: number;
  vitamin_b12_mcg?: number;
  omega3_g?: number;
  notes?: string | null;
}

export interface FoodItem {
  id: number;
  user_id: number;
  name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  potassium_mg: number;
  sodium_mg: number;
  zinc_mg: number;
  vitamin_b6_mg: number;
  vitamin_b12_mcg: number;
  omega3_g: number;
  is_active: boolean;
  created_at: string;
}

export interface FoodItemCreate {
  name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  sodium_mg?: number;
  zinc_mg?: number;
  vitamin_b6_mg?: number;
  vitamin_b12_mcg?: number;
  omega3_g?: number;
}

export interface WeightLog {
  id: number;
  user_id: number;
  log_date: string;
  weight: number;
  weight_unit: WeightUnit;
  notes: string | null;
  created_at: string;
}

export interface WeightLogCreate {
  log_date: string;
  weight: number;
  weight_unit: WeightUnit;
  notes?: string | null;
}

export type SleepQuality = 'low' | 'medium' | 'high';

export interface SleepLog {
  id: number;
  user_id: number;
  log_date: string;
  hours_slept: number;
  quality_rating: SleepQuality | null;
  notes: string | null;
  created_at: string;
}

export interface SleepLogCreate {
  log_date: string;
  hours_slept: number;
  quality_rating?: SleepQuality | null;
  notes?: string | null;
}

export interface DailyNutritionSummary {
  date: string;
  goals: NutritionGoals;
  actual: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    vitamin_c_mg: number;
    vitamin_d_mcg: number;
    calcium_mg: number;
    iron_mg: number;
    magnesium_mg: number;
    potassium_mg: number;
    sodium_mg: number;
    zinc_mg: number;
    vitamin_b6_mg: number;
    vitamin_b12_mcg: number;
    omega3_g: number;
  };
  percentage: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  meals: Meal[];
  activity_points: number;
  adjusted_calorie_goal: number;
}
