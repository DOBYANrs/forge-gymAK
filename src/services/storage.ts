import type { WorkoutData, BodyMetricsData } from '../types';

export function exportAllData(): {
  workouts: WorkoutData;
  bodyMetrics: BodyMetricsData;
  exportedAt: string;
  version: string;
} {
  const workouts = JSON.parse(localStorage.getItem('kasaint_gym_workout_data') ?? '{}');
  const bodyMetrics = JSON.parse(localStorage.getItem('kasaint_gym_body_metrics') ?? '{}');

  return {
    workouts,
    bodyMetrics,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

export function importAllData(data: {
  workouts?: WorkoutData;
  bodyMetrics?: BodyMetricsData;
}): { success: boolean; message: string } {
  try {
    if (data.workouts) {
      localStorage.setItem('kasaint_gym_workout_data', JSON.stringify(data.workouts));
    }
    if (data.bodyMetrics) {
      localStorage.setItem('kasaint_gym_body_metrics', JSON.stringify(data.bodyMetrics));
    }
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
