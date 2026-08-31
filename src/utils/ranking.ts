import type { ExerciseLog, UserId } from '../types';
import { EXERCISE_MUSCLE_MAP } from './calculations';

// ============================================================
// PEAK SET PERFORMANCE SCORE
// Set Score = Weight × Reps
// Each muscle group tracks its all-time high score.
// ============================================================
export function calculateSetScore(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.round(weightKg * reps);
}

// ============================================================
// RANK TIERS — based on peak set score thresholds
// ============================================================
export interface TierInfo {
  name: string;
  threshold: number;
  level: number;
  color: string;
  cssGlow: string;
}

export const RANK_TIERS: TierInfo[] = [
  { name: 'Beginner',     threshold: 0,    level: 0, color: '#6b7280', cssGlow: 'none' },
  { name: 'Novice',       threshold: 250,  level: 1, color: '#eab308', cssGlow: '0 0 12px rgba(234,179,8,0.3)' },
  { name: 'Intermediate', threshold: 500,  level: 2, color: '#3b82f6', cssGlow: '0 0 14px rgba(59,130,246,0.35)' },
  { name: 'Advanced',     threshold: 1000, level: 3, color: '#1e3a8a', cssGlow: '0 0 16px rgba(30,58,138,0.5)' },
  { name: 'Elite',        threshold: 2000, level: 4, color: '#f97316', cssGlow: '0 0 18px rgba(249,115,22,0.45)' },
  { name: 'Legendary',    threshold: 4000, level: 5, color: '#ef4444', cssGlow: '0 0 22px rgba(239,68,68,0.55)' },
];

export function getMuscleRank(score: number): TierInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= RANK_TIERS[i].threshold) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

// ============================================================
// MUSCLE GROUP IDENTIFIERS
// ============================================================
export type MuscleGroup =
  | 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps'
  | 'Legs' | 'Hamstrings' | 'Calves' | 'Abs' | 'Core' | 'Forearms';

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Hamstrings', 'Calves', 'Abs', 'Core', 'Forearms',
];

// Map exercise names to the muscle groups they target
const EXERCISE_TO_MUSCLES: Record<string, MuscleGroup[]> = {
  'Incline Chest Press':              ['Chest', 'Shoulders'],
  'Yellow Machine Chest Press':       ['Chest'],
  'Cable Fly':                        ['Chest'],
  'Cable Fly 55 Degree':              ['Chest'],
  'Lower Chest Cable Pulldown':       ['Chest'],
  'Lat Pulldown':                     ['Back', 'Biceps'],
  'Pull Down':                        ['Back'],
  'Pull Up':                          ['Back', 'Biceps'],
  'Row Machine 2 Var 2':             ['Back'],
  'Row Machine 1 Var 2':             ['Back'],
  '1-Hand Lat Pulldown':             ['Back'],
  'Archer Pull':                      ['Back', 'Biceps'],
  'Front Lever Progression':          ['Back', 'Core'],
  'Dead Hang':                        ['Back', 'Forearms'],
  'Overhead Press':                   ['Shoulders'],
  'Face Pulls':                       ['Shoulders', 'Back'],
  'Triceps Push Down':                ['Triceps'],
  'Triceps Overhead Extension':       ['Triceps'],
  'Spider Curl':                      ['Biceps'],
  'Biceps Curl / Cable Curl':         ['Biceps', 'Forearms'],
  'Wrist Flexion & Extension Superset': ['Forearms'],
  'Low-Foot Placement Leg Press':     ['Legs'],
  'Low-Foot Leg Press':              ['Legs'],
  'Leg Extension':                    ['Legs'],
  'Hamstring Curl':                   ['Legs', 'Hamstrings'],
  'Calf Raise':                       ['Legs', 'Calves'],
  'Abduction Machine':               ['Legs'],
  'Cable Crunches':                   ['Abs'],
  'Floor Crunches / Hanging Knee Raises': ['Abs'],
  'Oblique Side Switches':            ['Abs'],
};

// ============================================================
// MUSCLE PEAK STORE
// Tracks the all-time best set score per muscle group
// ============================================================
export interface MusclePeak {
  score: number;
  weight: number;
  reps: number;
  exerciseName: string;
  dateKey: string;
}

export type MusclePeaks = Record<MuscleGroup, MusclePeak>;

function createEmptyPeaks(): MusclePeaks {
  const peaks = {} as MusclePeaks;
  for (const muscle of ALL_MUSCLE_GROUPS) {
    peaks[muscle] = { score: 0, weight: 0, reps: 0, exerciseName: '', dateKey: '' };
  }
  return peaks;
}

// ============================================================
// CORE: Scan workout data and compute peak scores per muscle
// Only updates a muscle's rank if the new set score
// surpasses the previous peak.
// ============================================================
export interface MuscleRankResult {
  muscle: MuscleGroup;
  peakScore: number;
  peakWeight: number;
  peakReps: number;
  peakExercise: string;
  peakDate: string;
  tier: TierInfo;
}

export interface UserRankResult {
  overallRank: string;
  overallTier: TierInfo;
  averageLevel: number;
  muscleRanks: MuscleRankResult[];
}

export function calculateMusclePeaks(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
): MusclePeaks {
  const peaks = createEmptyPeaks();

  const userData = workoutData[userId] ?? {};
  for (const [dateKey, day] of Object.entries(userData)) {
    if (!day?.exercises) continue;
    for (const exercise of day.exercises) {
      const muscles = EXERCISE_TO_MUSCLES[exercise.exerciseName];
      if (!muscles) continue;

      for (const set of exercise.sets) {
        if (set.weightKg <= 0 || set.reps <= 0) continue;
        const setScore = calculateSetScore(set.weightKg, set.reps);

        for (const muscle of muscles) {
          const current = peaks[muscle];
          // Only update if this set beats the all-time peak
          if (setScore > current.score) {
            peaks[muscle] = {
              score: setScore,
              weight: set.weightKg,
              reps: set.reps,
              exerciseName: exercise.exerciseName,
              dateKey,
            };
          }
        }
      }
    }
  }

  return peaks;
}

export function calculateOverallUserRank(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
): UserRankResult {
  const peaks = calculateMusclePeaks(workoutData, userId);

  const muscleRanks: MuscleRankResult[] = ALL_MUSCLE_GROUPS.map((muscle) => {
    const peak = peaks[muscle];
    return {
      muscle,
      peakScore: peak.score,
      peakWeight: peak.weight,
      peakReps: peak.reps,
      peakExercise: peak.exerciseName,
      peakDate: peak.dateKey,
      tier: getMuscleRank(peak.score),
    };
  });

  // Sort by peak score descending (muscles with data first)
  muscleRanks.sort((a, b) => b.peakScore - a.peakScore);

  // Overall rank = tier point average across all muscle groups
  const totalLevels = muscleRanks.reduce((sum, mr) => sum + mr.tier.level, 0);
  const averageLevel = ALL_MUSCLE_GROUPS.length > 0
    ? totalLevels / ALL_MUSCLE_GROUPS.length
    : 0;

  let overallRank = 'Beginner';
  let overallTier = RANK_TIERS[0];

  if (averageLevel >= 4.5) {
    overallRank = 'Legendary';
    overallTier = RANK_TIERS[5];
  } else if (averageLevel >= 3.5) {
    overallRank = 'Elite';
    overallTier = RANK_TIERS[4];
  } else if (averageLevel >= 2.5) {
    overallRank = 'Advanced';
    overallTier = RANK_TIERS[3];
  } else if (averageLevel >= 1.5) {
    overallRank = 'Intermediate';
    overallTier = RANK_TIERS[2];
  } else if (averageLevel >= 0.5) {
    overallRank = 'Novice';
    overallTier = RANK_TIERS[1];
  }

  return {
    overallRank,
    overallTier,
    averageLevel: Math.round(averageLevel * 100) / 100,
    muscleRanks,
  };
}
