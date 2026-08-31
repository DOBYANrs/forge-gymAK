import type { DaySchedule, DayOfWeek } from '../types';

export const WEEKLY_SCHEDULE: DaySchedule[] = [
  {
    dayOfWeek: 'monday',
    label: 'Monday',
    muscleGroups: ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps'],
    focus: 'Heavy Compounds — Upper Body Strength',
    isRestDay: false,
    exercises: [
      { name: 'Incline Chest Press', pattern: 'normal', defaultSets: 4, targetReps: '6–8', restSeconds: 120 },
      { name: 'Cable Fly', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Lat Pulldown', pattern: 'normal', defaultSets: 4, targetReps: '6–8', restSeconds: 120 },
      { name: 'Overhead Press', pattern: 'normal', defaultSets: 3, targetReps: '6–8', restSeconds: 120 },
      { name: 'Row Machine 2 Var 2', pattern: 'normal', defaultSets: 4, targetReps: '8–10', restSeconds: 90 },
      { name: 'Triceps Push Down', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 60 },
      { name: 'Spider Curl', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 'tuesday',
    label: 'Tuesday',
    muscleGroups: ['Quads', 'Hamstrings', 'Calves', 'Abs'],
    focus: 'Heavy Legs — Quad & Hamstring Strength',
    isRestDay: false,
    exercises: [
      { name: 'Low-Foot Placement Leg Press', pattern: 'normal', defaultSets: 4, targetReps: '6–10', restSeconds: 120, notes: 'Feet low/close to target quads' },
      { name: 'Hamstring Curl', pattern: 'normal', defaultSets: 4, targetReps: '8–10', restSeconds: 90 },
      { name: 'Leg Extension', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Calf Raise', pattern: 'normal', defaultSets: 4, targetReps: '10–15', restSeconds: 60 },
      { name: 'Cable Crunches', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Oblique Side Switches', pattern: 'normal', defaultSets: 3, targetReps: '30', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 'wednesday',
    label: 'Wednesday',
    muscleGroups: ['Rest'],
    isRestDay: true,
    exercises: [],
  },
  {
    dayOfWeek: 'thursday',
    label: 'Thursday',
    muscleGroups: ['Back', 'Shoulders', 'Core'],
    focus: 'Pull & Push — Back Thickness, Shoulders, Core',
    isRestDay: false,
    exercises: [
      { name: 'Pull Down', pattern: 'normal', defaultSets: 4, targetReps: '10–12', restSeconds: 90 },
      { name: 'Row Machine 1 Var 2', pattern: 'normal', defaultSets: 4, targetReps: '10–12', restSeconds: 90 },
      { name: '1-Hand Lat Pulldown', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 75 },
      { name: 'Overhead Press', pattern: 'normal', defaultSets: 3, targetReps: '8–10', restSeconds: 120 },
      { name: 'Archer Pull', pattern: 'normal', defaultSets: 3, targetReps: '8–10', restSeconds: 90 },
      { name: 'Face Pulls', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Front Lever Progression', pattern: 'normal', defaultSets: 3, targetReps: 'Hold/Failure', restSeconds: 120 },
      { name: 'Dead Hang', pattern: 'normal', defaultSets: 3, targetReps: 'Failure', restSeconds: 75, notes: 'Grip & Spinal Decompression' },
    ],
  },
  {
    dayOfWeek: 'friday',
    label: 'Friday',
    muscleGroups: ['Quads', 'Hamstrings', 'Calves', 'Abs'],
    focus: 'Leg Hypertrophy — High Rep, Adductors, Calves, Core',
    isRestDay: false,
    exercises: [
      { name: 'Leg Extension', pattern: 'normal', defaultSets: 4, targetReps: '12–15', restSeconds: 90 },
      { name: 'Hamstring Curl', pattern: 'normal', defaultSets: 4, targetReps: '12–15', restSeconds: 90 },
      { name: 'Low-Foot Leg Press', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 90 },
      { name: 'Abduction Machine', pattern: 'normal', defaultSets: 3, targetReps: '15–20', restSeconds: 60 },
      { name: 'Calf Raise', pattern: 'normal', defaultSets: 4, targetReps: '15–20', restSeconds: 60, notes: 'Pause at peak contraction' },
      { name: 'Floor Crunches / Hanging Knee Raises', pattern: 'normal', defaultSets: 3, targetReps: '15–20', restSeconds: 60 },
      { name: 'Oblique Side Switches', pattern: 'normal', defaultSets: 3, targetReps: '30', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 'saturday',
    label: 'Saturday',
    muscleGroups: ['Chest', 'Triceps', 'Biceps', 'Forearms'],
    focus: 'Chest & Arms — Isolation & Hypertrophy',
    isRestDay: false,
    exercises: [
      { name: 'Yellow Machine Chest Press', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Lower Chest Cable Pulldown', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Cable Fly 55 Degree', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Triceps Push Down', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Triceps Overhead Extension', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 75, notes: 'Long Head' },
      { name: 'Spider Curl', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Biceps Curl / Cable Curl', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 60 },
      { name: 'Wrist Flexion & Extension Superset', pattern: 'normal', defaultSets: 3, targetReps: '15–20', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 'sunday',
    label: 'Sunday',
    muscleGroups: ['Rest'],
    isRestDay: true,
    exercises: [],
  },
];

export const DAY_OF_WEEK_MAP: Record<string, string> = {
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
};

export function getDaySchedule(date: Date): DaySchedule {
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const days: DayOfWeek[] = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday',
  ];
  const dayOfWeek = days[dayIndex];
  return WEEKLY_SCHEDULE.find((s) => s.dayOfWeek === dayOfWeek) ?? WEEKLY_SCHEDULE[0];
}

export function getWeekDateRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}
