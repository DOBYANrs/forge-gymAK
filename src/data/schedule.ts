import type { DaySchedule, DayOfWeek } from '../types';

export const WEEKLY_SCHEDULE: DaySchedule[] = [
  {
    dayOfWeek: 'monday',
    label: 'Monday',
    muscleGroups: ['Chest A', 'Shoulders A', 'Biceps A'],
    focus: 'Upper/Mid Chest, Anterior/Lateral Delts, Bicep Peak',
    isRestDay: false,
    exercises: [
      { name: 'Incline Chest Press', pattern: 'normal', defaultSets: 3, targetReps: '8–10', restSeconds: 120 },
      { name: 'Yellow Machine Chest Press', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Cable Fly', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60, notes: 'Squeeze & Stretch' },
      { name: 'Overhead Press', pattern: 'normal', defaultSets: 3, targetReps: '8–10', restSeconds: 120 },
      { name: 'Biceps Curl', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Spider Curl', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 'tuesday',
    label: 'Tuesday',
    muscleGroups: ['Back A', 'Legs A (Quad Focus)', 'Abs A'],
    focus: 'Lat Width, Mid-Back, Quads (Low-Glute Focus), Core',
    isRestDay: false,
    exercises: [
      { name: 'Pull Up', pattern: 'normal', defaultSets: 3, targetReps: '6–10', restSeconds: 120 },
      { name: '1-Hand Lat Pulldown', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Row Machine Var 1', pattern: 'normal', defaultSets: 3, targetReps: '8–10', restSeconds: 90 },
      { name: 'Low-Foot Placement Leg Press', pattern: 'normal', defaultSets: 4, targetReps: '10–12', restSeconds: 120, notes: 'Feet low/close to target quads' },
      { name: 'Leg Extension', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 90 },
      { name: 'Cable Crunches', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
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
    muscleGroups: ['Back B', 'Chest B', 'Abs B'],
    focus: 'Lat Thickness, Lower/Overall Chest, Obliques',
    isRestDay: false,
    exercises: [
      { name: 'Row Machine Var 2', pattern: 'normal', defaultSets: 3, targetReps: '8–10', restSeconds: 90 },
      { name: 'Front Lever (or Progression)', pattern: 'normal', defaultSets: 3, targetReps: 'Hold/Failure', restSeconds: 120 },
      { name: 'Lower Chest Cable Pulldown', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Cable Fly', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60, notes: 'High-to-Low or Flat' },
      { name: 'Dig Up', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90 },
      { name: 'Leg Side-to-Side / Obliques', pattern: 'normal', defaultSets: 3, targetReps: '15 per side', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 'friday',
    label: 'Friday',
    muscleGroups: ['Shoulders B', 'Triceps', 'Biceps B', 'Forearms'],
    focus: 'Complete Arm Isolation, Brachialis, Tricep Long Head',
    isRestDay: false,
    exercises: [
      { name: 'Archer', pattern: 'normal', defaultSets: 3, targetReps: '8–10 per side', restSeconds: 90 },
      { name: 'Face Pulls', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Triceps Overhead Extension', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90, notes: 'Long Head' },
      { name: 'Triceps Push Down', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60, notes: 'Lateral Head' },
      { name: 'Cable Curl / Hammer Cable Curl', pattern: 'normal', defaultSets: 3, targetReps: '10–12', restSeconds: 90, notes: 'Brachialis & Biceps' },
      { name: 'Spider Curl', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Wrist Flexion', pattern: 'normal', defaultSets: 3, targetReps: '15–20', restSeconds: 45 },
      { name: 'Reverse Wrist Curl (Extension)', pattern: 'normal', defaultSets: 3, targetReps: '15–20', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 'saturday',
    label: 'Saturday',
    muscleGroups: ['Legs B (Hamstring/Hip)', 'Calves', 'Abs C'],
    focus: 'Posterior Chain, Adductors, Calves, Lower Core',
    isRestDay: false,
    exercises: [
      { name: 'Hamstring Curl', pattern: 'normal', defaultSets: 4, targetReps: '10–12', restSeconds: 90 },
      { name: 'Abduction Machine', pattern: 'normal', defaultSets: 3, targetReps: '12–15', restSeconds: 60 },
      { name: 'Calf Raise', pattern: 'normal', defaultSets: 4, targetReps: '15–20', restSeconds: 60, notes: 'Pause at peak contraction' },
      { name: 'Dead Hang', pattern: 'normal', defaultSets: 3, targetReps: 'Failure', restSeconds: 0, notes: 'Grip & Spinal Decompression' },
      { name: 'Standard Floor Crunches / Hanging Knee Raises', pattern: 'normal', defaultSets: 3, targetReps: '15–20', restSeconds: 60 },
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
