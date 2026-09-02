import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { BodyMetrics, BodyMetricsData, UserId } from '../types';
import { formatDateKey } from '../utils/dates';
import { DEFAULT_PROFILES, resolveEffectiveProfile, type AthleteProfile } from '../utils/tierEngine';
import {
  isFirebaseConfigured,
  subscribeToBodyMetrics,
  saveBodyMetricsToFirebase as fbSaveBody,
} from '../services/firebase';

interface BodyContextType {
  bodyMetrics: BodyMetricsData;
  getMetrics: (userId: UserId, dateKey: string) => BodyMetrics | undefined;
  saveMetrics: (userId: UserId, weightKg: number, heightCm: number) => void;
  getAllMetrics: (userId: UserId) => BodyMetrics[];
  getLatestProfile: (userId: UserId) => AthleteProfile;
}

const STORAGE_KEY = 'kasaint_gym_body_metrics';

function loadFromStorage(): BodyMetricsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const BodyContext = createContext<BodyContextType | null>(null);

export function BodyProvider({ children }: { children: ReactNode }) {
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricsData>(loadFromStorage);

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bodyMetrics));
    } catch {}
  }, [bodyMetrics]);

  // Initialize Firebase sync
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    // Subscribe to remote body metrics - overwrite local with remote
    const unsubscribe = subscribeToBodyMetrics((remoteData) => {
      setBodyMetrics((prev) => {
        const merged = { ...prev };
        for (const [userId, dates] of Object.entries(remoteData)) {
          merged[userId] = { ...merged[userId], ...dates };
        }
        return merged;
      });
    });

    return () => unsubscribe();
  }, []);

  const saveMetricsToFirebase = useCallback((data: BodyMetricsData) => {
    if (isFirebaseConfigured()) {
      fbSaveBody(data).catch(() => {});
    }
  }, []);

  const getMetrics = useCallback((userId: UserId, dateKey: string) => {
    return bodyMetrics[userId]?.[dateKey];
  }, [bodyMetrics]);

  const saveMetrics = useCallback((userId: UserId, weightKg: number, heightCm: number) => {
    setBodyMetrics((prev) => {
      const dateKey = formatDateKey(new Date());
      const newData = structuredClone(prev);
      if (!newData[userId]) newData[userId] = {};
      newData[userId][dateKey] = { dateKey, weightKg, heightCm, timestamp: Date.now() };
      saveMetricsToFirebase(newData);
      return newData;
    });
  }, [saveMetricsToFirebase]);

  const getAllMetrics = useCallback((userId: UserId) => {
    const data = bodyMetrics[userId];
    if (!data) return [];
    return Object.values(data).filter(Boolean) as BodyMetrics[];
  }, [bodyMetrics]);

  // Resolve the live profile: default plus the user's latest saved weight/height.
  const getLatestProfile = useCallback((userId: UserId): AthleteProfile => {
    const all = bodyMetrics[userId];
    let latest: BodyMetrics | undefined;
    if (all) {
      for (const m of Object.values(all)) {
        if (!m) continue;
        if (!latest || m.timestamp > latest.timestamp) latest = m;
      }
    }
    return resolveEffectiveProfile(DEFAULT_PROFILES[userId], latest);
  }, [bodyMetrics]);

  return (
    <BodyContext.Provider
      value={{ bodyMetrics, getMetrics, saveMetrics, getAllMetrics, getLatestProfile }}
    >
      {children}
    </BodyContext.Provider>
  );
}

export function useBody(): BodyContextType {
  const ctx = useContext(BodyContext);
  if (!ctx) throw new Error('useBody must be used within BodyProvider');
  return ctx;
}
