import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { useSchedule } from '../context/ScheduleContext';
import { getDaySchedule } from '../data/schedule';
import { formatDateKey, getLastWeekDateKey } from '../utils/dates';
import WorkoutCard from '../components/today/WorkoutCard';
import AddExerciseModal from '../components/today/AddExerciseModal';
import RestTimerBar from '../components/today/RestTimerBar';
import WorkoutCoach from '../components/today/WorkoutCoach';
import { buildCoachInsights } from '../utils/coach';
import { useScrollReveal } from '../hooks/useScrollReveal';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Build a concise training headline from a day's muscle groups,
// e.g. ["Chest","Back","Shoulders","Triceps","Biceps"] -> "Chest & Back Day".
function formatDayTitle(groups: string[]): string {
  const meaningful = groups.filter((g) => g !== 'Rest');
  if (meaningful.length === 0) return 'Recovery Day';
  if (meaningful.length <= 2) return meaningful.join(' & ') + ' Day';
  return meaningful.slice(0, 2).join(' & ') + ' Day';
}

function getWeekDays(date: Date): { date: Date; dateKey: string; dayName: string; dayAbbrev: string; dayNum: number; isToday: boolean; isPast: boolean }[] {  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dNoTime = new Date(d);
    dNoTime.setHours(0, 0, 0, 0);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      dayName: DAY_NAMES[d.getDay()],
      dayAbbrev: DAY_ABBREVS[d.getDay()],
      dayNum: d.getDate(),
      isToday: dNoTime.getTime() === today.getTime(),
      isPast: dNoTime.getTime() < today.getTime(),
    });
  }
  return days;
}

export default function TodayPage() {
  const { activeUser } = useUser();
  const { getDayWorkout, updateDayExercises, deletedExercises, deleteExerciseFromDay, moveExercise, toggleCompleted, workoutData } = useWorkout();
  const { getScheduleForDay } = useSchedule();
  const [showAddModal, setShowAddModal] = useState(false);

  const today = new Date();
  const todayKey = formatDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const weekDays = useMemo(() => getWeekDays(today), [todayKey]);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const dateKey = selectedDateKey;
  const baseSchedule = getDaySchedule(selectedDate);
  const dayName = DAY_NAMES[selectedDate.getDay()];
  const lastWeekKey = getLastWeekDateKey(dateKey);
  const isToday = dateKey === todayKey;

  // Get the full schedule including custom exercises
  const schedule = useMemo(() => ({
    ...baseSchedule,
    exercises: getScheduleForDay(baseSchedule.dayOfWeek, baseSchedule.exercises),
  }), [baseSchedule, getScheduleForDay]);

  const todayWorkout = getDayWorkout(activeUser, dateKey);
  const lastWeekWorkout = getDayWorkout(activeUser, lastWeekKey);

  // Compute next day's schedule
  const tomorrow = new Date(selectedDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const baseTomorrowSchedule = getDaySchedule(tomorrow);
  const tomorrowSchedule = {
    ...baseTomorrowSchedule,
    exercises: getScheduleForDay(baseTomorrowSchedule.dayOfWeek, baseTomorrowSchedule.exercises),
  };
  const tomorrowName = DAY_NAMES[tomorrow.getDay()];

  // Determine the dayOfWeek for selected date to filter deleted exercises
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const selectedDayOfWeek = daysOfWeek[selectedDate.getDay()];

  // Initialize/update the day's workout from schedule (preserves existing set data)
  useEffect(() => {
    const exercisesFromSchedule = schedule.exercises.map((e) => ({
      exerciseName: e.name,
      pattern: e.pattern,
      numSets: e.defaultSets,
    }));

    // Always update to match the current schedule
    updateDayExercises(activeUser, dateKey, exercisesFromSchedule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, dateKey, schedule.exercises]);

  // After ensureDayExists runs, todayWorkout will be populated with the synced exercises
  // Filter out exercises that were deleted from the shared schedule
  const deletedIndices: number[] = deletedExercises[selectedDayOfWeek] ?? [];

  // Use workout data if available, otherwise fall back to schedule exercises
  // This ensures the UI shows exercises even before useEffect populates workout data
  const workoutExercises = todayWorkout?.exercises;
  const displayExercises = workoutExercises && workoutExercises.length > 0
    ? workoutExercises
    : schedule.exercises.map((e) => ({
        exerciseName: e.name,
        pattern: e.pattern,
        sets: Array.from({ length: e.defaultSets }, () => ({ weightKg: 0, reps: 0, timestamp: 0 })),
      }));

  const exercises = displayExercises.filter((_, i) => !deletedIndices.includes(i));
  // Get the original indices for the filtered exercises
  const exerciseIndices = displayExercises
    .map((_, i) => i)
    .filter((i) => !deletedIndices.includes(i));
  const hasStarted = displayExercises.length > 0;
  const isCompleted = todayWorkout?.completed ?? false;

  // Offline coach recap computed purely from local workout data.
  const coach = useMemo(
    () => buildCoachInsights(workoutData, activeUser, dateKey),
    [workoutData, activeUser, dateKey],
  );

  // Scroll reveal refs
  const tomorrowRef = useScrollReveal<HTMLDivElement>();
  const comingUpRef = useScrollReveal<HTMLDivElement>();

  return (
    <div className="space-y-4 page-enter">
      {/* Week Day Selector */}
      <div
        className="rounded-xl p-3 animate-scaleIn"
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,50,0.9), rgba(22,22,40,0.8))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'rgba(148,163,184,0.5)' }}>
            This Week
          </span>
          {!isToday && (
            <button
              onClick={() => setSelectedDateKey(todayKey)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-200"
              style={{ color: '#FF5E00', background: 'rgba(255,94,0,0.1)' }}
            >
              ← Back to Today
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {weekDays.map((day) => {
            const isSelected = day.dateKey === dateKey;
            const hasWorkout = getDayWorkout(activeUser, day.dateKey);
            const isCompletedDay = hasWorkout?.completed ?? false;

            return (
              <button
                key={day.dateKey}
                onClick={() => setSelectedDateKey(day.dateKey)}
                className="flex-1 flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-300 active:scale-95"
                style={{
                  background: isSelected
                    ? day.isToday
                      ? 'linear-gradient(135deg, rgba(255,94,0,0.2), rgba(255,120,40,0.12))'
                      : 'rgba(255,255,255,0.08)'
                    : 'transparent',
                  border: isSelected
                    ? day.isToday
                      ? '1px solid rgba(255,94,0,0.35)'
                      : '1px solid rgba(255,255,255,0.1)'
                    : '1px solid transparent',
                  boxShadow: isSelected && day.isToday ? '0 2px 12px rgba(255,94,0,0.15)' : 'none',
                }}
              >
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{
                    color: isSelected
                      ? day.isToday ? '#FF5E00' : 'rgba(203,213,225,0.9)'
                      : day.isPast ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.6)',
                  }}
                >
                  {day.dayAbbrev}
                </span>
                <span
                  className="text-sm font-bold leading-none"
                  style={{
                    color: isSelected
                      ? day.isToday ? '#FF5E00' : '#f1f5f9'
                      : day.isPast ? 'rgba(148,163,184,0.35)' : 'rgba(203,213,225,0.7)',
                  }}
                >
                  {day.dayNum}
                </span>
                {/* Completion dot */}
                {isCompletedDay && (
                  <span className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: '#22c55e' }} />
                )}
                {!isCompletedDay && hasWorkout && (
                  <span className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: 'rgba(255,94,0,0.5)' }} />
                )}
                {!hasWorkout && day.isToday && (
                  <span className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: 'rgba(255,94,0,0.3)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero banner — Aurora background effect */}
      <div
        className="rounded-2xl p-6 text-center overflow-hidden relative aurora-bg animate-scaleIn"
        style={{
          background: 'linear-gradient(160deg, rgba(28,28,52,0.98) 0%, rgba(18,18,38,0.95) 50%, rgba(28,28,52,0.98) 100%)',
          border: '1px solid rgba(255,94,0,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Animated gradient orbs */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 25% 30%, rgba(255,94,0,0.06), transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none animate-glowPulse"
          style={{
            background: 'radial-gradient(circle at 75% 70%, rgba(59,130,246,0.04), transparent 50%)',
          }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-2 relative z-10" style={{ color: 'rgba(255,94,0,0.65)' }}>
          {dayName}{!isToday ? ' (Make-up)' : ''}
        </p>
        <h2 className="text-xl font-bold mb-1 relative z-10" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
          {schedule.isRestDay ? 'Time to Recover' : formatDayTitle(schedule.muscleGroups)}
        </h2>
        <p className="text-sm relative z-10" style={{ color: 'rgba(148,163,184,0.65)' }}>
          {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          {!schedule.isRestDay && ` · ${schedule.muscleGroups.join(' · ')}`}
        </p>
        {schedule.focus && !schedule.isRestDay && (
          <p className="text-xs mt-1.5 relative z-10" style={{ color: 'rgba(255,94,0,0.45)' }}>
            {schedule.focus}
          </p>
        )}
      </div>

      {/* Rest day notice — shown when it's a rest day AND no custom exercises were added */}
      {schedule.isRestDay && exercises.length === 0 && !isCompleted && (
        <div
          className="rounded-2xl p-6 text-center animate-scaleIn"
          style={{
            background: 'linear-gradient(160deg, rgba(28,28,52,0.9), rgba(18,18,38,0.7))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-3xl mb-3">😴</p>
          <p className="font-semibold" style={{ color: '#f1f5f9' }}>Rest Day</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {isToday ? 'Recover and come back stronger 💪' : 'Tap "+ Custom Exercise" to log a make-up workout'}
          </p>
        </div>
      )}

      {/* Workout completed message */}
      {isCompleted && (
        <div
          className="rounded-2xl p-8 text-center celebration-burst animate-scaleIn"
          style={{
            background: 'linear-gradient(160deg, rgba(34,197,94,0.08), rgba(22,163,74,0.04))',
            border: '1px solid rgba(34,197,94,0.18)',
            boxShadow: '0 8px 32px rgba(34,197,94,0.08)',
          }}
        >
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-semibold text-lg" style={{ color: '#22c55e' }}>Workout Complete!</p>
          <p className="text-sm mt-2" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Great job {isToday ? 'today' : `on ${dayName}`}! You crushed it 💪
          </p>
          <button
            onClick={() => toggleCompleted(activeUser, dateKey)}
            className="mt-4 px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}
          >
            Edit Workout
          </button>
        </div>
      )}

      {/* Offline coach recap — shown after the workout is finished */}
      {isCompleted && <WorkoutCoach insights={coach} />}

      {/* Tomorrow's workout - shown prominently when day is finished */}
      {isCompleted && !tomorrowSchedule.isRestDay && (
        <div
          ref={tomorrowRef}
          className="reveal-on-scroll reveal-left rounded-2xl p-5"
          style={{
            background: 'linear-gradient(160deg, rgba(255,94,0,0.06), rgba(255,120,40,0.03))',
            border: '1px solid rgba(255,94,0,0.18)',
            boxShadow: '0 4px 24px rgba(255,94,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h3 className="font-semibold" style={{ color: '#FF5E00' }}>
                Coming Up
              </h3>
            </div>
            <span className="text-sm font-medium" style={{ color: 'rgba(255,94,0,0.7)' }}>
              {tomorrowName}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {tomorrowSchedule.muscleGroups.map((mg) => (
              <span key={mg} className="pill-amber text-[10px]">{mg}</span>
            ))}
          </div>

          <div className="space-y-1">
            {tomorrowSchedule.exercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'rgba(203,213,225,0.9)' }}>{ex.name}</span>
                  {ex.notes && (
                    <span className="text-[9px] italic" style={{ color: 'rgba(250,204,21,0.7)' }}>{ex.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>{ex.defaultSets} sets × {ex.targetReps ?? '?'}</span>
                  {ex.restSeconds != null && ex.restSeconds > 0 && (
                    <span className="text-[9px]" style={{ color: 'rgba(192,132,252,0.6)' }}>
                      {ex.restSeconds >= 60 ? `${ex.restSeconds / 60}m` : `${ex.restSeconds}s`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCompleted && tomorrowSchedule.isRestDay && (
        <div
          ref={tomorrowRef}
          className="reveal-on-scroll rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(160deg, rgba(28,28,52,0.9), rgba(18,18,38,0.7))',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <p className="text-3xl mb-3">😴</p>
          <p className="font-semibold" style={{ color: '#f1f5f9' }}>Tomorrow is Rest Day</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Take time to recover 💪
          </p>
        </div>
      )}

      {/* Exercise cards — shown on any day (including rest days if you added exercises) */}
      {!isCompleted && exercises.length > 0 && (
        <div className="space-y-3 animate-stagger">
          {exercises.map((exercise, i) => (
            <WorkoutCard
              key={`${exercise.exerciseName}-${i}`}
              exercise={exercise}
              exerciseIndex={exerciseIndices[i]}
              dateKey={dateKey}
              previousExercise={lastWeekWorkout?.exercises[exerciseIndices[i]]}
              onDelete={() => deleteExerciseFromDay(activeUser, dateKey, exerciseIndices[i])}
              onMoveUp={() => moveExercise(activeUser, dateKey, exerciseIndices[i], exerciseIndices[i - 1])}
              onMoveDown={() => moveExercise(activeUser, dateKey, exerciseIndices[i], exerciseIndices[i + 1])}
              isFirst={i === 0}
              isLast={i === exercises.length - 1}
            />
          ))}
        </div>
      )}

      {/* Add custom exercise button — always show if there are exercises or it's a rest day */}
      {!isCompleted && (hasStarted || schedule.isRestDay) && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all duration-200 active:scale-[0.98]"
            style={{
              borderColor: 'rgba(255,94,0,0.15)',
              color: 'rgba(255,94,0,0.7)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,94,0,0.3)'; e.currentTarget.style.background = 'rgba(255,94,0,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,94,0,0.15)'; e.currentTarget.style.background = 'transparent'; }}
          >
            + Custom Exercise
          </button>
          {hasStarted && (
            <>
              <button
                onClick={() => {
                  if (window.confirm('Finish this workout?')) {
                    toggleCompleted(activeUser, dateKey);
                  }
                }}
                className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  color: 'rgba(34,197,94,0.7)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}
              >
                ✓ Finish
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Clear all exercises from this workout?')) {
                    const key = 'kasaint_gym_workout_data';
                    try {
                      const raw = localStorage.getItem(key);
                      if (raw) {
                        const data = JSON.parse(raw);
                        if (data[activeUser]?.[dateKey]) {
                          delete data[activeUser][dateKey];
                          localStorage.setItem(key, JSON.stringify(data));
                          window.location.reload();
                        }
                      }
                    } catch {}
                  }
                }}
                className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: 'rgba(239,68,68,0.7)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              >
                ✕ Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* Auto-save indicator */}
      {hasStarted && (
        <div className="text-center pt-1">
          <span className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>
            ✓ Auto-saving after every entry
          </span>
        </div>
      )}

      {/* Coming Up Tomorrow - only show when workout is not completed */}
      {!isCompleted && (
        <div
          ref={comingUpRef}
          className="reveal-on-scroll reveal-right rounded-2xl p-4 animate-borderGlow"
          style={{
            background: 'linear-gradient(160deg, rgba(255,94,0,0.05), rgba(255,120,40,0.02))',
            border: '1px solid rgba(255,94,0,0.12)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <h3 className="text-sm font-semibold" style={{ color: '#FF5E00' }}>
                {tomorrowSchedule.isRestDay ? 'Tomorrow is Rest Day' : 'Coming Up Tomorrow'}
              </h3>
            </div>
            <span className="text-xs font-medium" style={{ color: 'rgba(255,94,0,0.6)' }}>
              {tomorrowName}
            </span>
          </div>

          {!tomorrowSchedule.isRestDay && (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tomorrowSchedule.muscleGroups.map((mg) => (
                  <span key={mg} className="pill-amber text-[10px]">{mg}</span>
                ))}
              </div>

              <div className="space-y-1">
                {tomorrowSchedule.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: 'rgba(203,213,225,0.8)' }}>{ex.name}</span>
                      {ex.notes && (
                        <span className="text-[9px] italic" style={{ color: 'rgba(250,204,21,0.6)' }}>{ex.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{ex.defaultSets} sets × {ex.targetReps ?? '?'}</span>
                      {ex.restSeconds != null && ex.restSeconds > 0 && (
                        <span className="text-[9px]" style={{ color: 'rgba(192,132,252,0.5)' }}>
                          {ex.restSeconds >= 60 ? `${ex.restSeconds / 60}m` : `${ex.restSeconds}s`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,94,0,0.08)' }}>
                <p className="text-[10px] text-center" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  Get ready — tomorrow's workout is waiting
                </p>
              </div>
            </>
          )}

          {tomorrowSchedule.isRestDay && (
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Take time to recover and come back stronger
            </p>
          )}
        </div>
      )}

      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        dateKey={dateKey}
      />

      {/* Sticky rest timer bar */}
      <RestTimerBar />
    </div>
  );
}
