const KEY_PAIRS: ReadonlyArray<{ oldKey: string; newKey: string }> = [
  { oldKey: 'forge_gym_workout_data', newKey: 'kasaint_gym_workout_data' },
  { oldKey: 'forge_gym_body_metrics', newKey: 'kasaint_gym_body_metrics' },
  { oldKey: 'forge_gym_deleted_exercises', newKey: 'kasaint_gym_deleted_exercises' },
  { oldKey: 'forge_gym_custom_schedule', newKey: 'kasaint_gym_custom_schedule' },
  { oldKey: 'forge_gym_schedule_version', newKey: 'kasaint_gym_schedule_version' },
  { oldKey: 'forge_gym_selected_user', newKey: 'kasaint_gym_selected_user' },
];

const MIGRATION_FLAG = 'kasaint_gym_data_migrated';

export function migrateLegacyStorageKeys(): void {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return;

    KEY_PAIRS.forEach(({ oldKey, newKey }) => {
      try {
        const legacy = localStorage.getItem(oldKey);
        if (legacy === null) return;

        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, legacy);
        }
        localStorage.removeItem(oldKey);
      } catch {
        // Ignore per-key failures so one bad key can't block the rest.
      }
    });

    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    // Migration is best-effort; never break app startup.
  }
}
