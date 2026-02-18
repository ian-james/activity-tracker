import { useState, useEffect } from 'react';
import { useWeightLogs, useNutritionGoals } from '../../hooks/useApi';
import { WeightLogCreate } from '../../types';

export function WeightTracker() {
  const { weightLogs, fetchWeightLogs, logWeight, deleteWeightLog } = useWeightLogs(90);
  const { goals, fetchGoals } = useNutritionGoals();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<WeightLogCreate>({
    log_date: new Date().toISOString().split('T')[0],
    weight: 0,
    weight_unit: 'lbs',
    notes: '',
  });

  useEffect(() => {
    fetchWeightLogs();
    fetchGoals();
  }, [fetchWeightLogs, fetchGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logWeight(formData);
    setShowForm(false);
    setFormData({
      log_date: new Date().toISOString().split('T')[0],
      weight: 0,
      weight_unit: formData.weight_unit,
      notes: '',
    });
  };

  const latestWeight = weightLogs.length > 0 ? weightLogs[0] : null;
  const startingWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const weightChange = latestWeight && startingWeight
    ? latestWeight.weight - startingWeight.weight
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Weight Tracker</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Log Weight'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Current Weight</p>
          <p className="text-2xl font-bold text-gray-900">
            {latestWeight ? `${latestWeight.weight} ${latestWeight.weight_unit}` : '—'}
          </p>
          {latestWeight && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(latestWeight.log_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Target Weight</p>
          <p className="text-2xl font-bold text-gray-900">
            {goals?.target_weight ? `${goals.target_weight} ${goals.weight_unit}` : '—'}
          </p>
          {goals?.target_weight && latestWeight && (
            <p className="text-xs text-gray-500 mt-1">
              {Math.abs(latestWeight.weight - goals.target_weight).toFixed(1)} {goals.weight_unit} to go
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Change (90 days)</p>
          <p className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-600 dark:text-green-400' : weightChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900'}`}>
            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {latestWeight?.weight_unit || 'lbs'}
          </p>
        </div>
      </div>

      {/* Log Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.log_date}
                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  step="0.1"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.weight_unit}
                  onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value as 'lbs' | 'kg' })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
          >
            Log Weight
          </button>
        </form>
      )}

      {/* Weight Log History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900">Weight History (Last 90 days)</h4>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {weightLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No weight logs yet. Click "Log Weight" to get started.
            </div>
          ) : (
            weightLogs.map((log) => (
              <div key={log.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    {log.weight} {log.weight_unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(log.log_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  {log.notes && (
                    <p className="text-sm text-gray-500 italic mt-1">{log.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this weight log?')) {
                      deleteWeightLog(log.id);
                    }
                  }}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
