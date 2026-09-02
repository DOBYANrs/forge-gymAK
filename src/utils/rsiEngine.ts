import type { ExerciseLog, UserId } from '../types';
import type { MuscleGroup, TierInfo } from './ranking';

// ============================================================
// RSI STRENGTH RANKING ENGINE
// Blueprint: RSI = 1RM / Bodyweight ; ExerciseScore 0-100 ;
// weighted Composite Muscle Group Score (CMGS) ; tier breakpoints.
// Runs client-side against localStorage (no DB/backend needed).
// ============================================================

// ─── Section 1: Elite RSI targets (top of Legendary/Elite bracket) ──
export interface RsiCategory {
  name: string;
  eliteRsi: number; // used for Exercise_Score = (RSI / Elite_RSI) * 100
}

export const RSI_CATEGORIES: Record<string, RsiCategory> = {
  press: { name: 'Chest/Press', eliteRsi: 1.60 },
  pull: { name: 'Back/Pull', eliteRsi: 1.70 },
  leg: { name: 'Leg Press', eliteRsi: 2.20 },
  ohp: { name: 'Overhead Press', eliteRsi: 1.05 },
  isolation: { name: 'Isolation', eliteRsi: 0.55 },
  core: { name: 'Core', eliteRsi: 0 }, // uses target reps instead
};

// ─── Section 2: exercise → muscle activation weights ──
// activation weights per muscle group sum to 1.0 across the schedule.
export interface RsiExerciseConfig {
  category: keyof typeof RSI_CATEGORIES;
  // For core/bodyweight exercises: target reps (or hold seconds).
  targetReps?: number;
  // muscle -> activation weight
  muscles: Partial<Record<MuscleGroup, number>>;
}

export const EXERCISE_RANK: Record<string, RsiExerciseConfig> = {
  // ── CHEST ── (Incline 40%, Yellow 20%, Lower Pulldown 25%, Fly 15%)
  'Incline Chest Press': { category: 'press', muscles: { Chest: 0.40 } },
  'Yellow Machine Chest Press': { category: 'press', muscles: { Chest: 0.20 } },
  'Lower Chest Cable Pulldown': { category: 'press', muscles: { Chest: 0.25 } },
  'Cable Fly 55 Degree': { category: 'press', muscles: { Chest: 0.15 } },
  'Cable Fly': { category: 'press', muscles: { Chest: 0.15 } },
  // ── BACK (vertical pull) ── (Lat Pulldown 35%, Pulldown 35%, 1-Hand 30%)
  'Lat Pulldown': { category: 'pull', muscles: { Back: 0.35 } },
  'Pull Down': { category: 'pull', muscles: { Back: 0.35 } },
  '1-Hand Lat Pulldown': { category: 'pull', muscles: { Back: 0.30 } },
  'Pull Up': { category: 'pull', muscles: { Back: 0.35 } },
  // ── BACK (upper/mid - horizontal pull) ── (Row2 40%, Row1 40%, Archer 20%)
  'Row Machine 2 Var 2': { category: 'pull', muscles: { Back: 0.40 } },
  'Row Machine 1 Var 2': { category: 'pull', muscles: { Back: 0.40 } },
  'Archer Pull': { category: 'pull', muscles: { Back: 0.20 } },
  // ── SHOULDERS ── (OHP 50%, Face Pulls 20%)
  'Overhead Press': { category: 'ohp', muscles: { Shoulders: 0.50 } },
  'Face Pulls': { category: 'isolation', muscles: { Shoulders: 0.20 } },
  'Lateral Raise': { category: 'isolation', muscles: { Shoulders: 0.30 } },
  // ── LEGS (Quads/Glutes) ── (Low-Foot 40%, Leg Extension 30%)
  'Low-Foot Placement Leg Press': { category: 'leg', muscles: { Legs: 0.40 } },
  'Low-Foot Leg Press': { category: 'leg', muscles: { Legs: 0.40 } },
  'Leg Extension': { category: 'isolation', muscles: { Legs: 0.30 } },
  'Leg Press': { category: 'leg', muscles: { Legs: 0.40 } },
  // ── HAMSTRINGS ── (Hamstring Curl 50%)
  'Hamstring Curl': { category: 'isolation', muscles: { Hamstrings: 0.50 } },
  // ── ABDUCTORS ── (100%)
  'Abduction Machine': { category: 'isolation', muscles: { Abductors: 1.0 } },
  // ── BICEPS ── (Spider Curl 40%, Biceps/Cable Curl 30%)
  'Spider Curl': { category: 'isolation', muscles: { Biceps: 0.40 } },
  'Biceps Curl / Cable Curl': { category: 'isolation', muscles: { Biceps: 0.30 } },
  // ── TRICEPS ── (Pushdown 40%, Overhead Extension 30%)
  'Triceps Push Down': { category: 'isolation', muscles: { Triceps: 0.40 } },
  'Triceps Overhead Extension': { category: 'isolation', muscles: { Triceps: 0.30 } },
  // ── CALVES ── (Calf Raise 50%)
  'Calf Raise': { category: 'isolation', muscles: { Calves: 0.50 } },
  // ── CORE / ABS ── (Crunches 25%, Oblique 15%, Floor 25%, Front Lever 20%, Dead Hang 15%)
  'Cable Crunches': { category: 'core', targetReps: 50, muscles: { Abs: 0.25 } },
  'Oblique Side Switches': { category: 'core', targetReps: 60, muscles: { Abs: 0.15 } },
  'Floor Crunches / Hanging Knee Raises': { category: 'core', targetReps: 50, muscles: { Abs: 0.25 } },
  'Front Lever Progression': { category: 'core', targetReps: 8, muscles: { Abs: 0.20 } },
  'Dead Hang': { category: 'core', targetReps: 30, muscles: { Abs: 0.15 } },
  // ── FOREARMS ── (100%)
  'Wrist Flexion & Extension Superset': { category: 'isolation', muscles: { Forearms: 1.0 } },
};

// ─── Section 1/3: Tier breakpoints from Composite Muscle Score (0-100) ──
export const CMGS_TIERS: { name: string; min: number; level: number }[] = [
  { name: 'Untrained', min: 0, level: 0 },
  { name: 'Beginner', min: 15, level: 1 },
  { name: 'Intermediate', min: 30, level: 2 },
  { name: 'Trained', min: 45, level: 3 },
  { name: 'Advanced', min: 60, level: 4 },
  { name: 'Highly Advanced', min: 75, level: 5 },
  { name: 'Legendary / Elite', min: 90, level: 6 },
];

export function tierFromScore(score: number): { name: string; level: number } {
  for (let i = CMGS_TIERS.length - 1; i >= 0; i--) {
    if (score >= CMGS_TIERS[i].min) return { name: CMGS_TIERS[i].name, level: CMGS_TIERS[i].level };
  }
  return { name: CMGS_TIERS[0].name, level: CMGS_TIERS[0].level };
}

// ─── Step A: Epley 1RM ───────────────────────────────
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

// Best log (best 1RM for weighted; best reps for core) within last 30 days.
export interface BestLog {
  weightKg: number;
  reps: number;
  holdSeconds: number;
  e1RM: number;
  dateKey: string;
}

export function bestLogForExercise(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
  exerciseName: string,
  category: keyof typeof RSI_CATEGORIES,
  now: Date = new Date(),
): BestLog | null {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  const userData = workoutData[userId] ?? {};
  let best: BestLog | null = null;

  for (const [dateKey, day] of Object.entries(userData)) {
    if (!day?.exercises) continue;
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);
    if (dayDate < cutoff) continue;

    for (const exercise of day.exercises) {
      if (exercise.exerciseName !== exerciseName) continue;
      for (const set of exercise.sets) {
        if (set.weightKg <= 0 && set.reps <= 0) continue;
        const candidate: BestLog = {
          weightKg: set.weightKg || 0,
          reps: set.reps || 0,
          holdSeconds: 0,
          e1RM: category === 'core' ? set.reps : epley1RM(set.weightKg, set.reps),
          dateKey,
        };
        if (!best || candidate.e1RM > best.e1RM) best = candidate;
      }
    }
  }
  return best;
}

// Exercise Score (0-100).
export function exerciseScore(
  best: BestLog | null,
  category: keyof typeof RSI_CATEGORIES,
  userWeightKg: number,
  targetReps?: number,
): number {
  if (!best) return 0;
  if (category === 'core') {
    const target = targetReps ?? 1;
    if (target <= 0) return 0;
    return Math.min(100, (best.reps / target) * 100);
  }
  const rsi = userWeightKg > 0 ? best.e1RM / userWeightKg : 0;
  const elite = RSI_CATEGORIES[category].eliteRsi;
  if (elite <= 0) return 0;
  return Math.min(100, (rsi / elite) * 100);
}

// ─── Step B: Composite Muscle Group Score (CMGS) ──
export interface MuscleScoreResult {
  muscle: MuscleGroup;
  score: number; // 0-100
  tier: TierInfo;
  contributions: {
    exercise: string;
    exerciseScore: number;
    activationWeight: number;
    e1RM: number;
    bestLoad: number;
    bestReps: number;
  }[];
}

export function computeMuscleScores(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
  userWeightKg: number,
  now: Date = new Date(),
): MuscleScoreResult[] {
  const muscleMap = new Map<MuscleGroup, {
    totalWeighted: number;
    totalWeight: number;
    contributions: MuscleScoreResult['contributions'];
  }>();

  for (const [exerciseName, config] of Object.entries(EXERCISE_RANK)) {
    const best = bestLogForExercise(workoutData, userId, exerciseName, config.category, now);
    // Blueprint: exercises with no log in the window are skipped entirely so
    // they do not dilute the composite (only performed moves are averaged).
    if (!best) continue;
    const score = exerciseScore(best, config.category, userWeightKg, config.targetReps);

    for (const [muscle, weight] of Object.entries(config.muscles)) {
      const entry = muscleMap.get(muscle as MuscleGroup) ?? {
        totalWeighted: 0,
        totalWeight: 0,
        contributions: [],
      };
      entry.totalWeighted += score * (weight ?? 0);
      entry.totalWeight += weight ?? 0;
      entry.contributions.push({
        exercise: exerciseName,
        exerciseScore: score,
        activationWeight: weight ?? 0,
        e1RM: best?.e1RM ?? 0,
        bestLoad: best?.weightKg ?? 0,
        bestReps: best?.reps ?? 0,
      });
      muscleMap.set(muscle as MuscleGroup, entry);
    }
  }

  // Muscle groups from the app's canonical list.
  const order: MuscleGroup[] = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Hamstrings',
    'Calves', 'Abs', 'Core', 'Forearms', 'Abductors', 'Adductors',
  ];

  return order.map((muscle) => {
    const entry = muscleMap.get(muscle);
    const score = entry && entry.totalWeight > 0 ? entry.totalWeighted / entry.totalWeight : 0;
    const tierDef = tierFromScore(score);
    return {
      muscle,
      score: Math.round(score * 10) / 10,
      tier: tierInfoForLevel(tierDef.level),
      contributions: entry?.contributions ?? [],
    };
  });
}

// Resolve a tier level to TierInfo (same unified 7-tier palette as the app).
// Imported lazily to avoid a hard circular import with ranking.ts.
import { SCIENTIFIC_TIERS } from './tierEngine';
export function tierInfoForLevel(level: number): TierInfo {
  return SCIENTIFIC_TIERS[Math.max(0, Math.min(level, SCIENTIFIC_TIERS.length - 1))];
}
