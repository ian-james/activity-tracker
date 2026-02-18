import { useState, useCallback } from 'react';
import { Activity, ActivityCreate, Log, LogCreate, Score, HistoryEntry, Category, CategoryCreate, CategoryUpdate, CategorySummary, SpecialDay, SpecialDayCreate, NutritionGoals, NutritionGoalsUpdate, Meal, MealCreate, FoodItem, FoodItemCreate, WeightLog, WeightLogCreate, DailyNutritionSummary } from '../types';
import { useMockData as useMockDataContext } from '../contexts/MockDataContext';
import {
  generateMockActivities,
  generateMockLogsForDate,
  generateMockScore,
  generateMockHistory,
  generateMockCategories,
  generateMockCategorySummaries,
} from '../utils/mockData';

const API_BASE = '/api';

// interface ApiError {
//   detail: string;
//   status: number;
// }

class ApiException extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = 'ApiException';
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      // Handle 401 Unauthorized - redirect to login
      if (res.status === 401) {
        // Redirect to root - App.tsx will show LoginScreen
        window.location.href = '/';
        throw new ApiException(401, 'Not authenticated');
      }

      // Try to parse error detail from response
      let errorDetail = `API error: ${res.status}`;
      try {
        const errorData = await res.json();
        errorDetail = errorData.detail || errorDetail;
      } catch {
        // If JSON parsing fails, use status text
        errorDetail = res.statusText || errorDetail;
      }
      throw new ApiException(res.status, errorDetail);
    }

    return res.json();
  } catch (err) {
    if (err instanceof ApiException) {
      throw err;
    }
    // Network errors, etc.
    throw new ApiException(0, err instanceof Error ? err.message : 'Network error');
  }
}

export function useActivities() {
  const { useMockData } = useMockDataContext();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMockData) {
        // Use mock data
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
        setActivities(generateMockActivities());
      } else {
        const data = await fetchApi<Activity[]>('/activities');
        setActivities(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch activities');
      setError(error);
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  const createActivity = useCallback(async (activity: ActivityCreate) => {
    if (useMockData) {
      // Don't actually create when using mock data
      console.log('Mock mode: Create activity ignored', activity);
      return;
    }

    setError(null);
    try {
      await fetchApi<Activity>('/activities', {
        method: 'POST',
        body: JSON.stringify(activity),
      });
      await fetchActivities();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create activity');
      setError(error);
      throw error; // Re-throw so calling component can handle it
    }
  }, [fetchActivities, useMockData]);

  const updateActivity = useCallback(async (id: number, activity: Partial<ActivityCreate>) => {
    if (useMockData) {
      // Don't actually update when using mock data
      console.log('Mock mode: Update activity ignored', id, activity);
      return;
    }

    setError(null);
    try {
      await fetchApi<Activity>(`/activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(activity),
      });
      await fetchActivities();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update activity');
      setError(error);
      throw error;
    }
  }, [fetchActivities, useMockData]);

  const deleteActivity = useCallback(async (id: number) => {
    if (useMockData) {
      // Don't actually delete when using mock data
      console.log('Mock mode: Delete activity ignored', id);
      return;
    }

    setError(null);
    try {
      await fetchApi(`/activities/${id}`, { method: 'DELETE' });
      await fetchActivities();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete activity');
      setError(error);
      throw error;
    }
  }, [fetchActivities, useMockData]);

  return { activities, loading, error, fetchActivities, createActivity, updateActivity, deleteActivity };
}

export function useLogs(date: string) {
  const { useMockData } = useMockDataContext();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setLogs(generateMockLogsForDate(date));
      } else {
        const data = await fetchApi<Log[]>(`/logs?date=${date}`);
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  }, [date, useMockData]);

  const createLog = useCallback(async (log: LogCreate) => {
    if (useMockData) {
      console.log('Mock mode: Create log ignored', log);
      return;
    }
    await fetchApi<Log>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    await fetchLogs();
  }, [fetchLogs, useMockData]);

  const deleteLog = useCallback(async (id: number) => {
    if (useMockData) {
      console.log('Mock mode: Delete log ignored', id);
      return;
    }
    await fetchApi(`/logs/${id}`, { method: 'DELETE' });
    await fetchLogs();
  }, [fetchLogs, useMockData]);

  return { logs, loading, fetchLogs, createLog, deleteLog };
}

export function useScores() {
  const { useMockData } = useMockDataContext();
  const [dailyScore, setDailyScore] = useState<Score | null>(null);
  const [weeklyScore, setWeeklyScore] = useState<Score | null>(null);
  const [monthlyScore, setMonthlyScore] = useState<Score | null>(null);

  const fetchDailyScore = useCallback(async (date: string) => {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setDailyScore(generateMockScore('daily', date));
    } else {
      const data = await fetchApi<Score>(`/scores/daily?date=${date}`);
      setDailyScore(data);
    }
  }, [useMockData]);

  const fetchWeeklyScore = useCallback(async (date: string) => {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setWeeklyScore(generateMockScore('weekly', date));
    } else {
      const data = await fetchApi<Score>(`/scores/weekly?date=${date}`);
      setWeeklyScore(data);
    }
  }, [useMockData]);

  const fetchMonthlyScore = useCallback(async (year: number, month: number) => {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const date = `${year}-${String(month).padStart(2, '0')}-01`;
      setMonthlyScore(generateMockScore('monthly', date));
    } else {
      const data = await fetchApi<Score>(`/scores/monthly?year=${year}&month=${month}`);
      setMonthlyScore(data);
    }
  }, [useMockData]);

  return { dailyScore, weeklyScore, monthlyScore, fetchDailyScore, fetchWeeklyScore, fetchMonthlyScore };
}

export function useHistory() {
  const { useMockData } = useMockDataContext();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (days: number = 7) => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setHistory(generateMockHistory(days));
      } else {
        const data = await fetchApi<HistoryEntry[]>(`/scores/history?days=${days}`);
        setHistory(data);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  return { history, loading, fetchHistory };
}

export function useCategories() {
  const { useMockData } = useMockDataContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setCategories(generateMockCategories());
      } else {
        const data = await fetchApi<Category[]>('/categories');
        setCategories(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch categories');
      setError(error);
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  const createCategory = useCallback(async (category: CategoryCreate) => {
    if (useMockData) {
      console.log('Mock mode: Create category ignored', category);
      return;
    }

    setError(null);
    try {
      await fetchApi<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      });
      await fetchCategories();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create category');
      setError(error);
      throw error;
    }
  }, [fetchCategories, useMockData]);

  const updateCategory = useCallback(async (id: number, category: CategoryUpdate) => {
    if (useMockData) {
      console.log('Mock mode: Update category ignored', id, category);
      return;
    }

    setError(null);
    try {
      await fetchApi<Category>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(category),
      });
      await fetchCategories();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update category');
      setError(error);
      throw error;
    }
  }, [fetchCategories, useMockData]);

  const deleteCategory = useCallback(async (id: number) => {
    if (useMockData) {
      console.log('Mock mode: Delete category ignored', id);
      return;
    }

    setError(null);
    try {
      await fetchApi(`/categories/${id}`, { method: 'DELETE' });
      await fetchCategories();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete category');
      setError(error);
      throw error;
    }
  }, [fetchCategories, useMockData]);

  return { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory };
}

export function useCategorySummary() {
  const { useMockData } = useMockDataContext();
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategorySummary = useCallback(async (days: number = 7) => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setCategorySummaries(generateMockCategorySummaries(days));
      } else {
        const data = await fetchApi<CategorySummary[]>(`/scores/category-summary?days=${days}`);
        setCategorySummaries(data);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  return { categorySummaries, loading, fetchCategorySummary };
}

export function useSpecialDays(startDate: string, endDate: string) {
  const { useMockData } = useMockDataContext();
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSpecialDays = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        // Mock mode: return empty array
        await new Promise(resolve => setTimeout(resolve, 300));
        setSpecialDays([]);
      } else {
        const data = await fetchApi<SpecialDay[]>(`/special-days?start_date=${startDate}&end_date=${endDate}`);
        setSpecialDays(data);
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, useMockData]);

  const createSpecialDay = useCallback(async (specialDay: SpecialDayCreate) => {
    if (useMockData) {
      console.log('Mock mode: Create special day ignored', specialDay);
      return;
    }
    await fetchApi('/special-days', {
      method: 'POST',
      body: JSON.stringify(specialDay),
    });
    await fetchSpecialDays();
  }, [useMockData, fetchSpecialDays]);

  const deleteSpecialDay = useCallback(async (date: string) => {
    if (useMockData) {
      console.log('Mock mode: Delete special day ignored', date);
      return;
    }
    await fetchApi(`/special-days/${date}`, {
      method: 'DELETE',
    });
    await fetchSpecialDays();
  }, [useMockData, fetchSpecialDays]);

  return { specialDays, loading, fetchSpecialDays, createSpecialDay, deleteSpecialDay };
}

// Diet Tracking Hooks

export function useNutritionGoals() {
  const { useMockData } = useMockDataContext();
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        // Mock default goals
        setGoals({
          id: 1,
          user_id: 1,
          base_calories: 2000,
          protein_g: 150,
          carbs_g: 200,
          fat_g: 65,
          fiber_g: 25,
          vitamin_c_mg: 90,
          vitamin_d_mcg: 20,
          calcium_mg: 1000,
          iron_mg: 18,
          magnesium_mg: 400,
          potassium_mg: 3500,
          sodium_mg: 2300,
          zinc_mg: 11,
          vitamin_b6_mg: 1.7,
          vitamin_b12_mcg: 2.4,
          omega3_g: 1.6,
          adjust_for_activity: true,
          calories_per_activity_point: 10,
          target_weight: null,
          weight_unit: 'lbs',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        const data = await fetchApi<NutritionGoals>('/nutrition/goals');
        setGoals(data);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  const updateGoals = useCallback(async (updates: NutritionGoalsUpdate) => {
    if (useMockData) {
      console.log('Mock mode: Update goals ignored', updates);
      return;
    }
    const data = await fetchApi<NutritionGoals>('/nutrition/goals', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setGoals(data);
  }, [useMockData]);

  return { goals, loading, fetchGoals, updateGoals };
}

export function useMeals(startDate?: string, endDate?: string) {
  const { useMockData } = useMockDataContext();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setMeals([]);
      } else {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const url = `/meals${params.toString() ? '?' + params.toString() : ''}`;
        const data = await fetchApi<Meal[]>(url);
        setMeals(data);
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, useMockData]);

  const createMeal = useCallback(async (meal: MealCreate) => {
    if (useMockData) {
      console.log('Mock mode: Create meal ignored', meal);
      return;
    }
    await fetchApi<Meal>('/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
    await fetchMeals();
  }, [useMockData, fetchMeals]);

  const updateMeal = useCallback(async (id: number, meal: MealCreate) => {
    if (useMockData) {
      console.log('Mock mode: Update meal ignored', id, meal);
      return;
    }
    await fetchApi<Meal>(`/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(meal),
    });
    await fetchMeals();
  }, [useMockData, fetchMeals]);

  const deleteMeal = useCallback(async (id: number) => {
    if (useMockData) {
      console.log('Mock mode: Delete meal ignored', id);
      return;
    }
    await fetchApi(`/meals/${id}`, { method: 'DELETE' });
    await fetchMeals();
  }, [useMockData, fetchMeals]);

  return { meals, loading, fetchMeals, createMeal, updateMeal, deleteMeal };
}

export function useFoodItems() {
  const { useMockData } = useMockDataContext();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFoodItems = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setFoodItems([]);
      } else {
        const data = await fetchApi<FoodItem[]>('/food-items');
        setFoodItems(data);
      }
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  const createFoodItem = useCallback(async (food: FoodItemCreate) => {
    if (useMockData) {
      console.log('Mock mode: Create food item ignored', food);
      return;
    }
    await fetchApi<FoodItem>('/food-items', {
      method: 'POST',
      body: JSON.stringify(food),
    });
    await fetchFoodItems();
  }, [useMockData, fetchFoodItems]);

  const updateFoodItem = useCallback(async (id: number, food: FoodItemCreate) => {
    if (useMockData) {
      console.log('Mock mode: Update food item ignored', id, food);
      return;
    }
    await fetchApi<FoodItem>(`/food-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(food),
    });
    await fetchFoodItems();
  }, [useMockData, fetchFoodItems]);

  const deleteFoodItem = useCallback(async (id: number) => {
    if (useMockData) {
      console.log('Mock mode: Delete food item ignored', id);
      return;
    }
    await fetchApi(`/food-items/${id}`, { method: 'DELETE' });
    await fetchFoodItems();
  }, [useMockData, fetchFoodItems]);

  return { foodItems, loading, fetchFoodItems, createFoodItem, updateFoodItem, deleteFoodItem };
}

export function useWeightLogs(days: number = 90) {
  const { useMockData } = useMockDataContext();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWeightLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setWeightLogs([]);
      } else {
        const data = await fetchApi<WeightLog[]>(`/weight-logs?days=${days}`);
        setWeightLogs(data);
      }
    } finally {
      setLoading(false);
    }
  }, [days, useMockData]);

  const logWeight = useCallback(async (log: WeightLogCreate) => {
    if (useMockData) {
      console.log('Mock mode: Log weight ignored', log);
      return;
    }
    await fetchApi<WeightLog>('/weight-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    await fetchWeightLogs();
  }, [useMockData, fetchWeightLogs]);

  const deleteWeightLog = useCallback(async (id: number) => {
    if (useMockData) {
      console.log('Mock mode: Delete weight log ignored', id);
      return;
    }
    await fetchApi(`/weight-logs/${id}`, { method: 'DELETE' });
    await fetchWeightLogs();
  }, [useMockData, fetchWeightLogs]);

  return { weightLogs, loading, fetchWeightLogs, logWeight, deleteWeightLog };
}

export function useNutritionSummary(targetDate: string) {
  const { useMockData } = useMockDataContext();
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        // Mock summary with empty data
        setSummary({
          date: targetDate,
          goals: {
            id: 1,
            user_id: 1,
            base_calories: 2000,
            protein_g: 150,
            carbs_g: 200,
            fat_g: 65,
            fiber_g: 25,
            vitamin_c_mg: 90,
            vitamin_d_mcg: 20,
            calcium_mg: 1000,
            iron_mg: 18,
            magnesium_mg: 400,
            potassium_mg: 3500,
            sodium_mg: 2300,
            zinc_mg: 11,
            vitamin_b6_mg: 1.7,
            vitamin_b12_mcg: 2.4,
            omega3_g: 1.6,
            adjust_for_activity: true,
            calories_per_activity_point: 10,
            target_weight: null,
            weight_unit: 'lbs',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          actual: {
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
            vitamin_c_mg: 0,
            vitamin_d_mcg: 0,
            calcium_mg: 0,
            iron_mg: 0,
            magnesium_mg: 0,
            potassium_mg: 0,
            sodium_mg: 0,
            zinc_mg: 0,
            vitamin_b6_mg: 0,
            vitamin_b12_mcg: 0,
            omega3_g: 0,
          },
          percentage: {
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
          },
          meals: [],
          activity_points: 0,
          adjusted_calorie_goal: 2000,
        });
      } else {
        const data = await fetchApi<DailyNutritionSummary>(
          `/nutrition/summary/daily?target_date=${targetDate}`
        );
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }, [targetDate, useMockData]);

  return { summary, loading, fetchSummary };
}
