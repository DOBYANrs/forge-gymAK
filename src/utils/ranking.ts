import type { ExerciseLog, UserId } from '../types';
import {
  SCIENTIFIC_TIERS,
  DEFAULT_PROFILES,
  computeLiftResults,
  computeOverallTier,
  type AthleteProfile,
  type LiftResult,
} from './tierEngine';
import {
  computeMuscleScores,
  tierFromScore,
  type MuscleScoreResult,
} from './rsiEngine';

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
// RANK TIERS — the unified 7-tier scientific framework
// ============================================================
export interface TierInfo {
  name: string;
  threshold: number;
  level: number;
  color: string;
  cssGlow: string;
}

export const RANK_TIERS: TierInfo[] = SCIENTIFIC_TIERS;

export function getMuscleRank(score: number): TierInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= RANK_TIERS[i].threshold) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

// ============================================================
// MUSCLE-SPECIFIC STRENGTH THRESHOLDS
// Large compound movers (legs, back) generate higher total force
// than isolation/smaller push groups (chest, shoulders, arms),
// so each muscle gets its own point boundaries.
// Set Score = Weight (kg) × Reps
// ============================================================
export interface MuscleThreshold {
  beginner: number;      // 0+
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
  legendary: number;
}

export const MUSCLE_THRESHOLDS: Record<string, MuscleThreshold> = {
  legs:      { beginner: 0, novice: 300,  intermediate: 700,  advanced: 1400, elite: 2500, legendary: 4000 },
  back:      { beginner: 0, novice: 250,  intermediate: 550,  advanced: 1100, elite: 1800, legendary: 3000 },
  chest:     { beginner: 0, novice: 200,  intermediate: 450,  advanced: 900,  elite: 1400, legendary: 2200 },
  shoulders: { beginner: 0, novice: 120,  intermediate: 300,  advanced: 600,  elite: 1000, legendary: 1500 },
  arms:      { beginner: 0, novice: 100,  intermediate: 250,  advanced: 500,  elite: 800,  legendary: 1200 },
  abs:       { beginner: 0, novice: 80,   intermediate: 200,  advanced: 400,  elite: 650,  legendary: 1000 },
};

// Map each MuscleGroup to one of the threshold categories above.
const MUSCLE_CATEGORY: Record<MuscleGroup, string> = {
  Legs: 'legs',
  Hamstrings: 'legs',
  Calves: 'legs',
  Abductors: 'legs',
  Adductors: 'legs',
  Back: 'back',
  Chest: 'chest',
  Shoulders: 'shoulders',
  Biceps: 'arms',
  Triceps: 'arms',
  Forearms: 'arms',
  Abs: 'abs',
  Core: 'abs',
};

export function getMuscleThresholds(muscle: MuscleGroup): MuscleThreshold {
  return MUSCLE_THRESHOLDS[MUSCLE_CATEGORY[muscle]] ?? MUSCLE_THRESHOLDS.chest;
}

/**
 * Returns the rank tier for a muscle based on its own threshold scale.
 */
export function getMuscleRankFor(muscle: MuscleGroup, score: number): TierInfo {
  const t = getMuscleThresholds(muscle);
  const thresholds: { threshold: number; tier: TierInfo }[] = [
    { threshold: t.legendary,     tier: RANK_TIERS[5] },
    { threshold: t.elite,         tier: RANK_TIERS[4] },
    { threshold: t.advanced,      tier: RANK_TIERS[3] },
    { threshold: t.intermediate,  tier: RANK_TIERS[2] },
    { threshold: t.novice,        tier: RANK_TIERS[1] },
    { threshold: t.beginner,      tier: RANK_TIERS[0] },
  ];
  for (const { threshold, tier } of thresholds) {
    if (score >= threshold) return tier;
  }
  return RANK_TIERS[0];
}

// ============================================================
// MUSCLE GROUP IDENTIFIERS
// ============================================================
export type MuscleGroup =
  | 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps'
  | 'Legs' | 'Hamstrings' | 'Calves' | 'Abs' | 'Core' | 'Forearms'
  | 'Abductors' | 'Adductors';

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Legs', 'Hamstrings', 'Calves', 'Abs', 'Core', 'Forearms',
  'Abductors', 'Adductors',
];

// Secondary muscle carryover ratio used when an exercise assists a muscle
export interface SecondaryTarget {
  muscle: MuscleGroup;
  ratio: number;
}

export interface MuscleContribution {
  primary: MuscleGroup[];
  secondary: SecondaryTarget[];
}

const helpers = {
  // primary-only exercise
  p: (...primary: MuscleGroup[]): MuscleContribution => ({ primary, secondary: [] }),
  // primary + one secondary
  ps: (primary: MuscleGroup[], secondary: MuscleGroup[], ratio = 0.15): MuscleContribution => ({
    primary,
    secondary: secondary.map((muscle) => ({ muscle, ratio })),
  }),
};

// Map exercise names to their primary (100%) and secondary (fractional) muscles
const EXERCISE_TO_MUSCLES: Record<string, MuscleContribution> = {
  // Monday: Chest + Back + Shoulders + Triceps + Biceps
  'Incline Chest Press':              helpers.ps(['Chest'], ['Shoulders'], 0.10),
  'Cable Fly':                        helpers.p('Chest'),
  'Lat Pulldown':                     helpers.ps(['Back'], ['Biceps'], 0.15),
  'Overhead Press':                   helpers.ps(['Shoulders'], ['Triceps'], 0.10),
  'Row Machine 2 Var 2':              helpers.ps(['Back'], ['Biceps'], 0.15),
  'Triceps Push Down':                helpers.p('Triceps'),
  'Spider Curl':                      helpers.p('Biceps'),
  // Tuesday: Legs + Abs (Quad + Hamstring focus)
  'Low-Foot Placement Leg Press':     helpers.ps(['Legs'], ['Hamstrings'], 0.10),
  'Hamstring Curl':                   helpers.p('Hamstrings'),
  'Leg Extension':                    helpers.p('Legs'),
  'Calf Raise':                       helpers.p('Calves'),
  'Cable Crunches':                   helpers.ps(['Abs'], ['Core'], 0.15),
  'Oblique Side Switches':            helpers.ps(['Abs'], ['Core'], 0.15),
  // Thursday: Back + Shoulders + Core
  'Pull Down':                        helpers.ps(['Back'], ['Biceps'], 0.15),
  'Row Machine 1 Var 2':              helpers.ps(['Back'], ['Biceps'], 0.15),
  '1-Hand Lat Pulldown':              helpers.ps(['Back'], ['Biceps'], 0.15),
  'Archer Pull':                      helpers.ps(['Back'], ['Biceps'], 0.15),
  'Face Pulls':                       helpers.ps(['Shoulders', 'Back'], ['Core'], 0.10),
  'Front Lever Progression':          helpers.ps(['Back', 'Abs'], ['Core'], 0.15),
  'Dead Hang':                        helpers.ps(['Back'], ['Forearms'], 0.15),
  // Friday: Legs + Abs (Abductors/Adductors focus)
  'Low-Foot Leg Press':               helpers.ps(['Legs'], ['Hamstrings'], 0.10),
  'Abduction Machine':                helpers.p('Abductors', 'Adductors'),
  'Floor Crunches / Hanging Knee Raises': helpers.ps(['Abs'], ['Core'], 0.15),
  // Saturday: Chest + Triceps + Biceps + Forearms
  'Yellow Machine Chest Press':       helpers.p('Chest'),
  'Lower Chest Cable Pulldown':       helpers.ps(['Chest'], ['Triceps'], 0.10),
  'Cable Fly 55 Degree':              helpers.p('Chest'),
  'Triceps Overhead Extension':       helpers.p('Triceps'),
  'Biceps Curl / Cable Curl':         helpers.ps(['Biceps'], ['Forearms'], 0.15),
  'Wrist Flexion & Extension Superset': helpers.p('Forearms'),
  // Shared aliases
  'Pull Up':                          helpers.ps(['Back'], ['Biceps'], 0.15),
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
  // RSI composite muscle score (0-100)
  score?: number;
  // Scientific tier engine data (filled when available)
  z?: number;
  scaled?: number;
  e1RM?: number;
  lift?: string;
  contributions?: MuscleScoreResult['contributions'];
}

export interface UserRankResult {
  overallRank: string;
  overallTier: TierInfo;
  averageLevel: number;
  muscleRanks: MuscleRankResult[];
  // Scientific engine data for the session report
  overallZ?: number;
  liftResults?: LiftResult[];
}

function applyPeak(peaks: MusclePeaks, muscle: MuscleGroup, score: number, weight: number, reps: number, exerciseName: string, dateKey: string): void {
  const current = peaks[muscle];
  if (score > current.score) {
    peaks[muscle] = {
      score,
      weight,
      reps,
      exerciseName,
      dateKey,
    };
  }
}

/**
 * Returns the set of muscle groups the given exercise activates today,
 * including both primary (100%) and secondary (fractional) muscles.
 */
export function getActivatedMusclesForExercise(exerciseName: string): MuscleGroup[] {
  const contribution = EXERCISE_TO_MUSCLES[exerciseName];
  if (!contribution) return [];
  return [...contribution.primary, ...contribution.secondary.map((s) => s.muscle)];
}

/**
 * Returns the muscle groups a user activated on a given date key,
 * derived from the logged workout data (primary + secondary muscles).
 */
export function getActivatedMusclesOnDate(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
  dateKey: string,
): MuscleGroup[] {
  const activated = new Set<MuscleGroup>();
  const day = workoutData[userId]?.[dateKey];
  if (!day?.exercises) return [];
  for (const exercise of day.exercises) {
    const hasLoggedSet = exercise.sets.some((s) => s.weightKg > 0 && s.reps > 0);
    if (!hasLoggedSet) continue;
    for (const muscle of getActivatedMusclesForExercise(exercise.exerciseName)) {
      activated.add(muscle);
    }
  }
  return Array.from(activated);
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
      const contribution = EXERCISE_TO_MUSCLES[exercise.exerciseName];
      if (!contribution) continue;

      for (const set of exercise.sets) {
        if (set.weightKg <= 0 || set.reps <= 0) continue;
        const setScore = calculateSetScore(set.weightKg, set.reps);

        // Primary muscles receive the full set score (100%)
        for (const muscle of contribution.primary) {
          applyPeak(peaks, muscle, setScore, set.weightKg, set.reps, exercise.exerciseName, dateKey);
        }

        // Secondary muscles receive a fractional carryover of the set score
        for (const sec of contribution.secondary) {
          const secScore = Math.round(setScore * sec.ratio);
          applyPeak(peaks, sec.muscle, secScore, set.weightKg, set.reps, exercise.exerciseName, dateKey);
        }
      }
    }
  }

  return peaks;
}

export function calculateOverallUserRank(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
  profile?: AthleteProfile,
): UserRankResult {
  const athleteProfile = profile ?? DEFAULT_PROFILES[userId];
  const peaks = calculateMusclePeaks(workoutData, userId);
  const liftResults = computeLiftResults(workoutData, userId, athleteProfile);

  // RSI engine: weighted composite muscle scores (0-100) per muscle group.
  const muscleScores = computeMuscleScores(workoutData, userId, athleteProfile.bodyWeightKg);
  const scoreByMuscle = new Map<MuscleGroup, MuscleScoreResult>(
    muscleScores.map((m) => [m.muscle, m]),
  );

  const overall = computeOverallTier(liftResults);
  const overallTier = RANK_TIERS[overall.tierLevel] ?? RANK_TIERS[0];

  const muscleRanks: MuscleRankResult[] = ALL_MUSCLE_GROUPS.map((muscle) => {
    const peak = peaks[muscle];
    const sci = scoreByMuscle.get(muscle);
    const tier = sci ? tierInfoForLevel(sci.tier.level) : RANK_TIERS[0];
    return {
      muscle,
      peakScore: peak.score,
      peakWeight: peak.weight,
      peakReps: peak.reps,
      peakExercise: peak.exerciseName,
      peakDate: peak.dateKey,
      tier,
      score: sci?.score,
      contributions: sci?.contributions,
    };
  });

  // Sort by RSI score descending (muscles with data first)
  muscleRanks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Overall rank = composite of muscle scores via the tier breakpoints.
  const avgScore = muscleScores.length > 0
    ? muscleScores.reduce((sum, m) => sum + m.score, 0) / muscleScores.length
    : 0;
  const overallTierFromScore = tierFromScore(avgScore);
  const overallRank = overallTierFromScore.name;

  // averageLevel = mean muscle tier level (0..6) — used by the header gauge.
  const totalLevels = muscleRanks.reduce((sum, mr) => sum + mr.tier.level, 0);
  const averageLevel = ALL_MUSCLE_GROUPS.length > 0
    ? totalLevels / ALL_MUSCLE_GROUPS.length
    : 0;

  return {
    overallRank,
    overallTier,
    overallZ: overall.z,
    liftResults,
    averageLevel: Math.round(averageLevel * 100) / 100,
    muscleRanks,
  };
}

// Re-export helper so ranking.ts consumers get tier lookup without a circular import.
export function tierInfoForLevel(level: number): TierInfo {
  return SCIENTIFIC_TIERS[Math.max(0, Math.min(level, SCIENTIFIC_TIERS.length - 1))];
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the muscle groups a user activated today (primary + secondary),
 * used to drive the daily-active pulse on the social / ranking body map.
 */
export function getTodayActivatedMuscles(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
): MuscleGroup[] {
  return getActivatedMusclesOnDate(workoutData, userId, todayKey());
}
