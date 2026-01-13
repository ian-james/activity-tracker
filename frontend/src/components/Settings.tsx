import { useTheme } from '../contexts/ThemeContext';
import { useMockData } from '../contexts/MockDataContext';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { useMockData: mockDataEnabled, toggleMockData } = useMockData();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Settings
      </h2>

      {/* Theme Setting Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Theme
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose light or dark mode
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            aria-label="Toggle theme"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Visual indicator */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Current: <span className="font-medium capitalize">{theme}</span> mode
        </div>
      </div>

      {/* Mock Data Setting Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Demo Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Show sample data for testing features
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={toggleMockData}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              mockDataEnabled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            aria-label="Toggle demo data"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mockDataEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Visual indicator */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Status: <span className="font-medium">{mockDataEnabled ? 'Enabled' : 'Disabled'}</span>
          {mockDataEnabled && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Using demo data. No changes will be saved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
