import type { UserId } from '../types';

const SELECTION_KEY = 'forge_gym_selected_user';

export function getStoredUser(): UserId | null {
  try {
    const stored = localStorage.getItem(SELECTION_KEY);
    if (stored === 'abel' || stored === 'keneni') return stored;
  } catch {}
  return null;
}

export function storeUser(user: UserId) {
  try {
    localStorage.setItem(SELECTION_KEY, user);
  } catch {}
}

interface UserSelectorProps {
  onSelect: (user: UserId) => void;
}

export default function UserSelector({ onSelect }: UserSelectorProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      {/* Decorative glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(255,94,0,0.08), transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm text-center animate-scaleIn">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#FF5E00' }}>
            FORGE
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Gym Tracker
          </p>
        </div>

        {/* Decorative line */}
        <div className="w-16 h-0.5 mx-auto mb-8 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #FF5E00, transparent)' }} />

        <p className="text-lg font-semibold mb-8" style={{ color: '#e2e8f0' }}>
          Who's training today?
        </p>

        <div className="space-y-4">
          {/* Abel button */}
          <button
            onClick={() => onSelect('abel')}
            className="w-full p-5 rounded-xl text-left transition-all duration-300 active:scale-[0.98] group"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(59,130,246,0.15)' }}
              >
                👤
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Abel</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  Track your workouts and progress
                </p>
              </div>
              <span className="text-sm" style={{ color: 'rgba(96,165,250,0.6)' }}>→</span>
            </div>
          </button>

          {/* Keneni button */}
          <button
            onClick={() => onSelect('keneni')}
            className="w-full p-5 rounded-xl text-left transition-all duration-300 active:scale-[0.98] group"
            style={{
              background: 'linear-gradient(135deg, rgba(74,222,128,0.12), rgba(74,222,128,0.04))',
              border: '1px solid rgba(74,222,128,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(74,222,128,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(74,222,128,0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(74,222,128,0.15)' }}
              >
                👤
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Keneni</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  Track your workouts and progress
                </p>
              </div>
              <span className="text-sm" style={{ color: 'rgba(74,222,128,0.6)' }}>→</span>
            </div>
          </button>
        </div>

        {/* Switch user hint */}
        <p className="text-xs mt-8" style={{ color: 'rgba(148,163,184,0.3)' }}>
          You can switch users later in the app
        </p>
      </div>
    </div>
  );
}
