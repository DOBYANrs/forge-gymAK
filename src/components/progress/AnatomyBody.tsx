import { useMemo, useState } from 'react';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface AnatomyBodyProps {
  muscleScores: MuscleScore[];
  view: 'front' | 'back';
  width?: number;
}

/**
 * Realistic human anatomy SVG with:
 * - Proper body outline using cubic bezier curves
 * - Anatomically correct muscle group paths
 * - Linear gradient shading for depth
 * - Hover tooltips with muscle name + score + tier
 * - Glow effects on active muscles
 */

// Muted professional colors for muscle groups (not neon)
const MUSCLE_FILL: Record<string, string> = {
  Chest: '#8B6914',
  Shoulders: '#5C6BC0',
  Biceps: '#E65100',
  Triceps: '#BF360C',
  Abs: '#2E7D32',
  Back: '#1565C0',
  Forearms: '#6D4C41',
  Quads: '#2E7D32',
  Hamstrings: '#558B2F',
  Calves: '#4E342E',
  'Lower Back': '#37474F',
};

// --- FRONT VIEW ---
// Realistic body outline — organic curves, not geometric
const BODY_FRONT = `M60,8 C52,8 46,12 44,18 C42,22 42,26 44,30 L42,34 C38,36 30,38 24,42
C18,46 14,52 12,58 C10,64 10,72 10,80 L8,86
C6,92 6,100 8,108 L10,112 C8,118 6,130 6,140
L6,158 C6,164 6,170 8,176 L8,192
C8,196 10,200 14,200 L26,200 C28,200 30,198 30,194 L30,178
C30,172 32,166 34,162 L44,162 C46,162 48,164 48,168 L48,178
C48,184 50,190 52,194 L52,200 L60,200 L60,194
C60,190 58,184 58,178 L58,168 C58,164 60,162 62,162
L72,162 C74,166 76,172 76,178 L76,194
C76,198 78,200 80,200 L92,200 C96,200 98,196 98,192
L98,176 C100,170 102,164 102,158 L102,140
C102,130 100,118 98,112 L100,108 C102,100 102,92 100,86
L98,80 C98,72 98,64 96,58
C94,52 90,46 84,42 C78,38 70,36 66,34 L64,30
C66,26 66,22 64,18 C62,12 56,8 60,8 Z`;

// Muscle paths — front view (anatomically correct shapes with curves)
const FRONT_MUSCLES: Record<string, { path: string; cx: number; cy: number; label: string }> = {
  'Shoulders': {
    // Deltoid — rounded cap flowing from neck to upper arm
    path: `M36,36 C30,36 24,38 20,42 C18,44 16,48 16,52 C16,56 18,60 22,62
           C26,60 30,54 34,48 C36,44 36,40 36,36 Z
           M84,36 C90,36 96,38 100,42 C102,44 104,48 104,52 C104,56 102,60 98,62
           C94,60 90,54 86,48 C84,44 84,40 84,36 Z`,
    cx: 22, cy: 52,
    label: 'Shoulders',
  },
  'Chest': {
    // Pectoralis major — teardrop flowing from collarbone to armpit
    path: `M36,38 C36,36 40,34 46,34 L58,34 C58,36 58,38 58,40
           C56,44 52,48 48,52 C44,56 40,58 36,58 C36,54 36,44 36,38 Z
           M84,38 C84,36 80,34 74,34 L62,34 C62,36 62,38 62,40
           C64,44 68,48 72,52 C76,56 80,58 84,58 C84,54 84,44 84,38 Z`,
    cx: 48, cy: 48,
    label: 'Chest',
  },
  'Biceps': {
    // Biceps brachii — oval bulge on front of upper arm
    path: `M18,54 C16,54 14,56 14,60 C14,66 14,72 16,76
           C18,78 20,78 22,76 C24,72 24,66 24,60 C24,56 22,54 20,54 Z
           M98,54 C100,54 102,56 102,60 C102,66 102,72 100,76
           C98,78 96,78 94,76 C92,72 92,66 92,60 C92,56 94,54 96,54 Z`,
    cx: 18, cy: 66,
    label: 'Biceps',
  },
  'Abs': {
    // Rectus abdominis — vertical strip with horizontal tendinous intersections
    path: `M50,58 C50,56 52,54 54,54 L66,54 C68,54 70,56 70,58
           L70,88 C70,90 68,92 66,92 L54,92 C52,92 50,90 50,88 Z`,
    cx: 60, cy: 74,
    label: 'Abs',
  },
  'Forearms': {
    // Brachioradialis — tapered from elbow to wrist
    path: `M10,78 C8,80 8,86 8,92 C8,98 8,104 10,108
           C12,106 14,100 14,94 C14,88 12,82 10,78 Z
           M106,78 C108,80 108,86 108,92 C108,98 108,104 106,108
           C104,106 102,100 102,94 C102,88 104,82 106,78 Z`,
    cx: 10, cy: 94,
    label: 'Forearms',
  },
  'Quads': {
    // Quadriceps — four-headed muscle, large mass on front of thigh
    path: `M38,100 C36,100 34,104 34,110 L34,144 C34,148 36,152 38,152
           L48,152 C50,152 50,148 50,144 L50,110 C50,104 48,100 46,100 Z
           M78,100 C80,100 82,104 82,110 L82,144 C82,148 80,152 78,152
           L68,152 C66,152 66,148 66,144 L66,110 C66,104 68,100 70,100 Z`,
    cx: 42, cy: 128,
    label: 'Quads',
  },
  'Calves': {
    // Tibialis anterior — front of lower leg
    path: `M38,156 C36,156 34,160 34,166 L34,186 C34,190 36,192 38,192
           L46,192 C48,192 48,190 48,186 L48,166 C48,160 46,156 44,156 Z
           M78,156 C80,156 82,160 82,166 L82,186 C82,190 80,192 78,192
           L70,192 C68,192 68,190 68,186 L68,166 C68,160 70,156 72,156 Z`,
    cx: 42, cy: 176,
    label: 'Calves',
  },
};

// --- BACK VIEW ---
const BACK_MUSCLES: Record<string, { path: string; cx: number; cy: number; label: string }> = {
  'Shoulders': {
    // Rear deltoid — rounded on back of shoulder
    path: `M34,34 C28,34 22,36 18,40 C16,44 16,48 18,52
           C22,54 26,52 30,48 C34,44 36,40 36,36 Z
           M86,34 C92,34 98,36 102,40 C104,44 104,48 102,52
           C98,54 94,52 90,48 C86,44 84,40 84,36 Z`,
    cx: 24, cy: 46,
    label: 'Rear Delts',
  },
  'Back': {
    // Trapezius + Latissimus dorsi — broad V-shape
    path: `M38,36 C38,34 42,32 48,32 L72,32 C78,32 82,34 82,36
           L82,52 C82,56 80,60 76,62 L64,66 C62,66 58,66 56,66
           L44,62 C40,60 38,56 38,52 Z
           M40,62 C40,60 42,58 46,58 L74,58 C78,58 80,60 80,62
           L80,80 C80,84 78,86 74,86 L46,86 C42,86 40,84 40,80 Z`,
    cx: 60, cy: 58,
    label: 'Back',
  },
  'Triceps': {
    // Triceps brachii — horseshoe shape on back of arm
    path: `M14,52 C12,52 10,56 10,62 C10,68 10,74 12,78
           C14,80 16,80 18,78 C20,74 20,68 20,62 C20,56 18,52 16,52 Z
           M102,52 C104,52 106,56 106,62 C106,68 106,74 104,78
           C102,80 100,80 98,78 C96,74 96,68 96,62 C96,56 98,52 100,52 Z`,
    cx: 14, cy: 64,
    label: 'Triceps',
  },
  'Forearms': {
    path: `M8,80 C6,82 6,88 6,94 C6,100 6,106 8,110
           C10,108 12,102 12,96 C12,90 10,84 8,80 Z
           M104,80 C106,82 106,88 106,94 C106,100 106,106 104,110
           C102,108 100,102 100,96 C100,90 102,84 104,80 Z`,
    cx: 8, cy: 96,
    label: 'Forearms',
  },
  'Hamstrings': {
    // Biceps femoris + semitendinosus — back of thigh
    path: `M36,100 C34,100 32,104 32,110 L32,144 C32,148 34,152 36,152
           L48,152 C50,152 50,148 50,144 L50,110 C50,104 48,100 46,100 Z
           M80,100 C82,100 84,104 84,110 L84,144 C84,148 82,152 80,152
           L68,152 C66,152 66,148 66,144 L66,110 C66,104 68,100 70,100 Z`,
    cx: 40, cy: 128,
    label: 'Hamstrings',
  },
  'Calves': {
    // Gastrocnemius — diamond/bulge shape
    path: `M36,156 C34,156 32,160 32,166 C32,174 34,180 36,184
           C38,180 40,174 40,166 C40,160 38,156 36,156 Z
           M80,156 C82,156 84,160 84,166 C84,174 82,180 80,184
           C78,180 76,174 76,166 C76,160 78,156 80,156 Z`,
    cx: 36, cy: 172,
    label: 'Calves',
  },
  'Abs': {
    // Lower back / Erector spinae
    path: `M50,84 C50,82 52,80 54,80 L66,80 C68,80 70,82 70,84
           L70,98 C70,100 68,102 66,102 L54,102 C52,102 50,100 50,98 Z`,
    cx: 60, cy: 92,
    label: 'Lower Back',
  },
};

// Gradient definitions for depth
function MuscleGradients() {
  return (
    <defs>
      {Object.entries(MUSCLE_FILL).map(([name, color]) => (
        <linearGradient key={name} id={`grad-${name}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="50%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.7} />
        </linearGradient>
      ))}
      {/* Glow filter for active muscles */}
      <filter id="muscle-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export default function AnatomyBody({ muscleScores, view, width = 140 }: AnatomyBodyProps) {
  const height = width * (210 / 120);
  const [hovered, setHovered] = useState<string | null>(null);

  const scoresMap = useMemo(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) map.set(s.muscle, s);
    return map;
  }, [muscleScores]);

  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  return (
    <div className="text-center relative">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {view === 'front' ? 'Front' : 'Back'}
      </p>
      <svg viewBox="0 0 120 210" width={width} height={height} className="mx-auto">
        <MuscleGradients />

        {/* Body outline — organic curves */}
        <path
          d={BODY_FRONT}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.6"
        />

        {/* Head */}
        <ellipse cx="60" cy="14" rx="12" ry="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />

        {/* Neck */}
        <path d="M54,26 C54,24 56,22 60,22 C64,22 66,24 66,26 L66,34 L54,34 Z" fill="rgba(255,255,255,0.02)" />

        {/* Render each muscle group */}
        {Object.entries(muscles).map(([muscleName, def]) => {
          const score = scoresMap.get(muscleName);
          const tier = score?.tier ?? getTier(0);
          const hasData = score && score.score > 0;
          const isHovered = hovered === muscleName;

          // Determine fill — use gradient if active, dim if not
          const fill = hasData ? `url(#grad-${muscleName})` : 'rgba(255,255,255,0.04)';
          const strokeColor = hasData
            ? tier.color
            : 'rgba(255,255,255,0.06)';

          // Tier-based opacity for depth
          const fillOpacity = hasData ? Math.min(1, 0.5 + (score.score / 5000) * 0.5) : 0.3;

          return (
            <g key={`${view}-${muscleName}`}>
              {/* Muscle path */}
              <path
                d={def.path}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={isHovered ? '#fff' : strokeColor}
                strokeWidth={isHovered ? 1.2 : hasData ? 0.6 : 0.3}
                filter={hasData && score.score > 500 ? 'url(#muscle-glow)' : undefined}
                style={{
                  transition: 'all 0.4s ease',
                  cursor: hasData ? 'pointer' : 'default',
                }}
                onMouseEnter={() => setHovered(muscleName)}
                onMouseLeave={() => setHovered(null)}
              />

              {/* Tier indicator dot */}
              {hasData && (
                <circle
                  cx={def.cx}
                  cy={def.cy}
                  r={5}
                  fill="rgba(0,0,0,0.6)"
                  stroke={tier.color}
                  strokeWidth={0.8}
                />
              )}
              {hasData && (
                <text
                  x={def.cx}
                  y={def.cy + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={4.5}
                  fontWeight="bold"
                  fill={tier.color}
                  style={{ pointerEvents: 'none' }}
                >
                  {tier.name.charAt(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Feet */}
        <path d="M34,196 C34,198 36,200 40,200 L48,200 C50,200 50,198 50,196 Z" fill="rgba(255,255,255,0.02)" />
        <path d="M66,196 C66,198 68,200 72,200 L80,200 C82,200 84,198 84,196 Z" fill="rgba(255,255,255,0.02)" />
      </svg>

      {/* Hover tooltip */}
      {hovered && (() => {
        const score = scoresMap.get(hovered);
        const tier = score?.tier ?? getTier(0);
        const hasData = score && score.score > 0;
        return (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg pointer-events-none z-10"
            style={{
              background: 'var(--bg-surface-elevated)',
              border: `1px solid ${hasData ? tier.color : 'rgba(255,255,255,0.1)'}`,
              boxShadow: hasData ? `0 0 20px ${tier.color}40` : 'none',
              minWidth: '100px',
            }}
          >
            <p className="text-xs font-bold" style={{ color: hasData ? tier.color : 'var(--text-muted)' }}>
              {hovered}
            </p>
            {hasData && (
              <>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Score: {score.score.toLocaleString()}
                </p>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-block mt-0.5"
                  style={{ background: `${tier.color}25`, color: tier.color }}
                >
                  {tier.name}
                </span>
              </>
            )}
            {!hasData && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                No data yet
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
