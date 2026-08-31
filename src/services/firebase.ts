import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  type Unsubscribe,
} from 'firebase/database';
import type { WorkoutData, UserId, BodyMetricsData, DayOfWeek, PresetExercise } from '../types';

// Firebase configuration - user needs to fill in their own values
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

let app: FirebaseApp | null = null;
let db: ReturnType<typeof getDatabase> | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const hasConfig = Object.values(FIREBASE_CONFIG).some((v) => v !== '');
    if (!hasConfig) {
      throw new Error(
        'Firebase not configured. Set VITE_FIREBASE_* environment variables in .env file.'
      );
    }
    app = initializeApp(FIREBASE_CONFIG);
  }
  return app;
}

function getDatabaseInstance() {
  if (!db) {
    db = getDatabase(getFirebaseApp());
  }
  return db;
}

const WORKOUT_PATH = 'kasaint-gym/workouts';
const DELETED_PATH = 'kasaint-gym/deletedExercises';
const BODY_PATH = 'kasaint-gym/bodyMetrics';
const SCHEDULE_PATH = 'kasaint-gym/customSchedule';

// ─── Workout Data Sync ───

export async function saveWorkoutToFirebase(
  userId: UserId,
  dateKey: string,
  workout: unknown
): Promise<void> {
  try {
    const db = getDatabaseInstance();
    const workoutRef = ref(db, `${WORKOUT_PATH}/${userId}/${dateKey}`);
    await set(workoutRef, workout);
  } catch (error) {
    console.warn('Firebase save failed (offline or not configured):', error);
  }
}

export async function loadWorkoutFromFirebase(): Promise<WorkoutData | null> {
  try {
    const db = getDatabaseInstance();
    const workoutRef = ref(db, WORKOUT_PATH);
    const snapshot = await get(workoutRef);
    if (snapshot.exists()) {
      return snapshot.val() as WorkoutData;
    }
    return null;
  } catch (error) {
    console.warn('Firebase load failed (offline or not configured):', error);
    return null;
  }
}

export function subscribeToWorkouts(
  callback: (data: WorkoutData) => void
): Unsubscribe {
  try {
    const db = getDatabaseInstance();
    const workoutRef = ref(db, WORKOUT_PATH);
    return onValue(workoutRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as WorkoutData);
      }
    });
  } catch (error) {
    console.warn('Firebase subscription failed:', error);
    return () => {};
  }
}

// ─── Deleted Exercises Sync ───

export async function saveDeletedExercisesToFirebase(
  deleted: Record<string, number[]>
): Promise<void> {
  try {
    const db = getDatabaseInstance();
    const deletedRef = ref(db, DELETED_PATH);
    await set(deletedRef, deleted);
  } catch (error) {
    console.warn('Firebase deleted exercises save failed:', error);
  }
}

export async function loadDeletedExercisesFromFirebase(): Promise<Record<string, number[]> | null> {
  try {
    const db = getDatabaseInstance();
    const deletedRef = ref(db, DELETED_PATH);
    const snapshot = await get(deletedRef);
    if (snapshot.exists()) {
      return snapshot.val() as Record<string, number[]>;
    }
    return null;
  } catch (error) {
    console.warn('Firebase deleted exercises load failed:', error);
    return null;
  }
}

export function subscribeToDeletedExercises(
  callback: (data: Record<string, number[]>) => void
): Unsubscribe {
  try {
    const db = getDatabaseInstance();
    const deletedRef = ref(db, DELETED_PATH);
    return onValue(deletedRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as Record<string, number[]>);
      }
    });
  } catch (error) {
    console.warn('Firebase deleted exercises subscription failed:', error);
    return () => {};
  }
}

// ─── Body Metrics Sync ───

export async function saveBodyMetricsToFirebase(
  data: BodyMetricsData
): Promise<void> {
  try {
    const db = getDatabaseInstance();
    const bodyRef = ref(db, BODY_PATH);
    await set(bodyRef, data);
  } catch (error) {
    console.warn('Firebase body metrics save failed:', error);
  }
}

export async function loadBodyMetricsFromFirebase(): Promise<BodyMetricsData | null> {
  try {
    const db = getDatabaseInstance();
    const bodyRef = ref(db, BODY_PATH);
    const snapshot = await get(bodyRef);
    if (snapshot.exists()) {
      return snapshot.val() as BodyMetricsData;
    }
    return null;
  } catch (error) {
    console.warn('Firebase body metrics load failed:', error);
    return null;
  }
}

export function subscribeToBodyMetrics(
  callback: (data: BodyMetricsData) => void
): Unsubscribe {
  try {
    const db = getDatabaseInstance();
    const bodyRef = ref(db, BODY_PATH);
    return onValue(bodyRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as BodyMetricsData);
      }
    });
  } catch (error) {
    console.warn('Firebase body metrics subscription failed:', error);
    return () => {};
  }
}

// ─── Custom Schedule Sync ───

export async function saveScheduleToFirebase(
  schedule: Record<DayOfWeek, PresetExercise[]>
): Promise<void> {
  try {
    const db = getDatabaseInstance();
    const scheduleRef = ref(db, SCHEDULE_PATH);
    await set(scheduleRef, schedule);
  } catch (error) {
    console.warn('Firebase schedule save failed:', error);
  }
}

export async function loadScheduleFromFirebase(): Promise<Record<DayOfWeek, PresetExercise[]> | null> {
  try {
    const db = getDatabaseInstance();
    const scheduleRef = ref(db, SCHEDULE_PATH);
    const snapshot = await get(scheduleRef);
    if (snapshot.exists()) {
      return snapshot.val() as Record<DayOfWeek, PresetExercise[]>;
    }
    return null;
  } catch (error) {
    console.warn('Firebase schedule load failed:', error);
    return null;
  }
}

export function subscribeToSchedule(
  callback: (data: Record<DayOfWeek, PresetExercise[]>) => void
): Unsubscribe {
  try {
    const db = getDatabaseInstance();
    const scheduleRef = ref(db, SCHEDULE_PATH);
    return onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as Record<DayOfWeek, PresetExercise[]>);
      }
    });
  } catch (error) {
    console.warn('Firebase schedule subscription failed:', error);
    return () => {};
  }
}

// ─── Utils ───

export function isFirebaseConfigured(): boolean {
  return Object.values(FIREBASE_CONFIG).every((v) => v !== '');
}
