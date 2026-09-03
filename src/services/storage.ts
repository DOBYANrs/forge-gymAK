import type { WorkoutData, BodyMetricsData } from '../types';

const SCHEDULE_KEY = 'kasaint_gym_custom_schedule';
const SCHEDULE_VERSION_KEY = 'kasaint_gym_schedule_version';
const DELETED_KEY = 'kasaint_gym_deleted_exercises';
// Must match ScheduleContext's CURRENT_SCHEDULE_VERSION so an import never
// trips the "version changed -> wipe workout data" guard.
const CURRENT_SCHEDULE_VERSION = '3.0';

export function exportAllData(): {
  workouts: WorkoutData;
  bodyMetrics: BodyMetricsData;
  customSchedule: Record<string, unknown>;
  deletedExercises: Record<string, number[]>;
  scheduleVersion: string;
  exportedAt: string;
  version: string;
} {
  const workouts = JSON.parse(localStorage.getItem('kasaint_gym_workout_data') ?? '{}');
  const bodyMetrics = JSON.parse(localStorage.getItem('kasaint_gym_body_metrics') ?? '{}');
  const customSchedule = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '{}');
  const deletedExercises = JSON.parse(localStorage.getItem(DELETED_KEY) ?? '{}');
  const scheduleVersion = localStorage.getItem(SCHEDULE_VERSION_KEY) ?? CURRENT_SCHEDULE_VERSION;

  return {
    workouts,
    bodyMetrics,
    customSchedule,
    deletedExercises,
    scheduleVersion,
    exportedAt: new Date().toISOString(),
    version: '1.1.0',
  };
}

export function importAllData(data: {
  workouts?: WorkoutData;
  bodyMetrics?: BodyMetricsData;
  customSchedule?: Record<string, unknown>;
  deletedExercises?: Record<string, number[]>;
  scheduleVersion?: string;
}): { success: boolean; message: string } {
  try {
    if (data.workouts) {
      localStorage.setItem('kasaint_gym_workout_data', JSON.stringify(data.workouts));
    }
    if (data.bodyMetrics) {
      localStorage.setItem('kasaint_gym_body_metrics', JSON.stringify(data.bodyMetrics));
    }
    if (data.customSchedule) {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data.customSchedule));
    }
    if (data.deletedExercises) {
      localStorage.setItem(DELETED_KEY, JSON.stringify(data.deletedExercises));
    }
    // Always pin the schedule version to the current one so the schedule
    // context never wipes the freshly-imported workout data on the next load.
    localStorage.setItem(SCHEDULE_VERSION_KEY, CURRENT_SCHEDULE_VERSION);
    return { success: true, message: 'Data imported successfully. Refresh the page to see changes.' };
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result as string));
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
