import { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useMockData } from '../contexts/MockDataContext';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { useMockData: mockDataEnabled, toggleMockData } = useMockData();
  const [exportStatus, setExportStatus] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setExportStatus('Exporting...');
      const response = await fetch('/api/export', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('✓ Export successful!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('✗ Export failed');
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportStatus('Importing...');

      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/import', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import failed');
      }

      const result = await response.json();
      setImportStatus(`✓ Imported ${result.imported.activities} activities, ${result.imported.logs} logs`);
      setTimeout(() => {
        setImportStatus('');
        window.location.reload(); // Reload to show new data
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`✗ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setImportStatus(''), 5000);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetAllScores = async () => {
    try {
      setResetting(true);
      setResetStatus('Resetting...');

      const response = await fetch('/api/logs/reset/all', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Reset failed');
      }

      const result = await response.json();
      setResetStatus(`✓ Deleted ${result.count} logs. All scores reset!`);
      setTimeout(() => {
        setResetStatus('');
        setShowResetConfirm(false);
        window.location.reload(); // Reload to show cleared data
      }, 2000);
    } catch (error) {
      console.error('Reset error:', error);
      setResetStatus(`✗ Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setResetStatus(''), 5000);
    } finally {
      setResetting(false);
    }
  };

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

      {/* Data Export/Import Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
          Data Management
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Export your data for backup or import from a previous backup
        </p>

        <div className="space-y-3">
          {/* Export Button */}
          <div>
            <button
              onClick={handleExport}
              disabled={mockDataEnabled}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Export Data as JSON
            </button>
            {exportStatus && (
              <p className={`mt-2 text-sm ${exportStatus.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {exportStatus}
              </p>
            )}
          </div>

          {/* Import Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              disabled={mockDataEnabled || importing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              {importing ? 'Importing...' : 'Import Data from JSON'}
            </button>
            {importStatus && (
              <p className={`mt-2 text-sm ${importStatus.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {importStatus}
              </p>
            )}
          </div>

          {mockDataEnabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Export/Import disabled while using demo data
            </p>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Import will merge with existing data. Activities and categories with the same name will be reused.
        </div>
      </div>

      {/* Reset All Scores Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800">
        <h3 className="font-medium text-red-700 dark:text-red-400 mb-4">
          Reset All Scores
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Delete all activity logs and reset all scores. Your activities and categories will not be affected.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={mockDataEnabled}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            Reset All Scores
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                ⚠️ Are you sure?
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                This will permanently delete all your activity logs and cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetAllScores}
                disabled={resetting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                {resetting ? 'Resetting...' : 'Yes, Delete All Logs'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
            {resetStatus && (
              <p className={`text-sm ${resetStatus.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {resetStatus}
              </p>
            )}
          </div>
        )}

        {mockDataEnabled && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Reset disabled while using demo data
          </p>
        )}

        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
          <strong>Testing Phase:</strong> Use this to clear all previous activity logs while keeping your activities and categories intact.
        </div>
      </div>

    </div>
  );
}
