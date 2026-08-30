import { useMemo, useState } from 'react';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface AnatomyBodyProps {
  muscleScores: MuscleScore[];
  view: 'front' | 'back';
  width?: number;
}

// Professional muted muscle colors
const MUSCLE_COLORS: Record<string, { base: string; dark: string }> = {
  Chest:      { base: '#C62828', dark: '#8E1A1A' },
  Shoulders:  { base: '#1565C0', dark: '#0D47A1' },
  Biceps:     { base: '#E65100', dark: '#BF360C' },
  Triceps:    { base: '#D84315', dark: '#A33000' },
  Abs:        { base: '#2E7D32', dark: '#1B5E20' },
  Back:       { base: '#0D47A1', dark: '#082E6B' },
  Forearms:   { base: '#5D4037', dark: '#3E2723' },
  Quads:      { base: '#388E3C', dark: '#256928' },
  Hamstrings: { base: '#558B2F', dark: '#33691E' },
  Calves:     { base: '#4E342E', dark: '#321911' },
  'Lower Back': { base: '#37474F', dark: '#263238' },
};

// ===== FRONT VIEW =====
// Body outline drawn first, muscles placed INSIDE it
const BODY_OUTLINE_FRONT = `M60,8 C52,8 46,12 44,18 C42,22 42,28 44,32 L42,36 C38,38 30,40 24,44
C18,48 14,54 12,60 C10,66 10,74 10,82 L8,88
C6,94 6,102 8,110 L10,114 C8,120 6,132 6,142
L6,160 C6,166 6,172 8,178 L8,194
C8,198 10,202 14,202 L26,202 C28,202 30,200 30,196 L30,180
C30,174 32,168 34,164 L44,164 C46,164 48,166 48,170 L48,180
C48,186 50,192 52,196 L52,202 L60,202 L60,196
C60,192 58,186 58,180 L58,170 C58,166 60,164 62,164
L72,164 C74,168 76,174 76,180 L76,196
C76,200 78,202 80,202 L92,202 C96,202 98,198 98,194
L98,178 C100,172 102,166 102,160 L102,142
C102,132 100,120 98,114 L100,110 C102,102 102,94 100,88
L98,82 C98,74 98,66 96,60
C94,54 90,48 84,44 C78,40 70,38 66,36 L64,32
C66,28 66,22 64,18 C62,12 56,8 60,8 Z`;

// Muscle paths — positioned to fit INSIDE the body outline
const FRONT_MUSCLES: Record<string, { path: string; cx: number; cy: number; label: string }> = {
  'Shoulders': {
    // Deltoid caps — sit on outer edge of upper torso, INSIDE outline
    path: `M36,38 C32,38 26,40 22,44 C20,46 18,50 18,54
           C18,58 20,62 24,64 C28,62 32,56 36,50 Z
           M84,38 C88,38 94,40 98,44 C100,46 102,50 102,54
           C102,58 100,62 96,64 C92,62 88,56 84,50 Z`,
    cx: 22, cy: 54,
    label: 'Shoulders',
  },
  'Chest': {
    // Pectoralis major — two fan shapes covering front of ribcage
    path: `M38,42 C38,40 42,38 48,38 L58,38 C58,40 58,42 58,44
           C56,48 52,52 48,56 C44,60 40,62 38,62 Z
           M82,42 C82,40 78,38 72,38 L62,38 C62,40 62,42 62,44
           C64,48 68,52 72,56 C76,60 80,62 82,62 Z`,
    cx: 48, cy: 52,
    label: 'Chest',
  },
  'Biceps': {
    // Bicep bulge — oval on front of upper arm
    path: `M18,56 C16,56 14,58 14,62 C14,68 14,74 16,78
           C18,80 20,80 22,78 C24,74 24,68 24,62 C24,58 22,56 20,56 Z
           M100,56 C102,56 104,58 104,62 C104,68 104,74 102,78
           C100,80 98,80 96,78 C94,74 94,68 94,62 C94,58 96,56 98,56 Z`,
    cx: 18, cy: 68,
    label: 'Biceps',
  },
  'Abs': {
    // Rectus abdominis — vertical strip in center of torso
    path: `M52,62 C52,60 54,58 56,58 L64,58 C66,58 68,60 68,62
           L68,92 C68,94 66,96 64,96 L56,96 C54,96 52,94 52,92 Z`,
    cx: 60, cy: 78,
    label: 'Abs',
  },
  'Forearms': {
    // Forearm — tapered shape from elbow to wrist
    path: `M10,82 C8,84 8,90 8,96 C8,102 8,108 10,112
           C12,110 14,104 14,98 C14,92 12,86 10,82 Z
           M106,82 C108,84 108,90 108,96 C108,102 108,108 106,112
           C104,110 102,104 102,98 C102,92 104,86 106,82 Z`,
    cx: 10, cy: 98,
    label: 'Forearms',
  },
  'Quads': {
    // Quadriceps — large front thigh muscles
    path: `M36,102 C34,102 32,106 32,112 L32,148 C32,152 34,156 36,156
           L46,156 C48,156 48,152 48,148 L48,112 C48,106 46,102 44,102 Z
           M80,102 C82,102 84,106 84,112 L84,148 C84,152 82,156 80,156
           L70,156 C68,156 68,152 68,148 L68,112 C68,106 70,102 72,102 Z`,
    cx: 40, cy: 132,
    label: 'Quads',
  },
  'Calves': {
    // Tibialis anterior — front of lower leg
    path: `M38,160 C36,160 34,164 34,170 L34,190 C34,194 36,196 38,196
           L46,196 C48,196 48,194 48,190 L48,170 C48,164 46,160 44,160 Z
           M78,160 C80,160 82,164 82,170 L82,190 C82,194 80,196 78,196
           L70,196 C68,196 68,194 68,190 L68,170 C68,164 70,160 72,160 Z`,
    cx: 42, cy: 180,
    label: 'Calves',
  },
};

// ===== BACK VIEW =====
const BACK_MUSCLES: Record<string, { path: string; cx: number; cy: number; label: string }> = {
  'Shoulders': {
    path: `M34,36 C28,36 22,38 18,42 C16,46 16,50 18,54
           C22,56 26,54 30,50 C34,46 36,42 36,38 Z
           M86,36 C92,36 98,38 102,42 C104,46 104,50 102,54
           C98,56 94,54 90,50 C86,46 84,42 84,38 Z`,
    cx: 24, cy: 48,
    label: 'Rear Delts',
  },
  'Back': {
    // Trapezius + Lats — broad V-shape covering back
    path: `M40,38 C40,36 44,34 50,34 L70,34 C76,34 80,36 80,38
           L80,56 C80,60 78,64 74,66 L64,68 C62,68 58,68 56,68
           L46,66 C42,64 40,60 40,56 Z
           M42,66 C42,64 44,62 48,62 L72,62 C76,62 78,64 78,66
           L78,84 C78,88 76,90 72,90 L48,90 C44,90 42,88 42,84 Z`,
    cx: 60, cy: 62,
    label: 'Back',
  },
  'Triceps': {
    path: `M14,54 C12,54 10,58 10,64 C10,70 10,76 12,80
           C14,82 16,82 18,80 C20,76 20,70 20,64 C20,58 18,54 16,54 Z
           M102,54 C104,54 106,58 106,64 C106,70 106,76 104,80
           C102,82 100,82 98,80 C96,76 96,70 96,64 C96,58 98,54 100,54 Z`,
    cx: 14, cy: 66,
    label: 'Triceps',
  },
  'Forearms': {
    path: `M8,84 C6,86 6,92 6,98 C6,104 6,110 8,114
           C10,112 12,106 12,100 C12,94 10,88 8,84 Z
           M104,84 C106,86 106,92 106,98 C106,104 106,110 104,114
           C102,112 100,106 100,100 C100,94 102,88 104,84 Z`,
    cx: 8, cy: 100,
    label: 'Forearms',
  },
  'Hamstrings': {
    path: `M34,102 C32,102 30,106 30,112 L30,148 C30,152 32,156 34,156
           L48,156 C50,156 50,152 50,148 L50,112 C50,106 48,102 46,102 Z
           M82,102 C84,102 86,106 86,112 L86,148 C86,152 84,156 82,156
           L68,156 C66,156 66,152 66,148 L66,112 C66,106 68,102 70,102 Z`,
    cx: 40, cy: 132,
    label: 'Hamstrings',
  },
  'Calves': {
    // Gastrocnemius — diamond shape on back of lower leg
    path: `M36,160 C34,160 32,164 32,170 C32,178 34,184 36,188
           C38,184 40,178 40,170 C40,164 38,160 36,160 Z
           M80,160 C82,160 84,164 84,170 C84,178 82,184 80,188
           C78,184 76,178 76,170 C76,164 78,160 80,160 Z`,
    cx: 36, cy: 176,
    label: 'Calves',
  },
  'Abs': {
    // Lower back / Erector spinae
    path: `M52,86 C52,84 54,82 56,82 L64,82 C66,82 68,84 68,86
           L68,100 C68,102 66,104 64,104 L56,104 C54,104 52,102 52,100 Z`,
    cx: 60, cy: 94,
    label: 'Lower Back',
  },
};

function MuscleGradients() {
  return (
    <defs>
      {Object.entries(MUSCLE_COLORS).map(([name, colors]) => (
        <linearGradient key={name} id={`grad-${name}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.base} stopOpacity={0.95} />
          <stop offset="40%" stopColor={colors.base} stopOpacity={1} />
          <stop offset="100%" stopColor={colors.dark} stopOpacity={0.85} />
        </linearGradient>
      ))}
      <filter id="muscle-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
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

        {/* Body outline */}
        <path
          d={BODY_OUTLINE_FRONT}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.6"
        />

        {/* Head */}
        <ellipse cx="60" cy="14" rx="12" ry="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />

        {/* Neck */}
        <path d="M54,26 C54,24 56,22 60,22 C64,22 66,24 66,26 L66,34 L54,34 Z" fill="rgba(255,255,255,0.02)" />

        {/* Muscle groups */}
        {Object.entries(muscles).map(([muscleName, def]) => {
          const score = scoresMap.get(muscleName);
          const tier = score?.tier ?? getTier(0);
          const hasData = score && score.score > 0;
          const isHovered = hovered === muscleName;

          // Fill: gradient if active, dim if not
          const fill = hasData ? `url(#grad-${muscleName})` : 'rgba(255,255,255,0.04)';
          const strokeColor = hasData ? tier.color : 'rgba(255,255,255,0.06)';
          const fillOpacity = hasData ? Math.min(1, 0.5 + (score.score / 5000) * 0.5) : 0.3;

          return (
            <g key={`${view}-${muscleName}`}>
              <path
                d={def.path}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={isHovered ? '#fff' : strokeColor}
                strokeWidth={isHovered ? 1.2 : hasData ? 0.6 : 0.3}
                filter={hasData && score.score > 500 ? 'url(#muscle-glow)' : undefined}
                style={{ transition: 'all 0.4s ease', cursor: hasData ? 'pointer' : 'default' }}
                onMouseEnter={() => setHovered(muscleName)}
                onMouseLeave={() => setHovered(null)}
              />

              {/* Tier dot */}
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
        <path d="M34,198 C34,200 36,202 40,202 L48,202 C50,202 50,200 50,198 Z" fill="rgba(255,255,255,0.02)" />
        <path d="M66,198 C66,200 68,202 72,202 L80,202 C82,202 84,200 84,198 Z" fill="rgba(255,255,255,0.02)" />
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
