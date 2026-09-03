import { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useTimer } from '../../context/TimerContext';
import { exportAllData, downloadJsonFile, readJsonFile, importAllData } from '../../services/storage';

export default function Header() {
  const { startTimer } = useTimer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  const handleExport = () => {
    const data = exportAllData();
    const filename = `kasaint-gym-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJsonFile(data, filename);
    setShowBackupMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowBackupMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      const result = importAllData(data as Record<string, unknown>);
      alert(result.message);
      if (result.success) {
        // Tell AppContent to skip the character selector after this reload so
        // importing a backup doesn't bounce the user back to "Who's training?".
        sessionStorage.setItem('kasaint_gym_just_imported', '1');
        window.location.reload();
      }
    } catch (error) {
      alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(15,15,26,0.92), rgba(22,22,40,0.85))',
        borderColor: 'rgba(255,94,0,0.1)',
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: '#FF5E00' }}>KASAINT</h1>
            <span className="text-sm hidden xs:inline" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Abel & Keneni
            </span>
          </div>
          <div className="flex items-center gap-2 relative">
            <NavLink
              to="/body"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-200 active:scale-90"
              style={({ isActive }) => ({
                background: isActive ? 'rgba(255,94,0,0.1)' : 'transparent',
                color: isActive ? '#FF5E00' : 'rgba(148,163,184,0.6)',
              })}
              title="Body metrics (kg & height)"
            >
              ⚖️
            </NavLink>
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-200 active:scale-90"
              style={{
                background: showBackupMenu ? 'rgba(255,94,0,0.1)' : 'transparent',
                color: showBackupMenu ? '#FF5E00' : 'rgba(148,163,184,0.6)',
              }}
              title="Backup / Restore data"
            >
              💾
            </button>
            {showBackupMenu && (
              <>
                <div
                  className="absolute top-full right-0 mt-1 rounded-xl shadow-lg py-1 min-w-[160px] z-50"
                  style={{
                    background: 'rgba(22,22,40,0.95)',
                    border: '1px solid rgba(255,94,0,0.15)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <button
                    onClick={handleExport}
                    className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-all"
                    style={{ color: 'rgba(203,213,225,0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,94,0,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📤 Export data
                  </button>
                  <button
                    onClick={handleImportClick}
                    className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-all"
                    style={{ color: 'rgba(203,213,225,0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,94,0,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📥 Import data
                  </button>
                </div>
                <div className="fixed inset-0 z-40" onClick={() => setShowBackupMenu(false)} />
              </>
            )}
            <button
              onClick={() => startTimer(2)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-200 active:scale-90 hover:bg-white/5"
              style={{ color: 'rgba(148,163,184,0.6)' }}
              title="Rest timer"
            >
              ⏱
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
