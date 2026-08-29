import { useTimer } from '../../context/TimerContext';

export default function RestTimerBar() {
  const { isRunning, remainingSeconds, totalSeconds, startTimer, stopTimer } = useTimer();

  if (!isRunning) return null;

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp"
      style={{
        background: 'linear-gradient(180deg, rgba(11,12,16,0.95), rgba(20,22,29,0.98))',
        borderTop: '1px solid rgba(255, 94, 0, 0.2)',
        backdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #FF5E00, #00E5FF)',
            boxShadow: '0 0 8px rgba(255, 94, 0, 0.4)',
          }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Timer display */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: remainingSeconds <= 10
                ? 'rgba(255, 82, 82, 0.15)'
                : 'rgba(255, 94, 0, 0.12)',
              border: `1px solid ${remainingSeconds <= 10 ? 'rgba(255, 82, 82, 0.3)' : 'rgba(255, 94, 0, 0.2)'}`,
            }}
          >
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: remainingSeconds <= 10 ? '#FF5252' : '#FF5E00' }}
            >
              {timeStr}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Rest Timer
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(142, 149, 165, 0.5)' }}>
              {totalSeconds >= 60 ? `${totalSeconds / 60} min` : `${totalSeconds}s`} total
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* +30s button — restart with extra time */}
          <button
            onClick={() => {
              const newSecs = remainingSeconds + 30;
              const newMins = Math.ceil(newSecs / 60) as 1 | 2 | 3 | 4 | 5;
              startTimer(Math.min(newMins, 5) as 1 | 2 | 3 | 4 | 5);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(0, 229, 255, 0.1)',
              color: '#00E5FF',
              border: '1px solid rgba(0, 229, 255, 0.2)',
            }}
          >
            +30s
          </button>

          {/* Skip button */}
          <button
            onClick={stopTimer}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            Skip
          </button>

          {/* Stop button */}
          <button
            onClick={stopTimer}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(255, 82, 82, 0.1)',
              color: '#FF5252',
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
