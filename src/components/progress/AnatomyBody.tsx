import { useMemo, useState } from 'react';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface AnatomyBodyProps {
  muscleScores: MuscleScore[];
  view: 'front' | 'back';
  width?: number;
}

// Professional muted colors per muscle group
const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#C62828',
  Shoulders: '#1565C0',
  Biceps: '#E65100',
  Triceps: '#D84315',
  Abs: '#2E7D32',
  Back: '#0D47A1',
  Forearms: '#5D4037',
  Quads: '#388E3C',
  Hamstrings: '#558B2F',
  Calves: '#4E342E',
};

// ============================================================
// FRONT VIEW — Anatomically correct SVG paths
// Body proportions based on 8-head canon (standard anatomy)
// ViewBox: 0,0 to 120,240 (120 wide, 240 tall)
// Head: 0-30, Neck: 30-40, Chest: 40-80, Abs: 80-110,
// Hips: 110-120, Thighs: 120-170, Calves: 170-220, Feet: 220-240
// ============================================================

// Body silhouette — organic curves
const BODY_SILHOUETTE = `M60,6 C50,6 42,10 40,16 C38,20 38,24 40,28
L38,32 C34,34 26,36 20,40 C14,44 10,50 8,56 C6,62 6,70 6,78
L4,84 C2,90 2,98 4,106 L6,110 C4,116 2,128 2,138
L2,158 C2,164 2,170 4,176 L4,198 C4,202 6,206 10,206
L22,206 C24,206 26,204 26,200 L26,182 C26,176 28,170 30,166
L40,166 C42,166 44,168 44,172 L44,182 C44,188 46,194 48,198
L48,206 L60,206 L60,198 C60,194 58,188 58,182 L58,172
C58,168 60,166 62,166 L72,166 C74,170 76,176 76,182
L76,200 C76,204 78,206 80,206 L92,206 C96,206 98,202 98,198
L98,176 C100,170 102,164 102,158 L102,138
C102,128 100,116 98,110 L100,106 C102,98 102,90 100,84
L98,78 C98,70 98,62 96,56 C94,50 90,44 84,40
C78,36 70,34 66,32 L64,28 C66,24 66,20 64,16
C62,10 54,6 60,6 Z`;

// ===== FRONT MUSCLES =====
const FRONT_MUSCLES: Record<string, { path: string; label: string; cx: number; cy: number }> = {
  'Shoulders': {
    // Deltoid — cap on outer shoulder
    path: `M28,38 C22,38 16,42 12,48 C10,52 10,58 12,62 C16,64 22,60 26,54 C28,50 28,44 28,38 Z
           M92,38 C98,38 104,42 108,48 C110,52 110,58 108,62 C104,64 98,60 94,54 C92,50 92,44 92,38 Z`,
    label: 'Shoulders', cx: 14, cy: 52,
  },
  'Chest': {
    // Pectoralis — two fan shapes from collarbone to armpit
    path: `M32,40 C32,38 36,36 42,36 L58,36 C58,38 58,40 58,42
           C56,46 52,50 48,54 C44,58 38,60 34,60 C32,58 32,50 32,40 Z
           M88,40 C88,38 84,36 78,36 L62,36 C62,38 62,40 62,42
           C64,46 68,50 72,54 C76,58 82,60 86,60 C88,58 88,50 88,40 Z`,
    label: 'Chest', cx: 46, cy: 50,
  },
  'Biceps': {
    // Bicep bulge — front of upper arm
    path: `M12,52 C10,52 8,56 8,62 C8,70 8,78 10,82 C12,84 14,84 16,82 C18,78 18,70 18,62 C18,56 16,52 14,52 Z
           M104,52 C106,52 108,56 108,62 C108,70 108,78 106,82 C104,84 102,84 100,82 C98,78 98,70 98,62 C98,56 100,52 102,52 Z`,
    label: 'Biceps', cx: 12, cy: 68,
  },
  'Abs': {
    // Rectus abdominis — center strip with horizontal lines
    path: `M52,62 C52,60 54,58 56,58 L64,58 C66,58 68,60 68,62
           L68,100 C68,102 66,104 64,104 L56,104 C54,104 52,102 52,100 Z`,
    label: 'Abs', cx: 60, cy: 82,
  },
  'Forearms': {
    // Forearm — tapered from elbow to wrist
    path: `M6,84 C4,86 4,94 4,102 C4,110 4,116 6,120
           C8,118 10,112 10,104 C10,96 8,88 6,84 Z
           M110,84 C112,86 112,94 112,102 C112,110 112,116 110,120
           C108,118 106,112 106,104 C106,96 108,88 110,84 Z`,
    label: 'Forearms', cx: 6, cy: 104,
  },
  'Quads': {
    // Quadriceps — large front thigh
    path: `M34,122 C32,122 30,126 30,132 L30,162 C30,166 32,170 34,170
           L46,170 C48,170 48,166 48,162 L48,132 C48,126 46,122 44,122 Z
           M82,122 C84,122 86,126 86,132 L86,162 C86,166 84,170 82,170
           L70,170 C68,170 68,166 68,162 L68,132 C68,126 70,122 72,122 Z`,
    label: 'Quads', cx: 38, cy: 148,
  },
  'Calves': {
    // Tibialis anterior — front of lower leg
    path: `M36,174 C34,174 32,178 32,184 L32,200 C32,204 34,206 36,206
           L44,206 C46,206 46,204 46,200 L46,184 C46,178 44,174 42,174 Z
           M80,174 C82,174 84,178 84,184 L84,200 C84,204 82,206 80,206
           L72,206 C70,206 70,204 70,200 L70,184 C70,178 72,174 74,174 Z`,
    label: 'Calves', cx: 38, cy: 192,
  },
};

// ===== BACK MUSCLES =====
const BACK_MUSCLES: Record<string, { path: string; label: string; cx: number; cy: number }> = {
  'Shoulders': {
    path: `M26,36 C20,36 14,40 10,46 C8,50 8,56 10,60 C14,62 20,58 24,52 C26,48 26,42 26,36 Z
           M94,36 C100,36 106,40 110,46 C112,50 112,56 110,60 C106,62 100,58 96,52 C94,48 94,42 94,36 Z`,
    label: 'Rear Delts', cx: 12, cy: 50,
  },
  'Back': {
    // Trapezius + Lats — broad V
    path: `M34,36 C34,34 38,32 44,32 L76,32 C82,32 86,34 86,36
           L86,58 C86,62 84,66 80,68 L66,72 C64,72 56,72 54,72
           L40,68 C36,66 34,62 34,58 Z
           M36,68 C36,66 38,64 42,64 L78,64 C82,64 84,66 84,68
           L84,92 C84,96 82,98 78,98 L42,98 C38,98 36,96 36,92 Z`,
    label: 'Back', cx: 60, cy: 64,
  },
  'Triceps': {
    // Triceps — back of upper arm
    path: `M10,50 C8,50 6,54 6,60 C6,68 6,76 8,80 C10,82 12,82 14,80 C16,76 16,68 16,60 C16,54 14,50 12,50 Z
           M106,50 C108,50 110,54 110,60 C110,68 110,76 108,80 C106,82 104,82 102,80 C100,76 100,68 100,60 C100,54 102,50 104,50 Z`,
    label: 'Triceps', cx: 10, cy: 64,
  },
  'Forearms': {
    path: `M4,86 C2,88 2,96 2,104 C2,112 2,118 4,122
           C6,120 8,114 8,106 C8,98 6,90 4,86 Z
           M112,86 C114,88 114,96 114,104 C114,112 114,118 112,122
           C110,120 108,114 108,106 C108,98 110,90 112,86 Z`,
    label: 'Forearms', cx: 4, cy: 106,
  },
  'Hamstrings': {
    path: `M32,122 C30,122 28,126 28,132 L28,162 C28,166 30,170 32,170
           L46,170 C48,170 48,166 48,162 L48,132 C48,126 46,122 44,122 Z
           M84,122 C86,122 88,126 88,132 L88,162 C88,166 86,170 84,170
           L70,170 C68,170 68,166 68,162 L68,132 C68,126 70,122 72,122 Z`,
    label: 'Hamstrings', cx: 38, cy: 148,
  },
  'Calves': {
    // Gastrocnemius — diamond shape
    path: `M34,174 C32,174 30,178 30,184 C30,192 32,198 34,202
           C36,198 38,192 38,184 C38,178 36,174 34,174 Z
           M82,174 C84,174 86,178 86,184 C86,192 84,198 82,202
           C80,198 78,192 78,184 C78,178 80,174 82,174 Z`,
    label: 'Calves', cx: 34, cy: 190,
  },
  'Abs': {
    // Lower back / Erector spinae
    path: `M52,92 C52,90 54,88 56,88 L64,88 C66,88 68,90 68,92
           L68,108 C68,110 66,112 64,112 L56,112 C54,112 52,110 52,108 Z`,
    label: 'Lower Back', cx: 60, cy: 100,
  },
};

// Gradient defs
function MuscleGradients() {
  return (
    <defs>
      {Object.entries(MUSCLE_COLORS).map(([name, color]) => (
        <linearGradient key={name} id={`grad-${name}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="50%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.75} />
        </linearGradient>
      ))}
      <filter id="muscle-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export default function AnatomyBody({ muscleScores, view, width = 130 }: AnatomyBodyProps) {
  const height = width * (240 / 120);
  const [hovered, setHovered] = useState<string | null>(null);

  const scoresMap = useMemo(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) map.set(s.muscle, s);
    return map;
  }, [muscleScores]);

  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  return (
    <div className="text-center relative">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-muted)' }}>
        {view === 'front' ? 'Front' : 'Back'}
      </p>
      <svg viewBox="0 0 120 240" width={width} height={height} className="mx-auto">
        <MuscleGradients />

        {/* Body silhouette */}
        <path d={BODY_SILHOUETTE} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

        {/* Head */}
        <ellipse cx="60" cy="16" rx="12" ry="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />

        {/* Neck */}
        <path d="M54,28 C54,26 56,24 60,24 C64,24 66,26 66,28 L66,36 L54,36 Z" fill="rgba(255,255,255,0.02)" />

        {/* Muscle groups */}
        {Object.entries(muscles).map(([name, def]) => {
          const score = scoresMap.get(name);
          const tier = score?.tier ?? getTier(0);
          const hasData = score && score.score > 0;
          const isHovered = hovered === name;

          return (
            <g key={`${view}-${name}`}>
              <path
                d={def.path}
                fill={hasData ? `url(#grad-${name})` : 'rgba(255,255,255,0.04)'}
                fillOpacity={hasData ? Math.min(1, 0.5 + (score.score / 5000) * 0.5) : 0.3}
                stroke={isHovered ? '#fff' : hasData ? tier.color : 'rgba(255,255,255,0.06)'}
                strokeWidth={isHovered ? 1.2 : hasData ? 0.6 : 0.3}
                filter={hasData && score.score > 500 ? 'url(#muscle-glow)' : undefined}
                style={{ transition: 'all 0.4s ease', cursor: hasData ? 'pointer' : 'default' }}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
              />
              {hasData && (
                <>
                  <circle cx={def.cx} cy={def.cy} r={5} fill="rgba(0,0,0,0.6)" stroke={tier.color} strokeWidth={0.8} />
                  <text x={def.cx} y={def.cy + 0.5} textAnchor="middle" dominantBaseline="middle"
                    fontSize={4.5} fontWeight="bold" fill={tier.color} style={{ pointerEvents: 'none' }}>
                    {tier.name.charAt(0)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Feet */}
        <path d="M32,208 C32,210 34,212 38,212 L48,212 C50,212 50,210 50,208 Z" fill="rgba(255,255,255,0.02)" />
        <path d="M66,208 C66,210 68,212 72,212 L82,212 C84,212 86,210 86,208 Z" fill="rgba(255,255,255,0.02)" />
      </svg>

      {/* Hover tooltip */}
      {hovered && (() => {
        const score = scoresMap.get(hovered);
        const tier = score?.tier ?? getTier(0);
        const hasData = score && score.score > 0;
        return (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg pointer-events-none z-10"
            style={{
              background: 'var(--bg-surface-elevated)',
              border: `1px solid ${hasData ? tier.color : 'rgba(255,255,255,0.1)'}`,
              boxShadow: hasData ? `0 0 20px ${tier.color}40` : 'none',
              minWidth: '100px',
            }}>
            <p className="text-xs font-bold" style={{ color: hasData ? tier.color : 'var(--text-muted)' }}>
              {hovered}
            </p>
            {hasData ? (
              <>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Score: {score.score.toLocaleString()}
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-block mt-0.5"
                  style={{ background: `${tier.color}25`, color: tier.color }}>
                  {tier.name}
                </span>
              </>
            ) : (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No data yet</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
