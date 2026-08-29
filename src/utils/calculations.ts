import type { ExerciseLog, ProgressData } from '../types';

// Epley formula: 1RM = Weight × (1 + Reps / 30)
export function calculate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// Best 1RM from all sets in an exercise
export function calculateExercise1RM(exercise: ExerciseLog): number {
  let best = 0;
  for (const set of exercise.sets) {
    if (set.weightKg > 0 && set.reps > 0) {
      const rm = calculate1RM(set.weightKg, set.reps);
      if (rm > best) best = rm;
    }
  }
  return best;
}

export function calculateVolume(exercise: ExerciseLog): number {
  return exercise.sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
}

export function calculateMaxWeight(exercise: ExerciseLog): number {
  if (exercise.sets.length === 0) return 0;
  return Math.max(...exercise.sets.map((s) => s.weightKg));
}

export function calculateTotalReps(exercise: ExerciseLog): number {
  return exercise.sets.reduce((sum, set) => sum + set.reps, 0);
}

export function calculateExerciseProgress(exercise: ExerciseLog): ProgressData {
  return {
    maxWeight: calculateMaxWeight(exercise),
    totalReps: calculateTotalReps(exercise),
    totalVolume: calculateVolume(exercise),
    dateKey: '',
  };
}

export function aggregateMuscleGroupVolume(
  exercises: ExerciseLog[],
  exerciseMuscleMap: Record<string, string[]>
): { muscleGroup: string; volume: number }[] {
  const volumeMap: Record<string, number> = {};

  for (const exercise of exercises) {
    const volume = calculateVolume(exercise);
    const groups = exerciseMuscleMap[exercise.exerciseName] ?? ['Other'];
    for (const group of groups) {
      volumeMap[group] = (volumeMap[group] ?? 0) + volume;
    }
  }

  return Object.entries(volumeMap)
    .map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
    .sort((a, b) => b.volume - a.volume);
}

export const EXERCISE_MUSCLE_MAP: Record<string, string[]> = {
  // Monday: Chest A + Shoulders A + Biceps A
  'Incline Chest Press': ['Chest', 'Shoulders'],
  'Yellow Machine Chest Press': ['Chest'],
  'Cable Fly': ['Chest'],
  'Overhead Press': ['Shoulders'],
  'Biceps Curl': ['Biceps'],
  'Spider Curl': ['Biceps'],
  // Tuesday: Back A + Legs A + Abs A
  'Pull Up': ['Back', 'Biceps'],
  '1-Hand Lat Pulldown': ['Back'],
  'Row Machine Var 1': ['Back'],
  'Low-Foot Placement Leg Press': ['Legs'],
  'Leg Extension': ['Legs'],
  'Cable Crunches': ['Abs'],
  // Thursday: Back B + Chest B + Abs B
  'Row Machine Var 2': ['Back'],
  'Front Lever (or Progression)': ['Back', 'Core'],
  'Lower Chest Cable Pulldown': ['Chest'],
  'Dig Up': ['Chest', 'Shoulders'],
  'Leg Side-to-Side / Obliques': ['Abs'],
  // Friday: Shoulders B + Triceps + Biceps B + Forearms
  'Archer': ['Chest', 'Shoulders'],
  'Face Pulls': ['Shoulders', 'Back'],
  'Triceps Overhead Extension': ['Triceps'],
  'Triceps Push Down': ['Triceps'],
  'Cable Curl / Hammer Cable Curl': ['Biceps', 'Forearms'],
  'Wrist Flexion': ['Forearms'],
  'Reverse Wrist Curl (Extension)': ['Forearms'],
  // Saturday: Legs B + Calves + Abs C
  'Hamstring Curl': ['Legs'],
  'Abduction Machine': ['Legs'],
  'Calf Raise': ['Legs'],
  'Dead Hang': ['Back', 'Forearms'],
  'Standard Floor Crunches / Hanging Knee Raises': ['Abs'],
  // Legacy exercises
  'Bench Press': ['Chest', 'Shoulders'],
  'Incline Dumbbell Press': ['Chest', 'Shoulders'],
  'Incline Bench Press': ['Chest', 'Shoulders'],
  'Dumbbell Flyes': ['Chest'],
  'Push-Ups': ['Chest', 'Shoulders'],
  'Shoulder Press': ['Shoulders'],
  'Lateral Raises': ['Shoulders'],
  'Face Pull': ['Shoulders', 'Back'],
  'Barbell Row': ['Back'],
  'T-Bar Row': ['Back'],
  'Lat Pulldown': ['Back'],
  'Pull-Ups': ['Back'],
  'Deadlift': ['Back', 'Legs'],
  'Barbell Curl': ['Biceps'],
  'Hammer Curl': ['Biceps', 'Forearms'],
  'Preacher Curl': ['Biceps'],
  'Tricep Pushdown': ['Triceps'],
  'Skull Crushers': ['Triceps'],
  'Overhead Tricep Extension': ['Triceps'],
  'Wrist Curl': ['Forearms'],
  'Squat': ['Legs'],
  'Romanian Deadlift': ['Legs', 'Back'],
  'Leg Press': ['Legs'],
  'Leg Curl': ['Legs'],
  'Calf Raises': ['Legs'],
};
