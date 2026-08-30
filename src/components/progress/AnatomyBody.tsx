import { useMemo } from 'react';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface AnatomyBodyProps {
  muscleScores: MuscleScore[];
  view: 'front' | 'back';
  width?: number;
}

/**
 * Muscle segment definitions — anatomically correct SVG paths.
 * Each muscle group is a separate <path> with realistic body contours.
 * Front view muscles: Chest, Shoulders, Biceps, Abs, Quads, Forearms, Calves
 * Back view muscles: Back, Rear Delts, Triceps, Hamstrings, Calves, Forearms, Lower Back
 */

// ===== FRONT VIEW MUSCLES =====
const FRONT_MUSCLES: Record<string, { path: string; label: string; cx: number; cy: number }> = {
  'Shoulders': {
    // Left deltoid — rounded cap over shoulder joint
    path: 'M32,52 C28,48 22,50 18,54 C16,58 18,64 22,66 C26,64 30,58 32,52 Z M88,52 C92,48 98,50 102,54 C104,58 102,64 98,66 C94,64 90,58 88,52 Z',
    label: 'Shoulders',
    cx: 25, cy: 58,
  },
  'Chest': {
    // Left pec — teardrop shape curving from shoulder to sternum
    path: 'M34,54 C34,50 38,46 44,46 L58,46 C58,50 56,54 54,58 C50,64 44,66 38,64 C34,62 34,58 34,54 Z M66,54 C66,50 62,46 56,46 L50,46 C50,50 52,54 54,58 C58,64 64,66 70,64 C74,62 74,58 66,54 Z',
    label: 'Chest',
    cx: 54, cy: 56,
  },
  'Biceps': {
    // Left bicep — oval bulge on front of upper arm
    path: 'M16,58 C14,58 12,62 12,68 C12,74 14,80 16,82 C18,80 20,74 20,68 C20,62 18,58 16,58 Z M104,58 C106,58 108,62 108,68 C108,74 106,80 104,82 C102,80 100,74 100,68 C100,62 102,58 104,58 Z',
    label: 'Biceps',
    cx: 16, cy: 70,
  },
  'Abs': {
    // Abdominal wall — rectus abdominis with segment lines
    path: 'M46,68 C46,64 48,62 50,62 L58,62 C60,62 62,64 62,68 L62,96 C62,98 60,100 58,100 L50,100 C48,100 46,98 46,96 Z',
    label: 'Abs',
    cx: 54, cy: 82,
  },
  'Forearms': {
    // Left forearm — tapered from elbow to wrist
    path: 'M10,82 C8,84 8,90 8,96 C8,102 10,106 12,108 C14,106 16,102 16,96 C16,90 14,84 12,82 Z M100,82 C98,84 96,90 96,96 C96,102 98,106 100,108 C102,106 104,102 104,96 C104,90 102,84 100,82 Z',
    label: 'Forearms',
    cx: 12, cy: 96,
  },
  'Quads': {
    // Left quad — large muscle group front of thigh
    path: 'M36,104 C34,104 32,108 32,114 L32,144 C32,150 34,154 36,154 L48,154 C50,154 50,150 50,144 L50,114 C50,108 48,104 46,104 Z M70,104 C72,104 74,108 74,114 L74,144 C74,150 72,154 70,154 L58,154 C56,154 56,150 56,144 L56,114 C56,108 58,104 60,104 Z',
    label: 'Quads',
    cx: 42, cy: 130,
  },
  'Calves': {
    // Front shin — tibialis anterior
    path: 'M38,158 C36,158 34,162 34,168 L34,186 C34,190 36,192 38,192 L46,192 C48,192 48,190 48,186 L48,168 C48,162 46,158 44,158 Z M72,158 C74,158 76,162 76,168 L76,186 C76,190 74,192 72,192 L64,192 C62,192 62,190 62,186 L62,168 C62,162 64,158 66,158 Z',
    label: 'Calves',
    cx: 42, cy: 176,
  },
};

// ===== BACK VIEW MUSCLES =====
const BACK_MUSCLES: Record<string, { path: string; label: string; cx: number; cy: number }> = {
  'Shoulders': {
    // Rear delts — rounded shape on back of shoulders
    path: 'M30,50 C26,48 20,50 18,54 C16,58 18,62 22,64 C26,62 30,56 30,50 Z M90,50 C94,48 100,50 102,54 C104,58 102,62 98,64 C94,62 90,56 90,50 Z',
    label: 'Rear Delts',
    cx: 24, cy: 56,
  },
  'Back': {
    // Trapezius + Lats — broad V-shape
    path: 'M36,48 C36,44 40,42 46,42 L62,42 C68,42 72,44 72,48 L72,68 C72,72 70,76 66,78 L54,80 C50,80 46,78 44,76 L36,72 C36,68 36,52 36,48 Z M38,72 C38,70 40,68 44,68 L56,68 C58,68 60,70 60,72 L60,90 C60,92 58,94 56,94 L44,94 C42,94 40,92 40,90 Z',
    label: 'Back',
    cx: 54, cy: 66,
  },
  'Triceps': {
    // Left tricep — horseshoe shape on back of arm
    path: 'M14,56 C12,56 10,60 10,66 C10,72 12,78 14,82 C16,78 18,72 18,66 C18,60 16,56 14,56 Z M106,56 C108,56 110,60 110,66 C110,72 108,78 106,82 C104,78 102,72 102,66 C102,60 104,56 106,56 Z',
    label: 'Triceps',
    cx: 14, cy: 68,
  },
  'Forearms': {
    path: 'M8,84 C6,86 6,92 6,98 C6,104 8,108 10,110 C12,108 14,104 14,98 C14,92 12,86 10,84 Z M102,84 C100,86 98,92 98,98 C98,104 100,108 102,110 C104,108 106,104 106,98 C106,92 104,86 102,84 Z',
    label: 'Forearms',
    cx: 10, cy: 98,
  },
  'Hamstrings': {
    // Back of thighs — two distinct muscles per leg
    path: 'M34,104 C32,104 30,108 30,114 L30,144 C30,150 32,154 34,154 L48,154 C50,154 50,150 50,144 L50,114 C50,108 48,104 46,104 Z M72,104 C74,104 76,108 76,114 L76,144 C76,150 74,154 72,154 L58,154 C56,154 56,150 56,144 L56,114 C56,108 58,104 60,104 Z',
    label: 'Hamstrings',
    cx: 40, cy: 130,
  },
  'Calves': {
    // Gastrocnemius — diamond shape
    path: 'M36,158 C34,158 32,162 32,168 C32,176 34,182 36,186 C38,182 40,176 40,168 C40,162 38,158 36,158 Z M74,158 C72,158 70,162 70,168 C70,176 72,182 74,186 C76,182 78,176 78,168 C78,162 76,158 74,158 Z',
    label: 'Calves',
    cx: 36, cy: 174,
  },
  'Abs': {
    // Lower back / erector spinae
    path: 'M46,88 C46,84 48,82 50,82 L58,82 C60,82 62,84 62,88 L62,100 C62,102 60,104 58,104 L50,104 C48,104 46,102 46,100 Z',
    label: 'Lower Back',
    cx: 54, cy: 93,
  },
};

// Body outline SVG paths
const BODY_OUTLINE_FRONT = `
  M54,4
  C44,4 38,10 38,18
  C38,24 42,30 48,32
  L46,36 L32,42
  C22,44 14,50 12,58
  L10,84
  C8,90 8,98 10,108
  L12,112 L8,140
  C6,150 6,160 8,170
  L8,192
  C8,196 12,198 16,198
  L28,198
  C32,198 34,196 34,192
  L34,170
  C34,162 36,156 38,154
  L48,154
  C50,154 52,156 52,160
  L52,170
  C52,176 54,180 56,182
  L56,192
  C56,196 58,198 60,198
  L60,192
  C60,180 58,176 56,170
  L52,160
  L52,154
  L72,154
  C74,154 76,156 78,160
  L78,170
  C78,176 76,180 74,192
  L74,198
  C74,198 78,198 82,198
  L96,198
  C100,198 104,196 104,192
  L104,170
  C104,160 104,150 102,140
  L98,112 L100,108
  C102,98 104,90 102,84
  L100,58
  C98,50 90,44 80,42
  L68,36 L66,32
  C72,30 76,24 76,18
  C76,10 70,4 60,4
  Z
`;

const BODY_OUTLINE_BACK = BODY_OUTLINE_FRONT; // Same outline for back

function MuscleGroup({
  path,
  color,
  emissiveIntensity,
  label,
  cx,
  cy,
  tierName,
  score,
}: {
  path: string;
  color: string;
  emissiveIntensity: number;
  label: string;
  cx: number;
  cy: number;
  tierName: string;
  score: number;
}) {
  const glowRadius = emissiveIntensity * 4;
  const filterId = `glow-${label.replace(/\s/g, '')}`;

  return (
    <g>
      {/* Glow filter */}
      {emissiveIntensity > 0.3 && (
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={glowRadius} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      {/* Main muscle path */}
      <path
        d={path}
        fill={color}
        stroke={emissiveIntensity > 0.3 ? color : 'rgba(255,255,255,0.08)'}
        strokeWidth={emissiveIntensity > 0.3 ? 0.8 : 0.3}
        filter={emissiveIntensity > 0.3 ? `url(#${filterId})` : undefined}
        style={{ transition: 'all 0.6s ease' }}
        opacity={0.85 + emissiveIntensity * 0.15}
      />
      {/* Score label */}
      {score > 0 && (
        <>
          <circle cx={cx} cy={cy} r={8} fill="rgba(0,0,0,0.5)" stroke={color} strokeWidth={0.5} />
          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight="bold" fill={color}>
            {tierName.charAt(0)}
          </text>
        </>
      )}
    </g>
  );
}

export default function AnatomyBody({ muscleScores, view, width = 140 }: AnatomyBodyProps) {
  const height = width * (220 / 120);

  const scoresMap = useMemo(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) map.set(s.muscle, s);
    return map;
  }, [muscleScores]);

  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {view === 'front' ? 'Front' : 'Back'}
      </p>
      <svg viewBox="0 0 108 200" width={width} height={height} className="mx-auto">
        {/* Body outline */}
        <path
          d={view === 'front' ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />

        {/* Head */}
        <ellipse cx="54" cy="14" rx="12" ry="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />

        {/* Neck */}
        <rect x="48" y="26" width="12" height="8" rx="3" fill="rgba(255,255,255,0.02)" />

        {/* Render each muscle group */}
        {Object.entries(muscles).map(([muscleName, def]) => {
          const score = scoresMap.get(muscleName);
          const tier = score?.tier ?? getTier(0);
          const hasData = score && score.score > 0;

          return (
            <MuscleGroup
              key={`${view}-${muscleName}`}
              path={def.path}
              color={hasData ? tier.color : 'rgba(255,255,255,0.06)'}
              emissiveIntensity={hasData ? Math.min(1, score.score / 4000) : 0}
              label={def.label}
              cx={def.cx}
              cy={def.cy}
              tierName={tier.name}
              score={score?.score ?? 0}
            />
          );
        })}

        {/* Feet */}
        <ellipse cx="42" cy="196" rx="8" ry="3" fill="rgba(255,255,255,0.02)" />
        <ellipse cx="66" cy="196" rx="8" ry="3" fill="rgba(255,255,255,0.02)" />
      </svg>
    </div>
  );
}
