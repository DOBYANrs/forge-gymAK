import { useState, useCallback } from 'react';

interface FistBumpProps {
  count?: number;
  onBump?: () => void;
}

export default function FistBump({ count = 0, onBump }: FistBumpProps) {
  const [localCount, setLocalCount] = useState(count);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  const handleBump = useCallback(() => {
    setLocalCount((c) => c + 1);
    onBump?.();

    // Create particle burst
    const colors = ['#FF5E00', '#00E5FF', '#00E676', '#FF5252', '#FFD740'];
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 80,
      y: -(Math.random() * 60 + 20),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 600);
  }, [onBump]);

  return (
    <button
      onClick={handleBump}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
      style={{
        background: localCount > 0 ? 'rgba(255, 94, 0, 0.1)' : 'rgba(255, 255, 255, 0.04)',
        border: localCount > 0 ? '1px solid rgba(255, 94, 0, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: 'fistBumpParticle 0.6s ease-out forwards',
            transform: `translate(${p.x}px, ${p.y}px)`,
          }}
        />
      ))}

      <span className="text-sm">👊</span>
      <span className="text-xs font-semibold" style={{ color: localCount > 0 ? '#FF5E00' : 'var(--text-muted)' }}>
        {localCount > 0 ? localCount : 'Fist Bump'}
      </span>

      <style>{`
        @keyframes fistBumpParticle {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx, 0), var(--ty, -40px)) scale(0); }
        }
      `}</style>
    </button>
  );
}
