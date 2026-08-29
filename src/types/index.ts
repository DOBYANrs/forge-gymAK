export type UserId = 'abel' | 'keneni';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ExercisePattern = 'normal' | 'drop_set' | 'superset' | 'pyramid';

export interface SetRecord {
  weightKg: number;
  reps: number;
  timestamp: number;
}

export interface ExerciseLog {
  exerciseName: string;
  pattern: ExercisePattern;
  sets: SetRecord[];
}

export interface DayWorkout {
  dayOfWeek: DayOfWeek;
  exercises: ExerciseLog[];
  completed: boolean;
}

export interface WorkoutData {
  [userId: string]: {
    [dateKey: string]: DayWorkout | undefined;
  };
}

export interface PresetExercise {
  name: string;
  pattern: ExercisePattern;
  defaultSets: number;
  targetReps?: string;
  restSeconds?: number;
  notes?: string;
}

export interface DaySchedule {
  dayOfWeek: DayOfWeek;
  label: string;
  muscleGroups: string[];
  focus?: string;
  exercises: PresetExercise[];
  isRestDay: boolean;
}

export type RestTimerPreset = 1 | 2 | 3 | 4 | 5;

export interface TimerState {
  isRunning: boolean;
  isMinimized: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  preset: RestTimerPreset | null;
}

export interface BodyMetrics {
  dateKey: string;
  weightKg: number;
  heightCm: number;
  timestamp: number;
}

export interface BodyMetricsData {
  [userId: string]: {
    [dateKey: string]: BodyMetrics | undefined;
  };
}

export interface VolumeData {
  exerciseName: string;
  muscleGroups: string[];
  volume: number;
  dateKey: string;
}

export interface ProgressData {
  maxWeight: number;
  totalReps: number;
  totalVolume: number;
  dateKey: string;
}

export interface UserColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  bg: string;
  border: string;
  text: string;
}

export const USER_COLORS: Record<UserId, UserColors> = {
  abel: {
    primary: '#3B82F6',
    primaryLight: '#93C5FD',
    primaryDark: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1E3A5F',
  },
  keneni: {
    primary: '#22C55E',
    primaryLight: '#86EFAC',
    primaryDark: '#15803D',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#14532D',
  },
};
