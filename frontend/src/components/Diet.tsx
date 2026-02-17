import { useState, useEffect } from 'react';
import { useMeals, useNutritionSummary } from '../hooks/useApi';
import { MealForm } from './diet/MealForm';
import { NutritionSummary } from './diet/NutritionSummary';
import { MealList } from './diet/MealList';
import { WeightTracker } from './diet/WeightTracker';
import { GoalsSettings } from './diet/GoalsSettings';

type View = 'today' | 'history' | 'weight' | 'goals';

export function Diet() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMealForm, setShowMealForm] = useState(false);
  const [view, setView] = useState<View>('today');

  const dateStr = currentDate.toISOString().split('T')[0];
  const { meals, fetchMeals, createMeal, updateMeal, deleteMeal } = useMeals(dateStr, dateStr);
  const { summary, fetchSummary } = useNutritionSummary(dateStr);

  useEffect(() => {
    fetchMeals();
    fetchSummary();
  }, [dateStr, fetchMeals, fetchSummary]);

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setView('today')}
            className={`px-6 py-3 font-medium transition-colors ${
              view === 'today'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setView('weight')}
            className={`px-6 py-3 font-medium transition-colors ${
              view === 'weight'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Weight
          </button>
          <button
            onClick={() => setView('goals')}
            className={`px-6 py-3 font-medium transition-colors ${
              view === 'goals'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Goals
          </button>
        </div>

        {/* Today View */}
        {view === 'today' && (
          <div className="p-6 space-y-6">
            {/* Date Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {formatDisplayDate(currentDate)}
                </h2>
                <p className="text-sm text-gray-500">{dateStr}</p>
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                →
              </button>
            </div>

            {currentDate.toDateString() !== new Date().toDateString() && (
              <button
                onClick={goToToday}
                className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Go to Today
              </button>
            )}

            {/* Nutrition Summary */}
            {summary && <NutritionSummary summary={summary} />}

            {/* Add Meal Button */}
            <button
              onClick={() => setShowMealForm(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Meal
            </button>

            {/* Meal Form */}
            {showMealForm && (
              <MealForm
                date={currentDate}
                onSubmit={async (meal) => {
                  await createMeal(meal);
                  await fetchSummary();
                  setShowMealForm(false);
                }}
                onCancel={() => setShowMealForm(false)}
              />
            )}

            {/* Meal List */}
            <MealList
              meals={meals}
              onDelete={async (id) => {
                await deleteMeal(id);
                await fetchSummary();
              }}
              onUpdate={async (id, meal) => {
                await updateMeal(id, meal);
                await fetchSummary();
              }}
            />
          </div>
        )}

        {/* Weight View */}
        {view === 'weight' && (
          <div className="p-6">
            <WeightTracker />
          </div>
        )}

        {/* Goals View */}
        {view === 'goals' && (
          <div className="p-6">
            <GoalsSettings />
          </div>
        )}
      </div>
    </div>
  );
}
