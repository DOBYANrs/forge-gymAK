import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { PresetExercise, DayOfWeek } from '../types';
import { getWeekSchedule } from '../data/schedule';
import {
  isFirebaseConfigured,
  subscribeToSchedule,
  saveScheduleToFirebase,
  loadScheduleFromFirebase,
} from '../services/firebase';

interface ScheduleContextType {
  fullSchedule: Record<DayOfWeek, PresetExercise[]>;
  setDaySchedule: (dayOfWeek: DayOfWeek, exercises: PresetExercise[]) => void;
  addExerciseToSchedule: (dayOfWeek: DayOfWeek, exercise: PresetExercise) => void;
  updateExerciseInSchedule: (dayOfWeek: DayOfWeek, index: number, exercise: PresetExercise) => void;
  removeExerciseFromSchedule: (dayOfWeek: DayOfWeek, index: number) => void;
  getScheduleForDay: (dayOfWeek: DayOfWeek, defaultExercises: PresetExercise[]) => PresetExercise[];
  clearDaySchedule: (dayOfWeek: DayOfWeek) => void;
}

const SCHEDULE_STORAGE_KEY = 'kasaint_gym_custom_schedule';
const SCHEDULE_VERSION_KEY = 'kasaint_gym_schedule_version';
// Bump this whenever WEEKLY_SCHEDULE changes to force-clear old custom data
const CURRENT_SCHEDULE_VERSION = '3.0';
// Separate reset guard: clearing this key only wipes the custom SCHEDULE (not
// workout logs). Bumped once to repair days collapsed by the old edit flow.
const SCHEDULE_RESET_KEY = 'kasaint_gym_custom_schedule_reset';
const CURRENT_SCHEDULE_RESET_VERSION = '4.0';

const EMPTY_SCHEDULE: Record<DayOfWeek, PresetExercise[]> = {
  sunday: [],
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
};

function loadFromStorage(): Record<DayOfWeek, PresetExercise[]> {
  try {
    const resetVersion = localStorage.getItem(SCHEDULE_RESET_KEY);
    if (resetVersion !== CURRENT_SCHEDULE_RESET_VERSION) {
      // One-time repair: the old edit flow could collapse a whole day down to a
      // single exercise (edits overwrote the raw custom array instead of the full
      // day). Clear only the custom schedule so every day returns to clean
      // defaults; workout logs are intentionally left untouched.
      localStorage.removeItem(SCHEDULE_STORAGE_KEY);
      localStorage.setItem(SCHEDULE_RESET_KEY, CURRENT_SCHEDULE_RESET_VERSION);
      return { ...EMPTY_SCHEDULE };
    }
    const storedVersion = localStorage.getItem(SCHEDULE_VERSION_KEY);
    if (storedVersion !== CURRENT_SCHEDULE_VERSION) {
      // New schedule version — wipe ALL old custom data
      localStorage.removeItem(SCHEDULE_STORAGE_KEY);
      localStorage.removeItem('kasaint_gym_workout_data');
      localStorage.removeItem('kasaint_gym_deleted_exercises');
      localStorage.setItem(SCHEDULE_VERSION_KEY, CURRENT_SCHEDULE_VERSION);
      return { ...EMPTY_SCHEDULE };
    }
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Merge with empty schedule to ensure all days exist, but only keep non-empty customizations
      const result = { ...EMPTY_SCHEDULE };
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val) && val.length > 0) {
          result[key as DayOfWeek] = val;
        }
      }
      return result;
    }
  } catch {}
  return { ...EMPTY_SCHEDULE };
}

function saveToStorage(data: Record<DayOfWeek, PresetExercise[]>) {
  try {
    // Only save non-empty customizations
    const toSave: Record<string, PresetExercise[]> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val.length > 0) {
        toSave[key] = val;
      }
    }
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

// Returns the built-in default exercises for a weekday (includes that week's
// biweekly Thursday rear-delt rotation). Used as the base when the user edits a
// day that has no customization yet, so a single edit never drops the rest.
function defaultExercisesFor(dayOfWeek: DayOfWeek): PresetExercise[] {
  const week = getWeekSchedule(new Date());
  return week.find((d) => d.dayOfWeek === dayOfWeek)?.exercises ?? [];
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [fullSchedule, setFullSchedule] = useState<Record<DayOfWeek, PresetExercise[]>>(() => loadFromStorage());
  const firebaseConfigured = isFirebaseConfigured();

  // Load from Firebase on mount if configured
  useEffect(() => {
    if (!firebaseConfigured) return;

    loadScheduleFromFirebase().then((data) => {
      if (data) {
        setFullSchedule(data);
        saveToStorage(data);
      }
    });
  }, [firebaseConfigured]);

  // Subscribe to Firebase updates
  useEffect(() => {
    if (!firebaseConfigured) return;

    const unsubscribe = subscribeToSchedule((data) => {
      setFullSchedule(data);
      saveToStorage(data);
    });

    return () => unsubscribe();
  }, [firebaseConfigured]);

  // Save to Firebase
  useEffect(() => {
    if (!firebaseConfigured) return;
    saveScheduleToFirebase(fullSchedule);
  }, [fullSchedule, firebaseConfigured]);

  // Also save to localStorage as backup
  useEffect(() => {
    saveToStorage(fullSchedule);
  }, [fullSchedule]);

  const setDaySchedule = useCallback((dayOfWeek: DayOfWeek, exercises: PresetExercise[]) => {
    setFullSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: exercises,
    }));
  }, []);

  const addExerciseToSchedule = useCallback((dayOfWeek: DayOfWeek, exercise: PresetExercise) => {
    setFullSchedule((prev) => {
      // Any customized day holds the COMPLETE exercise list, so start from the
      // current full day (custom if present, otherwise the built-in defaults).
      const current = prev[dayOfWeek] && prev[dayOfWeek].length > 0
        ? prev[dayOfWeek]
        : defaultExercisesFor(dayOfWeek);
      return { ...prev, [dayOfWeek]: [...current, exercise] };
    });
  }, []);

  const updateExerciseInSchedule = useCallback((dayOfWeek: DayOfWeek, index: number, exercise: PresetExercise) => {
    setFullSchedule((prev) => {
      const current = prev[dayOfWeek] && prev[dayOfWeek].length > 0
        ? prev[dayOfWeek]
        : defaultExercisesFor(dayOfWeek);
      // Guard out-of-range edits instead of padding with placeholder entries —
      // padding is what used to collapse a whole day down to a single exercise.
      if (index < 0 || index >= current.length) return prev;
      return { ...prev, [dayOfWeek]: current.map((ex, i) => (i === index ? exercise : ex)) };
    });
  }, []);

  const removeExerciseFromSchedule = useCallback((dayOfWeek: DayOfWeek, index: number) => {
    setFullSchedule((prev) => {
      const current = prev[dayOfWeek] && prev[dayOfWeek].length > 0
        ? prev[dayOfWeek]
        : defaultExercisesFor(dayOfWeek);
      if (index < 0 || index >= current.length) return prev;
      return { ...prev, [dayOfWeek]: current.filter((_, i) => i !== index) };
    });
  }, []);

  const clearDaySchedule = useCallback((dayOfWeek: DayOfWeek) => {
    setFullSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: [],
    }));
  }, []);

  const getScheduleForDay = useCallback((dayOfWeek: DayOfWeek, defaultExercises: PresetExercise[]) => {
    // Only use custom schedule if the user has actually added exercises to it
    const custom = fullSchedule[dayOfWeek];
    if (custom && custom.length > 0) {
      return custom;
    }
    return defaultExercises;
  }, [fullSchedule]);

  return (
    <ScheduleContext.Provider value={{
      fullSchedule,
      setDaySchedule,
      addExerciseToSchedule,
      updateExerciseInSchedule,
      removeExerciseFromSchedule,
      getScheduleForDay,
      clearDaySchedule,
    }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextType {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
}
