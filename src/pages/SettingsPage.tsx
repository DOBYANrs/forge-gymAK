import { useState, useRef } from 'react';
import { useWorkout } from '../context/WorkoutContext';
import { useUser } from '../context/UserContext';
import { USER_COLORS } from '../types';
import { exportAllData, importAllData, downloadJsonFile, readJsonFile } from '../services/storage';

export default function SettingsPage() {
  const { activeUser } = useUser();
  const colors = USER_COLORS[activeUser];
  const { clearAllData } = useWorkout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = () => {
    const data = exportAllData();
    const filename = `kasaint-gym-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(data, filename);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = (await readJsonFile(file)) as Record<string, unknown>;
      const result = importAllData(data, activeUser);
      setImportStatus(result);
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      setImportStatus({
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    clearAllData();
    localStorage.removeItem('kasaint_gym_body_metrics');
    setShowClearConfirm(false);
    setImportStatus({ success: true, message: 'All data cleared. Refreshing...' });
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-4 page-enter">
      <h2 className="text-lg font-bold text-gray-800">Settings</h2>

      {/* User info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: colors.primary }}
          >
            {activeUser[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800 capitalize">{activeUser}</p>
            <p className="text-xs text-gray-400">Training with KASAINT</p>
          </div>
        </div>
      </div>

      {/* Firebase setup info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">🔗 Firebase Sync</h3>
        <p className="text-xs text-gray-400 mb-3">
          To enable real-time sync between Abel and Keneni, create a <code className="bg-gray-100 px-1 rounded">.env</code> file in the project root with your Firebase config:
        </p>
        <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 overflow-x-auto">
{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
        </pre>
      </div>

      {/* Data management */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">💾 Data Management</h3>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="btn-primary w-full"
            style={{ backgroundColor: colors.primary }}
          >
            📤 Export Data (JSON)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 rounded-lg font-medium text-sm border-2 transition-all duration-200 hover:bg-gray-50 active:scale-[0.99]"
            style={{ borderColor: colors.border, color: colors.primary }}
          >
            📥 Import Data (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {importStatus && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              importStatus.success
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {importStatus.message}
          </div>
        )}
      </div>

      {/* Clear data */}
      <div className="card border-red-100">
        <h3 className="text-sm font-semibold text-red-400 mb-2">⚠️ Danger Zone</h3>
        {showClearConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Are you sure? This will permanently delete all workout and body metrics data for both users.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearData}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2.5 rounded-lg font-medium text-sm border-2 border-red-200 text-red-400 hover:bg-red-50 transition-all duration-200"
          >
            🗑️ Clear All Data
          </button>
        )}
      </div>

      {/* App info */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-300">KASAINT Gym Tracker v1.0.0</p>
        <p className="text-xs text-gray-300 mt-1">Built for Abel & Keneni 💪</p>
      </div>
    </div>
  );
}
