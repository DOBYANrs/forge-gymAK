import { useTimer } from '../../context/TimerContext';
import type { RestTimerPreset } from '../../types';

const presets: RestTimerPreset[] = [1, 2, 3, 4, 5];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RestTimerPopup() {
  const {
    activePreset, isRunning, isMinimized, remainingSeconds, totalSeconds,
    justFinished, setJustFinished,
    startTimer, pauseTimer, resumeTimer, stopTimer,
    minimizeTimer, restoreTimer,
  } = useTimer();

  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  // Timer complete overlay
  if (justFinished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <div
          className="rounded-2xl shadow-xl p-8 w-80 mx-4 text-center animate-scaleIn"
          style={{
            background: 'linear-gradient(135deg, rgba(22,22,40,0.98), rgba(30,30,50,0.95))',
            border: '1px solid rgba(255,94,0,0.25)',
          }}
        >
          <div className="text-5xl mb-4 animate-pulse">⏰</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#FF5E00' }}>
            Timer Complete!
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Rest is over — time to crush your next set!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { stopTimer(); }}
              className="btn-primary px-6 py-2.5"
            >
              Dismiss
            </button>
            <button
              onClick={() => { setJustFinished(false); startTimer(activePreset ?? 2); }}
              className="btn-secondary px-6 py-2.5"
            >
              Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nothing shown when no timer is active
  if (!activePreset && !isRunning) {
    return null;
  }

  if (isMinimized) {
    return (
      <button
        onClick={restoreTimer}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-200 active:scale-90"
        style={{
          background: 'rgba(22,22,40,0.95)',
          border: '1px solid rgba(255,94,0,0.2)',
        }}
      >
        ⏱️
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="rounded-2xl shadow-xl p-6 w-72 mx-4"
        style={{
          background: 'linear-gradient(135deg, rgba(22,22,40,0.98), rgba(30,30,50,0.95))',
          border: '1px solid rgba(255,94,0,0.15)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(203,213,225,0.8)' }}>Rest Timer</h3>
          <div className="flex gap-1">
            <button
              onClick={minimizeTimer}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(148,163,184,0.5)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={stopTimer}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(239,68,68,0.5)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Timer circle */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="64" cy="64" r="56"
              fill="none"
              stroke={remainingSeconds > 10 ? '#FF5E00' : '#ef4444'}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
              style={{ filter: remainingSeconds > 10 ? 'drop-shadow(0 0 6px rgba(255,94,0,0.4))' : 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${remainingSeconds > 10 ? '' : 'animate-pulse'}`}
              style={{ color: remainingSeconds > 10 ? '#f1f5f9' : '#ef4444' }}
            >
              {formatTime(remainingSeconds)}
            </span>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex justify-center gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => startTimer(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: activePreset === p ? 'rgba(255,94,0,0.15)' : 'rgba(255,255,255,0.05)',
                color: activePreset === p ? '#FF5E00' : 'rgba(148,163,184,0.6)',
                border: activePreset === p ? '1px solid rgba(255,94,0,0.3)' : '1px solid transparent',
              }}
            >
              {p}m
            </button>
          ))}
        </div>

        {/* Control buttons */}
        <div className="flex justify-center gap-3">
          {isRunning ? (
            <button
              onClick={pauseTimer}
              className="px-8 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: 'rgba(255,120,40,0.12)',
                color: '#FF5E00',
                border: '1px solid rgba(255,94,0,0.2)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,94,0,0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,120,40,0.12)'}
            >
              Pause
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              className="btn-primary px-8 py-2.5"
            >
              Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
