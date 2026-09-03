import type { ExerciseLog, UserId } from '../types';
import type { MuscleGroup, TierInfo } from './ranking';
import type { AthleteProfile } from './tierEngine';
import { SCIENTIFIC_TIERS } from './tierEngine';

// ============================================================
// ALLOMETRIC + BMI/AGE-ADJUSTED STRENGTH RANKING ENGINE
// ------------------------------------------------------------
// Uses bodyweight, height (BMI), age and exercise type together:
//   1. e1RM   = Epley best set  -> 1RM = W × (1 + Reps/30)
//   2. rel1RM = e1RM / bodyweight  (bodyweight multiple)
//   3. adjusted = rel1RM × BMI_leverage × age_coefficient
//   4. score  = percentile of adjusted ratio within per-exercise
//               population distribution (Beginner p10 … Elite p95)
//   5. muscle = effectiveness-weighted blend of EVERY exercise
//               that targets that muscle (no exercise left out)
// ============================================================

// ─── Tier boundaries by population percentile (7 tiers) ───
// percentile = LOWER bound required to reach that tier.
export const TIER_PERCENTILES: { name: string; percentile: number; level: number }[] = [
  { name: 'Untrained', percentile: 0, level: 0 },
  { name: 'Beginner', percentile: 10, level: 1 },
  { name: 'Intermediate', percentile: 25, level: 2 },
  { name: 'Upper-Intermediate', percentile: 50, level: 3 },
  { name: 'Advanced', percentile: 70, level: 4 },
  { name: 'Highly Advanced', percentile: 85, level: 5 },
  { name: 'Legendary / Elite', percentile: 95, level: 6 },
];

// Standard normal CDF (A&S 7.1.26) for z -> percentile.
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  if (z > 0) p = 1 - p;
  return p;
}

export function percentileFromZ(z: number): number {
  return normCdf(z) * 100;
}

export function tierFromPercentile(pct: number): { name: string; level: number } {
  for (let i = TIER_PERCENTILES.length - 1; i >= 0; i--) {
    if (pct >= TIER_PERCENTILES[i].percentile) {
      return { name: TIER_PERCENTILES[i].name, level: TIER_PERCENTILES[i].level };
    }
  }
  return { name: TIER_PERCENTILES[0].name, level: 0 };
}

// ─── Per-exercise population standards ─────────────────────
// Real bodyweight-ratio thresholds (e1RM ÷ bodyweight) for the five
// tier anchors, sourced from Strength Level (150M+ logged lifts; tier =
// percentile: Beginner 5th, Novice 20th, Intermediate 50th, Advanced 80th,
// Elite 95th). A lifter's ratio is interpolated between these fixed
// boundaries — no guessed distribution spreads, so no normal lift inflates
// to an extreme percentile.
// rat = [beginner, novice, intermediate, advanced, elite]
// upper = upper-body/compression move (BMI leverage applies).
export interface ExerciseStandard {
  rat: [number, number, number, number, number];
  upper: boolean; // upper-body compression move (BMI leverage applies)
  // Muscle(s) targeted with relative effectiveness weight (sums across
  // exercises for a muscle are normalised at composite time).
  targets: { muscle: MuscleGroup; effectiveness: number }[];
  isCore?: boolean; // bodyweight/core move scored by reps, not load
  name: string;
}

export const EXERCISE_STANDARDS: Record<string, ExerciseStandard> = {
  // ── CHEST ──
  'Incline Chest Press': {
    name: 'Incline Chest Press', rat: [0.45, 0.70, 1.10, 1.50, 1.75], upper: true,
    targets: [{ muscle: 'Chest', effectiveness: 0.40 }],
  },
  'Yellow Machine Chest Press': {
    name: 'Yellow Machine Chest Press', rat: [0.60, 0.90, 1.40, 1.90, 2.20], upper: true,
    targets: [{ muscle: 'Chest', effectiveness: 0.20 }],
  },
  'Cable Fly': {
    name: 'Cable Fly', rat: [0.25, 0.40, 0.60, 0.90, 1.10], upper: true,
    targets: [{ muscle: 'Chest', effectiveness: 0.15 }],
  },
  'Cable Fly 55 Degree': {
    name: 'Cable Fly 55 Degree', rat: [0.26, 0.42, 0.62, 0.92, 1.12], upper: true,
    targets: [{ muscle: 'Chest', effectiveness: 0.15 }],
  },
  'Lower Chest Cable Pulldown': {
    name: 'Lower Chest Cable Pulldown', rat: [0.28, 0.45, 0.65, 0.95, 1.15], upper: true,
    targets: [{ muscle: 'Chest', effectiveness: 0.25 }],
  },
  // ── BACK (vertical pull) ──
  'Lat Pulldown': {
    name: 'Lat Pulldown', rat: [0.50, 0.75, 1.00, 1.50, 1.75], upper: true,
    targets: [{ muscle: 'Back', effectiveness: 0.35 }],
  },
  'Pull Down': {
    name: 'Pull Down', rat: [0.50, 0.75, 1.00, 1.50, 1.75], upper: true,
    targets: [{ muscle: 'Back', effectiveness: 0.35 }],
  },
  '1-Hand Lat Pulldown': {
    name: '1-Hand Lat Pulldown', rat: [0.40, 0.60, 0.80, 1.20, 1.40], upper: true,
    targets: [{ muscle: 'Back', effectiveness: 0.30 }],
  },
  'Pull Up': {
    name: 'Pull Up', rat: [0.75, 1.00, 1.25, 1.50, 1.75], upper: true,
    targets: [{ muscle: 'Back', effectiveness: 0.35 }],
  },
  // ── BACK (horizontal / upper-mid row) ──
  'Row Machine 2 Var 2': {
    name: 'Row Machine 2 Var 2', rat: [0.55, 0.70, 1.00, 1.30, 1.70], upper: true,
    targets: [{ muscle: 'Back', effectiveness: 0.40 }],
  },
  'Row Machine 1 Var 2': {
    name: 'Row Machine 1 Var 2', rat: [0.55, 0.70, 1.00, 1.30, 1.70], upper: true,
    targets: [
      { muscle: 'Back', effectiveness: 0.40 },
      { muscle: 'Shoulders', effectiveness: 0.15 },
    ],
  },
  'Archer Pull': {
    name: 'Archer Pull', rat: [0.30, 0.45, 0.65, 0.90, 1.10], upper: true,
    targets: [
      { muscle: 'Back', effectiveness: 0.20 },
      { muscle: 'Shoulders', effectiveness: 0.30 },
    ],
  },
  'Rear Delt Row': {
    name: 'Rear Delt Row', rat: [0.30, 0.45, 0.65, 0.90, 1.10], upper: true,
    targets: [
      { muscle: 'Shoulders', effectiveness: 0.30 },
      { muscle: 'Back', effectiveness: 0.20 },
    ],
  },
  // ── SHOULDERS ──
  'Overhead Press': {
    name: 'Overhead Press', rat: [0.35, 0.55, 0.75, 1.00, 1.25], upper: true,
    targets: [{ muscle: 'Shoulders', effectiveness: 0.50 }],
  },
  'Face Pulls': {
    name: 'Face Pulls', rat: [0.20, 0.30, 0.45, 0.65, 0.85], upper: true,
    targets: [
      { muscle: 'Shoulders', effectiveness: 0.20 },
      { muscle: 'Back', effectiveness: 0.10 },
    ],
  },
  'Lateral Raise': {
    name: 'Lateral Raise', rat: [0.15, 0.22, 0.32, 0.45, 0.60], upper: true,
    targets: [{ muscle: 'Shoulders', effectiveness: 0.30 }],
  },
  // ── LEGS (quad/glute) ──
  'Low-Foot Placement Leg Press': {
    name: 'Low-Foot Placement Leg Press', rat: [1.30, 2.00, 2.90, 3.90, 5.00], upper: false,
    targets: [{ muscle: 'Legs', effectiveness: 0.40 }],
  },
  'Low-Foot Leg Press': {
    name: 'Low-Foot Leg Press', rat: [1.30, 2.00, 2.90, 3.90, 5.00], upper: false,
    targets: [{ muscle: 'Legs', effectiveness: 0.40 }],
  },
  'Leg Press': {
    name: 'Leg Press', rat: [1.30, 2.00, 2.90, 3.90, 5.00], upper: false,
    targets: [{ muscle: 'Legs', effectiveness: 0.40 }],
  },
  'Leg Extension': {
    name: 'Leg Extension', rat: [0.50, 0.90, 1.25, 1.75, 2.30], upper: false,
    targets: [{ muscle: 'Legs', effectiveness: 0.30 }],
  },
  // ── HAMSTRINGS ──
  'Hamstring Curl': {
    name: 'Hamstring Curl', rat: [0.45, 0.70, 1.00, 1.45, 1.85], upper: false,
    targets: [{ muscle: 'Hamstrings', effectiveness: 0.50 }],
  },
  'Leg Curl': {
    name: 'Leg Curl', rat: [0.45, 0.70, 1.00, 1.45, 1.85], upper: false,
    targets: [{ muscle: 'Hamstrings', effectiveness: 0.50 }],
  },
  // ── ABDUCTORS ──
  'Abduction Machine': {
    name: 'Abduction Machine', rat: [0.25, 0.40, 0.55, 0.80, 1.10], upper: false,
    targets: [{ muscle: 'Abductors', effectiveness: 1.0 }],
  },
  // ── BICEPS ──
  'Spider Curl': {
    name: 'Spider Curl', rat: [0.25, 0.38, 0.55, 0.80, 1.10], upper: true,
    targets: [{ muscle: 'Biceps', effectiveness: 0.40 }],
  },
  'Biceps Curl / Cable Curl': {
    name: 'Biceps Curl / Cable Curl', rat: [0.25, 0.38, 0.55, 0.80, 1.10], upper: true,
    targets: [{ muscle: 'Biceps', effectiveness: 0.30 }],
  },
  // ── TRICEPS ──
  'Triceps Push Down': {
    name: 'Triceps Push Down', rat: [0.25, 0.45, 0.70, 1.05, 1.40], upper: true,
    targets: [{ muscle: 'Triceps', effectiveness: 0.40 }],
  },
  'Triceps Overhead Extension': {
    name: 'Triceps Overhead Extension', rat: [0.22, 0.40, 0.65, 0.95, 1.25], upper: true,
    targets: [{ muscle: 'Triceps', effectiveness: 0.30 }],
  },
  // ── CALVES ──
  'Calf Raise': {
    name: 'Calf Raise', rat: [0.50, 1.00, 1.50, 2.25, 3.25], upper: false,
    targets: [{ muscle: 'Calves', effectiveness: 0.50 }],
  },
  // ── CORE / ABS (bodyweight -> scored by reps) ──
  'Cable Crunches': {
    name: 'Cable Crunches', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, targets: [{ muscle: 'Abs', effectiveness: 0.25 }],
  },
  'Oblique Side Switches': {
    name: 'Oblique Side Switches', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, targets: [{ muscle: 'Abs', effectiveness: 0.15 }],
  },
  'Floor Crunches / Hanging Knee Raises': {
    name: 'Floor Crunches / Hanging Knee Raises', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, targets: [{ muscle: 'Abs', effectiveness: 0.25 }],
  },
  'Front Lever Progression': {
    name: 'Front Lever Progression', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, targets: [{ muscle: 'Abs', effectiveness: 0.20 }],
  },
  'Dead Hang': {
    name: 'Dead Hang', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, targets: [{ muscle: 'Abs', effectiveness: 0.15 }],
  },
  // ── FOREARMS ──
  'Wrist Flexion & Extension Superset': {
    name: 'Wrist Flexion & Extension Superset', rat: [0.20, 0.30, 0.42, 0.60, 0.80], upper: true,
    targets: [{ muscle: 'Forearms', effectiveness: 1.0 }],
  },
};

// Core-move rep targets (performing this many reps/hold = ~50th percentile).
export const CORE_TARGETS: Record<string, number> = {
  'Cable Crunches': 20,
  'Oblique Side Switches': 25,
  'Floor Crunches / Hanging Knee Raises': 20,
  'Front Lever Progression': 5,
  'Dead Hang': 30,
};

// ─── Profile math (weight / height / age) ──────────────────
export function bodyMassIndex(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  if (h <= 0) return 22;
  return weightKg / (h * h);
}

// Age coefficient (powerlifting-derived). Under 40 = 1.0.
export function ageCoefficient(age: number): number {
  if (age < 40) return 1.0;
  if (age < 50) return 0.93;
  if (age < 60) return 0.82;
  if (age < 70) return 0.72;
  return 0.62;
}

// BMI leverage factor: taller/lower-BMI lifters have longer limbs, so a
// given ×bodyweight load is relatively harder on upper-body compression
// moves (presses/rows/curls). Higher BMI (more mass per height) → wider.
export function bmiLeverage(bmi: number, upper: boolean): number {
  const strength = upper ? 0.006 : 0.003;
  return 1 + strength * (bmi - 23);
}

export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

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
        const std = EXERCISE_STANDARDS[exerciseName];
        const e1rm = std?.isCore ? set.reps : epley1RM(set.weightKg, set.reps);
        const candidate: BestLog = {
          weightKg: set.weightKg || 0,
          reps: set.reps || 0,
          holdSeconds: 0,
          e1RM: e1rm,
          dateKey,
        };
        if (!best || candidate.e1RM > best.e1RM) best = candidate;
      }
    }
  }
  return best;
}

// ─── Per-exercise percentile (0-100) ───────────────────────
// For loaded moves the lifter's bodyweight-ratio (e1RM ÷ bodyweight) is
// interpolated between the five real tier ratios (Beginner 5th / Novice
// 20th / Intermediate 50th / Advanced 80th / Elite 95th percentile).
// For bodyweight/core moves it is scaled by reps against a rep target.
export function exercisePercentile(
  exerciseName: string,
  best: BestLog | null,
  profile: AthleteProfile,
): number {
  const std = EXERCISE_STANDARDS[exerciseName];
  if (!std || !best) return 0;

  if (std.isCore) {
    const target = CORE_TARGETS[exerciseName] ?? 1;
    const pct = (best.reps / target) * 50; // ~ target reps = 50th percentile
    return Math.max(0, Math.min(100, pct));
  }

  const e1rm = best.e1RM;
  if (e1rm <= 0 || profile.bodyWeightKg <= 0) return 0;
  const rel = e1rm / profile.bodyWeightKg;
  const bmi = bodyMassIndex(profile.bodyWeightKg, profile.heightCm);
  const leverage = bmiLeverage(bmi, std.upper);
  const age = ageCoefficient(profile.age);
  const adjusted = rel * leverage * age;

  // Anchor ratios -> percentile. Tier anchors map to the percentiles that
  // Strength Level uses for each label.
  const anchors: [number, number][] = [
    [std.rat[0], 5],   // Beginner
    [std.rat[1], 20],  // Novice
    [std.rat[2], 50],  // Intermediate
    [std.rat[3], 80],  // Advanced
    [std.rat[4], 95],  // Elite
  ];
  return Math.max(0, Math.min(100, interpolate(adjusted, anchors)));
}

// Piecewise-linear interpolation between (ratio -> percentile) anchor points.
export function interpolate(x: number, anchors: [number, number][]): number {
  if (x <= anchors[0][0]) {
    const [x0, y0] = anchors[0];
    const [x1, y1] = anchors[1];
    // Extrapolate below the first anchor using the first segment slope.
    if (x1 - x0 === 0) return y0;
    return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  for (let i = 1; i < anchors.length; i++) {
    const [xa, ya] = anchors[i - 1];
    const [xb, yb] = anchors[i];
    if (x <= xb) {
      if (xb - xa === 0) return ya;
      return ya + ((x - xa) / (xb - xa)) * (yb - ya);
    }
  }
  // Above the last anchor, extrapolate using the final segment slope.
  const [xN1, yN1] = anchors[anchors.length - 2];
  const [xN, yN] = anchors[anchors.length - 1];
  if (xN - xN1 === 0) return yN;
  return yN + ((x - xN) / (xN - xN1)) * (yN - yN1);
}

// Resolve a percentile to a TierInfo (unified 7-tier palette).
export function tierFromPercentileInfo(pct: number): TierInfo {
  const t = tierFromPercentile(pct);
  return SCIENTIFIC_TIERS[Math.max(0, Math.min(t.level, SCIENTIFIC_TIERS.length - 1))];
}

// ─── Composite muscle score (weighted, includes every exercise) ──
export interface MuscleScoreResult {
  muscle: MuscleGroup;
  score: number; // 0-100
  tier: TierInfo;
  contributions: {
    exercise: string;
    pct: number;
    effectiveness: number;
    bestLoad: number;
    bestReps: number;
    e1RM: number;
  }[];
}

export function computeMuscleScores(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
  profile: AthleteProfile,
  now: Date = new Date(),
): MuscleScoreResult[] {
  const acc = new Map<MuscleGroup, { total: number; weight: number; contributions: MuscleScoreResult['contributions'] }>();
  const addTo = (muscle: MuscleGroup, pct: number, effectiveness: number, item: Omit<MuscleScoreResult['contributions'][number], 'pct' | 'effectiveness'>) => {
    const e = acc.get(muscle) ?? { total: 0, weight: 0, contributions: [] };
    e.total += pct * effectiveness;
    e.weight += effectiveness;
    e.contributions.push({ ...item, pct, effectiveness });
    acc.set(muscle, e);
  };

  for (const [exerciseName, std] of Object.entries(EXERCISE_STANDARDS)) {
    const best = bestLogForExercise(workoutData, userId, exerciseName, now);
    if (!best) continue; // only performed exercises factor in (no dilution)
    const pct = exercisePercentile(exerciseName, best, profile);
    for (const t of std.targets) {
      addTo(t.muscle, pct, t.effectiveness, {
        exercise: exerciseName,
        bestLoad: best.weightKg,
        bestReps: best.reps,
        e1RM: best.e1RM,
      });
    }
  }

  const order: MuscleGroup[] = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Hamstrings',
    'Calves', 'Abs', 'Core', 'Forearms', 'Abductors', 'Adductors',
  ];

  return order.map((muscle) => {
    const e = acc.get(muscle);
    const score = e && e.weight > 0 ? e.total / e.weight : 0;
    return {
      muscle,
      score: Math.round(score * 10) / 10,
      tier: tierFromPercentileInfo(score),
      contributions: e?.contributions ?? [],
    };
  });
}
