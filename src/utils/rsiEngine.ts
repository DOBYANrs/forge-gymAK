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
  // Composite blend weight by exercise class (per scoring doc):
  //   compound lift 1.0, machine isolation 0.7, endurance hold 0.8.
  // Machine/higher-rep isolation work counts less toward a muscle's
  // composite than a pure compound lift so machine rows don't inflate Back
  // as much as free-weight pulls etc. Defaults to 1.0.
  scoreWeight?: number;
}

export const EXERCISE_STANDARDS: Record<string, ExerciseStandard> = {
  // ── CHEST ──
  // Bench Press family: 1RM/BW ratio from Strength Level (150M+ logged lifts).
  // Machine variant (Yellow Machine Chest Press) scaled ×0.85 per document.
  'Incline Chest Press': {
    name: 'Incline Chest Press', rat: [0.40, 0.50, 1.00, 1.25, 1.50], upper: true,
    targets: [{ muscle: 'Chest', effectiveness: 0.40 }],
  },
  'Yellow Machine Chest Press': {
    name: 'Yellow Machine Chest Press', rat: [0.34, 0.43, 0.85, 1.06, 1.28], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Chest', effectiveness: 0.20 }],
  },
  'Cable Fly': {
    name: 'Cable Fly', rat: [0.08, 0.13, 0.25, 0.40, 0.55], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Chest', effectiveness: 0.15 }],
  },
  'Cable Fly 55 Degree': {
    name: 'Cable Fly 55 Degree', rat: [0.08, 0.13, 0.25, 0.40, 0.55], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Chest', effectiveness: 0.15 }],
  },
  'Lower Chest Cable Pulldown': {
    name: 'Lower Chest Cable Pulldown', rat: [0.10, 0.16, 0.30, 0.48, 0.65], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Chest', effectiveness: 0.25 }],
  },
  // ── BACK (vertical pull) ──
  // Lat Pulldown: 1RM/BW ratio from Strength Level.
  'Lat Pulldown': {
    name: 'Lat Pulldown', rat: [0.40, 0.50, 0.75, 1.00, 1.50], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Back', effectiveness: 0.35 }],
  },
  'Pull Down': {
    name: 'Pull Down', rat: [0.40, 0.50, 0.75, 1.00, 1.50], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Back', effectiveness: 0.35 }],
  },
  '1-Hand Lat Pulldown': {
    name: '1-Hand Lat Pulldown', rat: [0.40, 0.60, 0.80, 1.20, 1.40], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Back', effectiveness: 0.30 }],
  },
  'Pull Up': {
    name: 'Pull Up', rat: [0.75, 1.00, 1.25, 1.50, 1.75], upper: true, scoreWeight: 1.0,
    targets: [{ muscle: 'Back', effectiveness: 0.35 }],
  },
  // ── BACK (horizontal / upper-mid row) ──
  'Row Machine 2 Var 2': {
    name: 'Row Machine 2 Var 2', rat: [0.40, 0.50, 0.70, 0.95, 1.25], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Back', effectiveness: 0.40 }],
  },
  'Row Machine 1 Var 2': {
    name: 'Row Machine 1 Var 2', rat: [0.40, 0.50, 0.70, 0.95, 1.25], upper: true, scoreWeight: 0.7,
    targets: [
      { muscle: 'Back', effectiveness: 0.40 },
      { muscle: 'Shoulders', effectiveness: 0.15 },
    ],
  },
  'Archer Pull': {
    name: 'Archer Pull', rat: [0.30, 0.45, 0.65, 0.90, 1.10], upper: true, scoreWeight: 0.7,
    targets: [
      { muscle: 'Back', effectiveness: 0.20 },
      { muscle: 'Shoulders', effectiveness: 0.30 },
    ],
  },
  'Bent-Over Dumbbell Reverse Fly': {
    name: 'Bent-Over Dumbbell Reverse Fly', rat: [0.30, 0.45, 0.65, 0.90, 1.10], upper: true, scoreWeight: 0.7,
    targets: [
      { muscle: 'Shoulders', effectiveness: 0.30 },
      { muscle: 'Back', effectiveness: 0.20 },
    ],
  },
  // ── SHOULDERS ──
  // Overhead Press (barbell/dumbbell/machine): 1RM/BW ratio from Strength Level.
  'Overhead Press': {
    name: 'Overhead Press', rat: [0.35, 0.40, 0.60, 0.85, 1.10], upper: true,
    targets: [{ muscle: 'Shoulders', effectiveness: 0.50 }],
  },
  'Face Pulls': {
    name: 'Face Pulls', rat: [0.20, 0.30, 0.45, 0.65, 0.85], upper: true, scoreWeight: 0.7,
    targets: [
      { muscle: 'Shoulders', effectiveness: 0.20 },
      { muscle: 'Back', effectiveness: 0.10 },
    ],
  },
  'Lateral Raise': {
    name: 'Lateral Raise', rat: [0.15, 0.22, 0.32, 0.45, 0.60], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Shoulders', effectiveness: 0.30 }],
  },
  // ── LEGS (quad/glute) ──
  // Squat-proxy (Leg Press): 1RM/BW from Strength Level 50th-95th.
  // Elite endpoint extended to 3.00 to accommodate heavy leg-press users
  // (e.g. 160kg×5 at 77kg BW → ratio 2.42 = Advanced, not Legendary).
  'Low-Foot Placement Leg Press': {
    name: 'Low-Foot Placement Leg Press', rat: [0.60, 0.75, 1.25, 2.25, 3.00], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Legs', effectiveness: 0.40 }],
  },
  'Low-Foot Leg Press': {
    name: 'Low-Foot Leg Press', rat: [0.60, 0.75, 1.25, 2.25, 3.00], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Legs', effectiveness: 0.40 }],
  },
  'Leg Press': {
    name: 'Leg Press', rat: [0.60, 0.75, 1.25, 2.25, 3.00], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Legs', effectiveness: 0.40 }],
  },
  'Leg Extension': {
    name: 'Leg Extension', rat: [0.40, 0.50, 0.80, 1.20, 1.60], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Legs', effectiveness: 0.30 }],
  },
  // ── HAMSTRINGS ──
  // Leg Curl (prone/seated): 1RM/BW ratio from Strength Level.
  'Hamstring Curl': {
    name: 'Hamstring Curl', rat: [0.50, 0.75, 1.00, 1.50, 2.00], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Hamstrings', effectiveness: 0.50 }],
  },
  'Leg Curl': {
    name: 'Leg Curl', rat: [0.50, 0.75, 1.00, 1.50, 2.00], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Hamstrings', effectiveness: 0.50 }],
  },
  // ── ADDUCTORS (inner thigh) ──
  // Hip Adduction Machine: relaxed thresholds — machine shows total weight
  // (both pads combined) so the logged ratio is higher than per-leg standards
  // assume. Calibrated: 40kg x 15 (rel ≈0.95) → Intermediate (~38th pct).
  'Adduction Machine': {
    name: 'Adduction Machine', rat: [0.55, 0.75, 1.10, 1.40, 1.75], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Adductors', effectiveness: 1.0 }],
  },
  // Legacy name for the same machine — still scored as inner-thigh adductors.
  'Abduction Machine': {
    name: 'Abduction Machine', rat: [0.55, 0.75, 1.10, 1.40, 1.75], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Adductors', effectiveness: 1.0 }],
  },
  // ── BICEPS ──
  // Dumbbell / Cable Curl family: 1RM/BW ratio aligned with the Triceps scale
  // (Isolation strength ~ comparable to triceps push-down, slightly lower).
  // Previous standard made Intermediate trivially easy (0.15) which inflated
  // Biceps composite way above Triceps — corrected to ~Intermediate for
  // 20kg×12 @ ~62kg. Spider Curl example: 20×12 → rel 0.446 → Intermediate.
  'Spider Curl': {
    name: 'Spider Curl', rat: [0.20, 0.35, 0.55, 0.80, 1.10], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Biceps', effectiveness: 0.40 }],
  },
  'Biceps Curl / Cable Curl': {
    name: 'Biceps Curl / Cable Curl', rat: [0.18, 0.30, 0.50, 0.75, 1.00], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Biceps', effectiveness: 0.30 }],
  },
  // ── TRICEPS ──
  'Triceps Push Down': {
    name: 'Triceps Push Down', rat: [0.25, 0.45, 0.70, 1.05, 1.40], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Triceps', effectiveness: 0.40 }],
  },
  'Triceps Overhead Extension': {
    name: 'Triceps Overhead Extension', rat: [0.22, 0.40, 0.65, 0.95, 1.25], upper: true, scoreWeight: 0.7,
    targets: [{ muscle: 'Triceps', effectiveness: 0.30 }],
  },
  // ── CALVES ──
  'Calf Raise': {
    name: 'Calf Raise', rat: [0.50, 1.00, 1.50, 2.25, 3.25], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Calves', effectiveness: 0.50 }],
  },
  'Standing Calf Raise': {
    // The logged load already includes the lifter's bodyweight (they add it),
    // so it is scored as-is. Calibrated: 102kg (62.8 bw + ~40 barbell) x 20
    // (rel ≈2.7) → Intermediate (~40th pct).
    name: 'Standing Calf Raise', rat: [1.50, 2.10, 3.10, 4.00, 5.00], upper: false, scoreWeight: 0.7,
    targets: [{ muscle: 'Calves', effectiveness: 0.50 }],
  },
  // ── CORE / ABS (bodyweight -> scored by reps) ──
  'Cable Crunches': {
    name: 'Cable Crunches', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, scoreWeight: 0.8, targets: [{ muscle: 'Abs', effectiveness: 0.25 }],
  },
  'Oblique Side Switches': {
    name: 'Oblique Side Switches', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, scoreWeight: 0.8, targets: [{ muscle: 'Abs', effectiveness: 0.15 }],
  },
  'Floor Crunches / Hanging Knee Raises': {
    name: 'Floor Crunches / Hanging Knee Raises', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, scoreWeight: 0.8, targets: [{ muscle: 'Abs', effectiveness: 0.25 }],
  },
  'Front Lever Progression': {
    name: 'Front Lever Progression', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, scoreWeight: 0.8, targets: [{ muscle: 'Abs', effectiveness: 0.20 }],
  },
  'Dead Hang': {
    name: 'Dead Hang', rat: [0, 0, 0, 0, 0], upper: false, isCore: true, scoreWeight: 0.8, targets: [{ muscle: 'Forearms', effectiveness: 0.25 }],
  },
  // ── FOREARMS ──
  'Wrist Flexion & Extension Superset': {
    name: 'Wrist Flexion & Extension Superset', rat: [0.20, 0.30, 0.42, 0.60, 0.80], upper: true, scoreWeight: 0.7,
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

// Time-based bodyweight-hold exercises, scored by held seconds (the logged
// "reps" value for these is really seconds). Percentile anchors:
//   <10s Untrained · 30s Intermediate · 60s Upper-Intermediate ·
//   90s Advanced · 120s Highly Advanced · 180s+ Legendary/Elite.
export const TIME_ANCHORS: Record<string, [number, number][]> = {
  'Dead Hang': [
    [10, 10],   // ~Beginner
    [30, 25],   // Intermediate
    [60, 50],   // Upper-Intermediate
    [90, 70],   // Advanced
    [120, 85],  // Highly Advanced
    [180, 95],  // Legendary / Elite
  ],
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
  _now: Date = new Date(),
): BestLog | null {
  // Lifetime lookup: consider the user's ALL-time training history (not just the
  // last 30 days) so muscles trained weeks/months ago still score and show on the
  // muscle heatmap. The `now` argument is kept for API compatibility but ignored.
  void _now; // eslint-disable-line no-unused-vars
  const userData = workoutData[userId] ?? {};
  let best: BestLog | null = null;

  for (const [dateKey, day] of Object.entries(userData)) {
    if (!day?.exercises) continue;

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
    // Bodyweight-hold exercises are scored by held TIME (seconds), not reps.
    const timeAnchors = TIME_ANCHORS[exerciseName];
    if (timeAnchors) {
      return Math.max(0, Math.min(100, interpolate(best.reps, timeAnchors)));
    }
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
  const addTo = (muscle: MuscleGroup, pct: number, effectiveness: number, blendWeight: number, item: Omit<MuscleScoreResult['contributions'][number], 'pct' | 'effectiveness'>) => {
    const eff = effectiveness * blendWeight;
    const e = acc.get(muscle) ?? { total: 0, weight: 0, contributions: [] };
    e.total += pct * eff;
    e.weight += eff;
    e.contributions.push({ ...item, pct, effectiveness });
    acc.set(muscle, e);
  };

  for (const [exerciseName, std] of Object.entries(EXERCISE_STANDARDS)) {
    const best = bestLogForExercise(workoutData, userId, exerciseName, now);
    if (!best) continue; // only performed exercises factor in (no dilution)
    const pct = exercisePercentile(exerciseName, best, profile);
    // Blend weight: compound 1.0, machine isolation 0.7, endurance 0.8.
    const blend = std.scoreWeight ?? 1.0;
    for (const t of std.targets) {
      addTo(t.muscle, pct, t.effectiveness, blend, {
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
