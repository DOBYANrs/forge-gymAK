import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { PresetExercise, DayOfWeek } from '../types';
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
    setFullSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: [...(prev[dayOfWeek] || []), exercise],
    }));
  }, []);

  const updateExerciseInSchedule = useCallback((dayOfWeek: DayOfWeek, index: number, exercise: PresetExercise) => {
    setFullSchedule((prev) => {
      const updated = { ...prev };
      if (!updated[dayOfWeek]) updated[dayOfWeek] = [];
      while (updated[dayOfWeek].length <= index) {
        updated[dayOfWeek].push({ name: '', pattern: 'normal', defaultSets: 3 });
      }
      updated[dayOfWeek] = updated[dayOfWeek].map((ex, i) => (i === index ? exercise : ex));
      return updated;
    });
  }, []);

  const removeExerciseFromSchedule = useCallback((dayOfWeek: DayOfWeek, index: number) => {
    setFullSchedule((prev) => {
      const updated = { ...prev };
      if (!updated[dayOfWeek]) updated[dayOfWeek] = [];
      updated[dayOfWeek] = updated[dayOfWeek].filter((_, i) => i !== index);
      return updated;
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
