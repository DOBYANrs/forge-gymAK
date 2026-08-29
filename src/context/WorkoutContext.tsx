import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { WorkoutData, DayWorkout, UserId, ExerciseLog, SetRecord, ExercisePattern, DayOfWeek } from '../types';
import {
  isFirebaseConfigured,
  subscribeToWorkouts,
  saveWorkoutToFirebase as fbSave,
  saveDeletedExercisesToFirebase as fbSaveDeleted,
  subscribeToDeletedExercises,
  loadDeletedExercisesFromFirebase,
} from '../services/firebase';

const DAYS: DayOfWeek[] = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function getDayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const date = new Date(dateKey + 'T12:00:00');
  return DAYS[date.getDay()];
}

interface WorkoutContextType {
  workoutData: WorkoutData;
  deletedExercises: Record<string, number[]>;
  getDayWorkout: (userId: UserId, dateKey: string) => DayWorkout | undefined;
  ensureDayExists: (userId: UserId, dateKey: string, exercises: { exerciseName: string; pattern: ExercisePattern; numSets: number }[]) => void;
  updateDayExercises: (userId: UserId, dateKey: string, exercises: { exerciseName: string; pattern: ExercisePattern; numSets: number }[]) => void;
  addExercise: (userId: UserId, dateKey: string, exerciseName: string, pattern: ExercisePattern, numSets: number) => void;
  updateSet: (userId: UserId, dateKey: string, exerciseIndex: number, setIndex: number, weightKg: number, reps: number) => void;
  addSet: (userId: UserId, dateKey: string, exerciseIndex: number) => void;
  removeSet: (userId: UserId, dateKey: string, exerciseIndex: number, setIndex: number) => void;
  deleteExercise: (dayOfWeek: string, exerciseIndex: number) => void;
  deleteExerciseFromDay: (userId: UserId, dateKey: string, exerciseIndex: number) => void;
  moveExercise: (userId: UserId, dateKey: string, fromIndex: number, toIndex: number) => void;
  toggleCompleted: (userId: UserId, dateKey: string) => void;
  toggleSetComplete: (userId: UserId, dateKey: string, exerciseIndex: number, setIndex: number) => void;
  importData: (data: WorkoutData) => void;
  exportData: () => WorkoutData;
  clearAllData: () => void;
}

const STORAGE_KEY = 'forge_gym_workout_data';
const DELETED_KEY = 'forge_gym_deleted_exercises';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workoutData, setWorkoutData] = useState<WorkoutData>(() => loadFromStorage(STORAGE_KEY, {}));
  const [deletedExercises, setDeletedExercises] = useState<Record<string, number[]>>(() => loadFromStorage(DELETED_KEY, {}));
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const fbSaveRef = useRef(fbSave);
  const fbSaveDeletedRef = useRef(fbSaveDeleted);

  // Persist to localStorage on changes
  useEffect(() => { saveToStorage(STORAGE_KEY, workoutData); }, [workoutData]);
  useEffect(() => { saveToStorage(DELETED_KEY, deletedExercises); }, [deletedExercises]);

  // Initialize Firebase sync
  useEffect(() => {
    const configured = isFirebaseConfigured();
    setFirebaseConfigured(configured);
    if (!configured) return;

    // Subscribe to workout data - OVERWRITE local data with remote data for proper sync
    const unsubWorkouts = subscribeToWorkouts((remoteData) => {
      setWorkoutData((prev) => {
        // Merge strategy: remote data takes precedence (overwrites local)
        const merged = { ...prev };
        for (const [userId, days] of Object.entries(remoteData)) {
          merged[userId] = { ...merged[userId], ...days };
        }
        return merged;
      });
    });

    // Subscribe to deleted exercises - same overwrite strategy
    const unsubDeleted = subscribeToDeletedExercises((remoteDeleted) => {
      setDeletedExercises((prev) => ({
        ...prev,
        ...remoteDeleted,
      }));
    });

    // Also load deleted exercises on mount to catch any missed updates
    loadDeletedExercisesFromFirebase().then((remote) => {
      if (remote) {
        setDeletedExercises((prev) => ({ ...prev, ...remote }));
      }
    }).catch(() => {});

    return () => {
      unsubWorkouts();
      unsubDeleted();
    };
  }, []);

  const getDayWorkout = useCallback((userId: UserId, dateKey: string) => {
    return workoutData[userId]?.[dateKey];
  }, [workoutData]);

  const syncToFirebase = useCallback((userId: UserId, dateKey: string, workout: DayWorkout) => {
    if (firebaseConfigured) {
      fbSaveRef.current(userId, dateKey, workout).catch(() => {});
    }
  }, [firebaseConfigured]);

  const syncDeletedToFirebase = useCallback((deleted: Record<string, number[]>) => {
    if (firebaseConfigured) {
      fbSaveDeletedRef.current(deleted).catch(() => {});
    }
  }, [firebaseConfigured]);

  const deleteExercise = useCallback((dayOfWeek: string, exerciseIndex: number) => {
    setDeletedExercises((prev) => {
      const existing = [...(prev[dayOfWeek] || [])];
      if (!existing.includes(exerciseIndex)) {
        existing.push(exerciseIndex);
      }
      const updated = { ...prev, [dayOfWeek]: existing };
      syncDeletedToFirebase(updated);
      return updated;
    });
  }, [syncDeletedToFirebase]);

  const deleteExerciseFromDay = useCallback((userId: UserId, dateKey: string, exerciseIndex: number) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      const day = newData[userId]?.[dateKey];
      if (!day?.exercises[exerciseIndex]) return prev;
      day.exercises.splice(exerciseIndex, 1);
      syncToFirebase(userId, dateKey, day);
      return newData;
    });
  }, [syncToFirebase]);

  const moveExercise = useCallback((userId: UserId, dateKey: string, fromIndex: number, toIndex: number) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      const day = newData[userId]?.[dateKey];
      if (!day?.exercises[fromIndex] || !day?.exercises[toIndex]) return prev;
      
      // Remove exercise from old position
      const [movedExercise] = day.exercises.splice(fromIndex, 1);
      // Insert at new position
      day.exercises.splice(toIndex, 0, movedExercise);
      
      syncToFirebase(userId, dateKey, day);
      return newData;
    });
  }, [syncToFirebase]);

  const ensureDayExists = useCallback((
    userId: UserId,
    dateKey: string,
    exercisesToAdd: { exerciseName: string; pattern: ExercisePattern; numSets: number }[]
  ): void => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      if (!newData[userId]) newData[userId] = {};
      const existingDay = newData[userId][dateKey];
      if (!existingDay) {
        // Create fresh day from the provided exercises
        const exercises: ExerciseLog[] = exercisesToAdd.map((ex) => ({
          exerciseName: ex.exerciseName,
          pattern: ex.pattern,
          sets: Array.from({ length: ex.numSets }, () => ({
            weightKg: 0,
            reps: 0,
            timestamp: Date.now(),
          })),
        }));
        const day: DayWorkout = {
          dayOfWeek: getDayOfWeekFromDateKey(dateKey),
          exercises,
          completed: false,
        };
        newData[userId][dateKey] = day;
        syncToFirebase(userId, dateKey, day);
      } else {
        // Day exists — merge in any exercises from the schedule that are missing
        const existingNames = new Set(existingDay.exercises.map((e) => e.exerciseName));
        for (const ex of exercisesToAdd) {
          if (!existingNames.has(ex.exerciseName)) {
            existingDay.exercises.push({
              exerciseName: ex.exerciseName,
              pattern: ex.pattern,
              sets: Array.from({ length: ex.numSets }, () => ({
                weightKg: 0,
                reps: 0,
                timestamp: Date.now(),
              })),
            });
          }
        }
        newData[userId][dateKey] = existingDay;
        syncToFirebase(userId, dateKey, existingDay);
      }
      return newData;
    });
  }, [syncToFirebase]);

  const updateDayExercises = useCallback((
    userId: UserId,
    dateKey: string,
    exercises: { exerciseName: string; pattern: ExercisePattern; numSets: number }[]
  ): void => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      if (!newData[userId]) newData[userId] = {};
      
      const existingDay = newData[userId][dateKey];
      const newExercises: ExerciseLog[] = exercises.map((ex) => {
        // Try to preserve existing set data if exercise name matches
        const existingExercise = existingDay?.exercises?.find(
          (e) => e.exerciseName === ex.exerciseName
        );
        
        if (existingExercise) {
          // Preserve existing sets, adjust if needed
          const preservedSets = existingExercise.sets.slice(0, ex.numSets);
          const missingSets = Math.max(0, ex.numSets - preservedSets.length);
          const newSets = Array.from({ length: missingSets }, () => ({
            weightKg: 0,
            reps: 0,
            timestamp: Date.now(),
          }));
          return {
            exerciseName: ex.exerciseName,
            pattern: ex.pattern,
            sets: [...preservedSets, ...newSets],
          };
        }
        
        // Create new exercise
        return {
          exerciseName: ex.exerciseName,
          pattern: ex.pattern,
          sets: Array.from({ length: ex.numSets }, () => ({
            weightKg: 0,
            reps: 0,
            timestamp: Date.now(),
          })),
        };
      });

      newData[userId][dateKey] = {
        dayOfWeek: getDayOfWeekFromDateKey(dateKey),
        exercises: newExercises,
        completed: existingDay?.completed ?? false,
      };
      
      syncToFirebase(userId, dateKey, newData[userId][dateKey]);
      return newData;
    });
  }, [syncToFirebase]);

  const addExercise = useCallback((
    userId: UserId,
    dateKey: string,
    exerciseName: string,
    pattern: ExercisePattern,
    numSets: number
  ) => {
    setWorkoutData((prev) => {
      const newData = { ...prev };
      if (!newData[userId]) newData[userId] = {};
      const day = { ...newData[userId][dateKey] };
      const sets: SetRecord[] = Array.from({ length: numSets }, () => ({
        weightKg: 0,
        reps: 0,
        timestamp: Date.now(),
      }));
      const exercise: ExerciseLog = { exerciseName, pattern, sets };
      const exercises = [...(day.exercises ?? []), exercise];
      const workout: DayWorkout = {
        dayOfWeek: day.dayOfWeek ?? getDayOfWeekFromDateKey(dateKey),
        exercises,
        completed: day.completed ?? false,
      };
      newData[userId] = {
        ...newData[userId],
        [dateKey]: workout,
      };
      syncToFirebase(userId, dateKey, workout);
      return newData;
    });
  }, [syncToFirebase]);

  const updateSet = useCallback((
    userId: UserId,
    dateKey: string,
    exerciseIndex: number,
    setIndex: number,
    weightKg: number,
    reps: number
  ) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      if (!newData[userId]) newData[userId] = {};
      let day = newData[userId][dateKey];
      // Auto-create the day if it doesn't exist yet
      if (!day) {
        day = {
          dayOfWeek: getDayOfWeekFromDateKey(dateKey),
          exercises: [],
          completed: false,
        };
        newData[userId][dateKey] = day;
      }
      // Auto-create the exercise slot if it doesn't exist yet
      if (!day.exercises[exerciseIndex]) {
        day.exercises[exerciseIndex] = {
          exerciseName: `Exercise ${exerciseIndex + 1}`,
          pattern: 'normal',
          sets: [],
        };
      }
      // Auto-create the set slot if it doesn't exist yet
      if (!day.exercises[exerciseIndex].sets[setIndex]) {
        day.exercises[exerciseIndex].sets[setIndex] = {
          weightKg: 0,
          reps: 0,
          timestamp: Date.now(),
        };
      }
      day.exercises[exerciseIndex].sets[setIndex] = { weightKg, reps, timestamp: Date.now() };
      syncToFirebase(userId, dateKey, newData[userId]![dateKey]!);
      return newData;
    });
  }, [syncToFirebase]);

  const addSet = useCallback((userId: UserId, dateKey: string, exerciseIndex: number) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      if (!newData[userId]) newData[userId] = {};
      if (!newData[userId][dateKey]) {
        newData[userId][dateKey] = {
          dayOfWeek: getDayOfWeekFromDateKey(dateKey),
          exercises: [],
          completed: false,
        };
      }
      const day = newData[userId][dateKey]!;
      if (!day.exercises[exerciseIndex]) {
        day.exercises[exerciseIndex] = {
          exerciseName: `Exercise ${exerciseIndex + 1}`,
          pattern: 'normal',
          sets: [],
        };
      }
      if (day.exercises[exerciseIndex].sets.length >= 10) return prev;
      day.exercises[exerciseIndex].sets.push({ weightKg: 0, reps: 0, timestamp: Date.now() });
      syncToFirebase(userId, dateKey, newData[userId]![dateKey]!);
      return newData;
    });
  }, [syncToFirebase]);

  const removeSet = useCallback((userId: UserId, dateKey: string, exerciseIndex: number, setIndex: number) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      const day = newData[userId]?.[dateKey];
      if (!day?.exercises[exerciseIndex]) return prev;
      if (day.exercises[exerciseIndex].sets.length <= 1) return prev;
      day.exercises[exerciseIndex].sets.splice(setIndex, 1);
      return newData;
    });
  }, []);

  const toggleCompleted = useCallback((userId: UserId, dateKey: string) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      const day = newData[userId]?.[dateKey];
      if (!day) return prev;
      day.completed = !day.completed;
      return newData;
    });
  }, []);

  const toggleSetComplete = useCallback((userId: UserId, dateKey: string, exerciseIndex: number, setIndex: number) => {
    setWorkoutData((prev) => {
      const newData = structuredClone(prev);
      const day = newData[userId]?.[dateKey];
      if (!day?.exercises[exerciseIndex]?.sets[setIndex]) return prev;
      const set = day.exercises[exerciseIndex].sets[setIndex];
      set.completed = !set.completed;
      syncToFirebase(userId, dateKey, day);
      return newData;
    });
  }, [syncToFirebase]);

  const importData = useCallback((data: WorkoutData) => {
    setWorkoutData(data);
  }, []);

  const exportData = useCallback(() => workoutData, [workoutData]);

  const clearAllData = useCallback(() => {
    setWorkoutData({});
    setDeletedExercises({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DELETED_KEY);
  }, []);

  return (
    <WorkoutContext.Provider value={{
      workoutData,
      deletedExercises,
      getDayWorkout,
      ensureDayExists,
      updateDayExercises,
      addExercise,
      updateSet,
      addSet,
      removeSet,
      deleteExercise,
      deleteExerciseFromDay,
      moveExercise,
      toggleCompleted,
      toggleSetComplete,
      importData,
      exportData,
      clearAllData,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextType {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
