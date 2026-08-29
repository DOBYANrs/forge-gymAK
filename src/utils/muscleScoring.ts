import type { ExerciseLog, UserId } from '../types';
import { calculate1RM } from './calculations';

// ============================================================
// BASELINE MULTIPLIERS (Strength Normalization)
// These normalize 1RM across different muscle group sizes
// ============================================================
const BASELINE_MULTIPLIERS: Record<string, number> = {
  'Quads': 3.0,
  'Hamstrings': 1.5,
  'Calves': 1.0,
  'Chest': 1.2,
  'Back': 1.2,
  'Lats': 1.2,
  'Shoulders': 0.8,
  'Biceps': 0.4,
  'Triceps': 0.4,
  'Forearms': 0.3,
  'Abs': 0.3,
  'Core': 0.3,
};

// Target focus weight: 1.0 for primary, 0.5 for secondary
const FOCUS_WEIGHT: Record<string, number> = {
  'Chest': 1.0,
  'Back': 1.0,
  'Quads': 1.0,
  'Hamstrings': 1.0,
  'Calves': 0.5,
  'Shoulders': 1.0,
  'Biceps': 1.0,
  'Triceps': 1.0,
  'Abs': 1.0,
  'Core': 1.0,
  'Forearms': 0.5,
  'Lats': 0.5,
};

// ============================================================
// TIER SYSTEM
// ============================================================
export interface TierInfo {
  name: string;
  minScore: number;
  color: string;
  glow: string;
  cssGlow: string;
}

export const TIERS: TierInfo[] = [
  { name: 'Beginner',     minScore: 0,    color: '#4A4E5D', glow: 'None',                  cssGlow: 'none' },
  { name: 'Novice',       minScore: 250,  color: '#00E676', glow: 'Soft Green Glow',       cssGlow: '0 0 12px rgba(0,230,118,0.4)' },
  { name: 'Intermediate', minScore: 500,  color: '#00E5FF', glow: 'Cyan Glow',             cssGlow: '0 0 14px rgba(0,229,255,0.4)' },
  { name: 'Advanced',     minScore: 1000, color: '#A855F7', glow: 'Violet Pulse',          cssGlow: '0 0 16px rgba(168,85,247,0.5)' },
  { name: 'Elite',        minScore: 2000, color: '#FFB300', glow: 'Gold Aura',             cssGlow: '0 0 18px rgba(255,179,0,0.5)' },
  { name: 'Legendary',    minScore: 4000, color: '#FF1744', glow: 'Red Particle Glow',     cssGlow: '0 0 20px rgba(255,23,68,0.6)' },
];

export function getTier(score: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].minScore) return TIERS[i];
  }
  return TIERS[0];
}

// ============================================================
// LIFETIME MUSCLE SCORE CALCULATION
// ============================================================

// Map exercise names to muscle groups for scoring
const EXERCISE_MUSCLE_TARGET: Record<string, { primary: string[]; secondary: string[] }> = {
  // Monday: Chest A + Shoulders A + Biceps A
  'Incline Chest Press': { primary: ['Chest'], secondary: ['Shoulders'] },
  'Yellow Machine Chest Press': { primary: ['Chest'], secondary: [] },
  'Cable Fly': { primary: ['Chest'], secondary: ['Shoulders'] },
  'Overhead Press': { primary: ['Shoulders'], secondary: ['Chest'] },
  'Biceps Curl': { primary: ['Biceps'], secondary: ['Forearms'] },
  'Spider Curl': { primary: ['Biceps'], secondary: [] },
  // Tuesday: Back A + Legs A (Quad Focus) + Abs A
  'Pull Up': { primary: ['Back', 'Lats'], secondary: ['Biceps'] },
  '1-Hand Lat Pulldown': { primary: ['Lats', 'Back'], secondary: [] },
  'Row Machine Var 1': { primary: ['Back'], secondary: ['Biceps'] },
  'Low-Foot Placement Leg Press': { primary: ['Quads'], secondary: ['Hamstrings'] },
  'Leg Extension': { primary: ['Quads'], secondary: [] },
  'Cable Crunches': { primary: ['Abs', 'Core'], secondary: [] },
  // Thursday: Back B + Chest B + Abs B
  'Row Machine Var 2': { primary: ['Back'], secondary: ['Biceps'] },
  'Front Lever (or Progression)': { primary: ['Back', 'Core'], secondary: ['Abs'] },
  'Lower Chest Cable Pulldown': { primary: ['Chest'], secondary: ['Triceps'] },
  'Dig Up': { primary: ['Chest', 'Shoulders'], secondary: [] },
  'Leg Side-to-Side / Obliques': { primary: ['Abs', 'Core'], secondary: [] },
  // Friday: Shoulders B + Triceps + Biceps B + Forearms
  'Archer': { primary: ['Chest', 'Shoulders'], secondary: ['Triceps'] },
  'Face Pulls': { primary: ['Shoulders'], secondary: ['Back'] },
  'Triceps Overhead Extension': { primary: ['Triceps'], secondary: [] },
  'Triceps Push Down': { primary: ['Triceps'], secondary: [] },
  'Cable Curl / Hammer Cable Curl': { primary: ['Biceps'], secondary: ['Forearms'] },
  'Wrist Flexion': { primary: ['Forearms'], secondary: [] },
  'Reverse Wrist Curl (Extension)': { primary: ['Forearms'], secondary: [] },
  // Saturday: Legs B (Hamstring/Hip) + Calves + Abs C
  'Hamstring Curl': { primary: ['Hamstrings'], secondary: [] },
  'Abduction Machine': { primary: ['Hamstrings'], secondary: ['Quads'] },
  'Calf Raise': { primary: ['Calves'], secondary: [] },
  'Dead Hang': { primary: ['Back', 'Forearms'], secondary: [] },
  'Standard Floor Crunches / Hanging Knee Raises': { primary: ['Abs', 'Core'], secondary: [] },
};

export interface MuscleScore {
  muscle: string;
  score: number;
  tier: TierInfo;
  contributions: { exercise: string; oneRM: number; normalized: number }[];
}

/**
 * Calculate the normalized lifetime score for a single muscle group
 */
function calculateMuscleScore(
  muscle: string,
  exercises: ExerciseLog[],
): MuscleScore {
  const baseline = BASELINE_MULTIPLIERS[muscle] ?? 1.0;
  const focusWeight = FOCUS_WEIGHT[muscle] ?? 1.0;
  let totalScore = 0;
  const contributions: MuscleScore['contributions'] = [];

  for (const ex of exercises) {
    const target = EXERCISE_MUSCLE_TARGET[ex.exerciseName];
    if (!target) continue;

    const isPrimary = target.primary.includes(muscle);
    const isSecondary = target.secondary.includes(muscle);

    if (!isPrimary && !isSecondary) continue;

    const muscleFocusWeight = isPrimary ? focusWeight : focusWeight * 0.5;

    for (const set of ex.sets) {
      if (set.weightKg <= 0 || set.reps <= 0) continue;

      const est1RM = calculate1RM(set.weightKg, set.reps);
      const normalized = (est1RM / baseline) * muscleFocusWeight;

      totalScore += normalized;

      if (isPrimary) {
        contributions.push({
          exercise: ex.exerciseName,
          oneRM: est1RM,
          normalized: Math.round(normalized),
        });
      }
    }
  }

  const roundedScore = Math.round(totalScore);
  return {
    muscle,
    score: roundedScore,
    tier: getTier(roundedScore),
    contributions,
  };
}

/**
 * Calculate lifetime scores for ALL muscle groups from a user's workout history
 */
export function calculateAllMuscleScores(
  workoutData: Record<string, Record<string, { exercises: ExerciseLog[] } | undefined>>,
  userId: UserId,
): MuscleScore[] {
  const muscles = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Calves', 'Biceps', 'Triceps', 'Forearms', 'Abs'];
  const allExercises: ExerciseLog[] = [];

  // Gather ALL exercises from ALL time
  const userData = workoutData[userId] ?? {};
  for (const [, day] of Object.entries(userData)) {
    if (day?.exercises) {
      allExercises.push(...day.exercises);
    }
  }

  return muscles.map((muscle) => calculateMuscleScore(muscle, allExercises));
}

/**
 * Get the total lifetime score (sum of all muscles)
 */
export function getTotalLifetimeScore(scores: MuscleScore[]): number {
  return scores.reduce((sum, s) => sum + s.score, 0);
}
