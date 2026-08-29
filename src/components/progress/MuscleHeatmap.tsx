import { useMemo } from 'react';
import type { ExerciseLog } from '../../types';
import { calculateVolume, EXERCISE_MUSCLE_MAP } from '../../utils/calculations';

interface MuscleHeatmapProps {
  exercises: ExerciseLog[];
}

function getMuscleIntensity(muscleGroup: string, exercises: ExerciseLog[]): number {
  let totalVolume = 0;
  for (const ex of exercises) {
    const groups = EXERCISE_MUSCLE_MAP[ex.exerciseName] ?? [];
    if (groups.includes(muscleGroup)) {
      totalVolume += calculateVolume(ex);
    }
  }
  // Map volume to 0-1 intensity
  if (totalVolume === 0) return 0;
  if (totalVolume < 1000) return 0.2;
  if (totalVolume < 3000) return 0.4;
  if (totalVolume < 6000) return 0.6;
  if (totalVolume < 10000) return 0.8;
  return 1;
}

function MuscleZone({ x, y, width, height, intensity, rx = 4 }: {
  x: number; y: number; width: number; height: number; intensity: number; rx?: number;
}) {
  const baseColor = intensity > 0
    ? `rgba(255, 94, 0, ${0.15 + intensity * 0.7})`
    : 'rgba(255, 255, 255, 0.04)';
  const glowColor = intensity > 0.6 ? `rgba(255, 94, 0, ${intensity * 0.3})` : 'none';

  return (
    <rect
      x={x} y={y} width={width} height={height} rx={rx}
      fill={baseColor}
      stroke={intensity > 0 ? `rgba(255, 94, 0, ${0.2 + intensity * 0.3})` : 'rgba(255, 255, 255, 0.06)'}
      strokeWidth={0.5}
      style={{
        filter: intensity > 0.6 ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
        transition: 'all 0.5s ease',
      }}
    />
  );
}

export default function MuscleHeatmap({ exercises }: MuscleHeatmapProps) {
  const intensities = useMemo(() => {
    const muscles = ['Chest', 'Shoulders', 'Back', 'Biceps', 'Triceps', 'Forearms', 'Legs', 'Abs'];
    const result: Record<string, number> = {};
    for (const m of muscles) {
      result[m] = getMuscleIntensity(m, exercises);
    }
    return result;
  }, [exercises]);

  const I = intensities; // shorthand

  return (
    <div className="flex gap-4 justify-center items-start">
      {/* FRONT VIEW */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Front</p>
        <svg viewBox="0 0 120 220" width="120" height="220" className="mx-auto">
          {/* Head */}
          <ellipse cx="60" cy="18" rx="14" ry="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

          {/* Neck */}
          <rect x="53" y="33" width="14" height="8" rx="3" fill="rgba(255,255,255,0.03)" />

          {/* Shoulders */}
          <MuscleZone x={22} y={40} width={24} height={14} intensity={I.Shoulders} rx={6} />
          <MuscleZone x={74} y={40} width={24} height={14} intensity={I.Shoulders} rx={6} />

          {/* Chest */}
          <MuscleZone x={35} y={42} width={22} height={28} intensity={I.Chest} />
          <MuscleZone x={63} y={42} width={22} height={28} intensity={I.Chest} />

          {/* Abs */}
          <MuscleZone x={44} y={72} width={32} height={30} intensity={I.Abs} rx={6} />

          {/* Biceps (front of arms) */}
          <MuscleZone x={12} y={52} width={12} height={24} intensity={I.Biceps} rx={5} />
          <MuscleZone x={96} y={52} width={12} height={24} intensity={I.Biceps} rx={5} />

          {/* Forearms */}
          <MuscleZone x={8} y={78} width={10} height={22} intensity={I.Forearms} rx={4} />
          <MuscleZone x={102} y={78} width={10} height={22} intensity={I.Forearms} rx={4} />

          {/* Quads / Upper Legs */}
          <MuscleZone x={35} y={105} width={18} height={45} intensity={I.Legs} rx={6} />
          <MuscleZone x={67} y={105} width={18} height={45} intensity={I.Legs} rx={6} />

          {/* Shins */}
          <MuscleZone x={37} y={152} width={14} height={35} intensity={I.Legs * 0.5} rx={4} />
          <MuscleZone x={69} y={152} width={14} height={35} intensity={I.Legs * 0.5} rx={4} />

          {/* Feet */}
          <ellipse cx="44" cy="194" rx="10" ry="5" fill="rgba(255,255,255,0.03)" />
          <ellipse cx="76" cy="194" rx="10" ry="5" fill="rgba(255,255,255,0.03)" />
        </svg>
      </div>

      {/* BACK VIEW */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Back</p>
        <svg viewBox="0 0 120 220" width="120" height="220" className="mx-auto">
          {/* Head */}
          <ellipse cx="60" cy="18" rx="14" ry="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

          {/* Neck */}
          <rect x="53" y="33" width="14" height="8" rx="3" fill="rgba(255,255,255,0.03)" />

          {/* Rear Delts / Traps */}
          <MuscleZone x={28} y={38} width={64} height={16} intensity={I.Shoulders} rx={6} />

          {/* Upper Back / Lats */}
          <MuscleZone x={32} y={55} width={56} height={25} intensity={I.Back} rx={4} />

          {/* Lower Back */}
          <MuscleZone x={40} y={80} width={40} height={18} intensity={I.Back * 0.6} rx={4} />

          {/* Triceps (back of arms) */}
          <MuscleZone x={12} y={52} width={12} height={24} intensity={I.Triceps} rx={5} />
          <MuscleZone x={96} y={52} width={12} height={24} intensity={I.Triceps} rx={5} />

          {/* Forearms */}
          <MuscleZone x={8} y={78} width={10} height={22} intensity={I.Forearms} rx={4} />
          <MuscleZone x={102} y={78} width={10} height={22} intensity={I.Forearms} rx={4} />

          {/* Hamstrings */}
          <MuscleZone x={35} y={105} width={18} height={40} intensity={I.Legs * 0.8} rx={6} />
          <MuscleZone x={67} y={105} width={18} height={40} intensity={I.Legs * 0.8} rx={6} />

          {/* Calves */}
          <MuscleZone x={37} y={148} width={14} height={30} intensity={I.Legs * 0.7} rx={4} />
          <MuscleZone x={69} y={148} width={14} height={30} intensity={I.Legs * 0.7} rx={4} />

          {/* Feet */}
          <ellipse cx="44" cy="190" rx="10" ry="5" fill="rgba(255,255,255,0.03)" />
          <ellipse cx="76" cy="190" rx="10" ry="5" fill="rgba(255,255,255,0.03)" />
        </svg>
      </div>
    </div>
  );
}
