import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { USER_COLORS } from '../types';
import type { UserId } from '../types';
import { WEEKLY_SCHEDULE } from '../data/schedule';
import { calculateVolume, EXERCISE_MUSCLE_MAP } from '../utils/calculations';
import { formatDisplayDate, getDayName } from '../utils/dates';

type ChartView = 'exercise' | 'muscle' | 'compare';

const ABEL_COLORS = USER_COLORS.abel;
const KENENI_COLORS = USER_COLORS.keneni;

const chartColors = {
  grid: 'rgba(255,255,255,0.05)',
  text: 'rgba(148,163,184,0.5)',
  tooltip: { bg: 'rgba(22,22,40,0.95)', border: 'rgba(255,94,0,0.2)' },
  weight: '#FF5E00',
  reps: '#60a5fa',
  volume: '#a78bfa',
};

export default function ProgressPage() {
  const { activeUser } = useUser();
  const { workoutData } = useWorkout();
  const [chartView, setChartView] = useState<ChartView>('exercise');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');

  const allExercises = useMemo(() => {
    const set = new Set<string>();
    WEEKLY_SCHEDULE.forEach((day) => {
      day.exercises.forEach((e) => set.add(e.name));
    });
    for (const userId of ['abel', 'keneni'] as UserId[]) {
      const userData = workoutData[userId];
      if (userData) {
        Object.values(userData).forEach((day) => {
          day?.exercises?.forEach((e) => set.add(e.exerciseName));
        });
      }
    }
    return Array.from(set).sort();
  }, [workoutData]);

  const filterByDay = (dateKey: string) => {
    if (selectedDay === 'all') return true;
    return getDayName(dateKey) === selectedDay;
  };

  const progressData = useMemo(() => {
    if (!selectedExercise) return [];
    const userData = workoutData[activeUser];
    if (!userData) return [];

    const data: { dateKey: string; display: string; maxWeight: number; totalReps: number; volume: number }[] = [];

    Object.entries(userData).forEach(([dateKey, day]) => {
      if (!filterByDay(dateKey)) return;
      const exercise = day?.exercises?.find((e) => e.exerciseName === selectedExercise);
      if (!exercise || exercise.sets.length === 0) return;

      data.push({
        dateKey,
        display: formatDisplayDate(dateKey),
        maxWeight: Math.max(...exercise.sets.map((s) => s.weightKg)),
        totalReps: exercise.sets.reduce((sum, s) => sum + s.reps, 0),
        volume: calculateVolume(exercise),
      });
    });

    return data.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [selectedExercise, workoutData, activeUser, selectedDay]);

  const comparisonData = useMemo(() => {
    if (!selectedExercise) return [];
    const getUserData = (userId: UserId) => {
      const userData = workoutData[userId];
      if (!userData) return [];
      const data: { dateKey: string; display: string; maxWeight: number; totalReps: number; volume: number }[] = [];
      Object.entries(userData).forEach(([dateKey, day]) => {
        if (!filterByDay(dateKey)) return;
        const exercise = day?.exercises?.find((e) => e.exerciseName === selectedExercise);
        if (!exercise || exercise.sets.length === 0) return;
        data.push({
          dateKey, display: formatDisplayDate(dateKey),
          maxWeight: Math.max(...exercise.sets.map((s) => s.weightKg)),
          totalReps: exercise.sets.reduce((sum, s) => sum + s.reps, 0),
          volume: calculateVolume(exercise),
        });
      });
      return data.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    };

    const abelData = getUserData('abel');
    const keneniData = getUserData('keneni');
    const merged: Record<string, {
      display: string;
      abelWeight: number; keneniWeight: number;
      abelReps: number; keneniReps: number;
      abelVolume: number; keneniVolume: number;
    }> = {};

    for (const d of abelData) {
      merged[d.dateKey] = { display: d.display, abelWeight: d.maxWeight, abelReps: d.totalReps, abelVolume: d.volume, keneniWeight: 0, keneniReps: 0, keneniVolume: 0 };
    }
    for (const d of keneniData) {
      if (merged[d.dateKey]) {
        merged[d.dateKey].keneniWeight = d.maxWeight;
        merged[d.dateKey].keneniReps = d.totalReps;
        merged[d.dateKey].keneniVolume = d.volume;
      } else {
        merged[d.dateKey] = { display: d.display, keneniWeight: d.maxWeight, keneniReps: d.totalReps, keneniVolume: d.volume, abelWeight: 0, abelReps: 0, abelVolume: 0 };
      }
    }

    return Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)).map(([_, val]) => val);
  }, [selectedExercise, workoutData, selectedDay]);

  const muscleData = useMemo(() => {
    const userData = workoutData[activeUser];
    if (!userData) return [];
    const volumeByGroup: Record<string, number> = {};
    Object.values(userData).forEach((day) => {
      day?.exercises?.forEach((exercise) => {
        const volume = calculateVolume(exercise);
        const groups = EXERCISE_MUSCLE_MAP[exercise.exerciseName] ?? ['Other'];
        groups.forEach((group) => {
          volumeByGroup[group] = (volumeByGroup[group] ?? 0) + volume;
        });
      });
    });
    return Object.entries(volumeByGroup)
      .map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [workoutData, activeUser]);

  // Per-muscle-group volume over time
  const muscleVolumeOverTime = useMemo(() => {
    const userData = workoutData[activeUser];
    if (!userData || !selectedMuscleGroup) return [];
    const dayVolumes: { dateKey: string; display: string; volume: number }[] = [];
    Object.entries(userData).forEach(([dateKey, day]) => {
      let dayVolume = 0;
      day?.exercises?.forEach((exercise) => {
        const volume = calculateVolume(exercise);
        const groups = EXERCISE_MUSCLE_MAP[exercise.exerciseName] ?? ['Other'];
        if (groups.includes(selectedMuscleGroup)) {
          dayVolume += volume;
        }
      });
      if (dayVolume > 0) {
        dayVolumes.push({ dateKey, display: formatDisplayDate(dateKey), volume: dayVolume });
      }
    });
    return dayVolumes.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [workoutData, activeUser, selectedMuscleGroup]);

  const allMuscleGroups = useMemo(() => {
    const set = new Set<string>();
    Object.values(EXERCISE_MUSCLE_MAP).forEach((groups) => groups.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, []);

  const metrics = [
    { key: 'maxWeight', label: 'Max Weight (kg)', color: chartColors.weight },
    { key: 'totalReps', label: 'Total Reps', color: chartColors.reps },
    { key: 'volume', label: 'Volume (kg)', color: chartColors.volume },
  ];

  const comparisonMetrics = [
    { abelKey: 'abelWeight', keneniKey: 'keneniWeight', label: 'Max Weight (kg)' },
    { abelKey: 'abelReps', keneniKey: 'keneniReps', label: 'Total Reps' },
    { abelKey: 'abelVolume', keneniKey: 'keneniVolume', label: 'Volume (kg)' },
  ];

  return (
    <div className="space-y-4 page-enter">
      <h2 className="section-title">Progress</h2>

      {/* View toggle */}
      <div className="pill-group">
        {(['exercise', 'compare', 'muscle'] as ChartView[]).map((view) => (
          <button
            key={view}
            onClick={() => setChartView(view)}
            className={`pill-group-option ${chartView === view ? 'active' : ''}`}
          >
            {view === 'exercise' ? '📊 By Exercise' : view === 'compare' ? '👥 Comparison' : '💪 Muscle Groups'}
          </button>
        ))}
      </div>

      {/* Day & Exercise selectors */}
      {(chartView === 'exercise' || chartView === 'compare') && (
        <>
          <div className="card">
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(148,163,184,0.7)' }}>Day of Week</label>
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="input-field text-left">
              <option value="all">All Days</option>
              {WEEKLY_SCHEDULE.filter((d) => !d.isRestDay).map((day) => (
                <option key={day.dayOfWeek} value={day.dayOfWeek}>{day.label}</option>
              ))}
            </select>
          </div>
          <div className="card">
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(148,163,184,0.7)' }}>Select Exercise</label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="input-field text-left"
            >
              <option value="">Choose an exercise...</option>
              {allExercises.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Exercise Charts */}
      {chartView === 'exercise' && selectedExercise && progressData.length > 0 && (
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.key} className="card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: metric.color }}>{metric.label}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="display" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.text }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} />
                  <Line type="monotone" dataKey={metric.key} stroke={metric.color} strokeWidth={2.5} dot={{ fill: metric.color, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
      {chartView === 'exercise' && selectedExercise && progressData.length === 0 && (
        <div className="card text-center py-8 animate-fadeIn">
          <p style={{ color: 'rgba(148,163,184,0.6)' }}>No data yet for this exercise.</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Log some workouts to see progress!</p>
        </div>
      )}

      {/* Comparison Charts */}
      {chartView === 'compare' && selectedExercise && comparisonData.length > 0 && (
        <div className="space-y-4">
          {comparisonMetrics.map(({ abelKey, keneniKey, label }) => (
            <div key={abelKey} className="card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>{label}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="display" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.text }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} />
                  <Legend formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>} />
                  <Line type="monotone" dataKey={abelKey} stroke={ABEL_COLORS.primary} strokeWidth={2} dot={{ fill: ABEL_COLORS.primary, r: 4 }} name="Abel" />
                  <Line type="monotone" dataKey={keneniKey} stroke={KENENI_COLORS.primary} strokeWidth={2} dot={{ fill: KENENI_COLORS.primary, r: 4 }} name="Keneni" />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(96,165,250,0.1)' }}>
                  <p className="text-[10px] uppercase font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>Abel Best</p>
                  <p className="text-sm font-bold" style={{ color: '#60a5fa' }}>
                    {Math.max(...comparisonData.map((d) => Number(d[abelKey as keyof typeof d])), 0)}
                  </p>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(74,222,128,0.1)' }}>
                  <p className="text-[10px] uppercase font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>Keneni Best</p>
                  <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
                    {Math.max(...comparisonData.map((d) => Number(d[keneniKey as keyof typeof d])), 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {chartView === 'compare' && selectedExercise && comparisonData.length === 0 && (
        <div className="card text-center py-8 animate-fadeIn">
          <p style={{ color: 'rgba(148,163,184,0.6)' }}>No comparison data yet for this exercise.</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Both users need to log this exercise to see side-by-side progress!</p>
        </div>
      )}

      {/* Muscle Group View */}
      {chartView === 'muscle' && (
        <>
          {/* Muscle group selector */}
          <div className="card">
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Select Muscle Group for Trend
            </label>
            <select
              value={selectedMuscleGroup}
              onChange={(e) => setSelectedMuscleGroup(e.target.value)}
              className="input-field text-left"
            >
              <option value="">All groups (overview below)...</option>
              {allMuscleGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Per-muscle-group volume over time chart */}
          {selectedMuscleGroup && muscleVolumeOverTime.length >= 2 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#FF5E00' }}>
                {selectedMuscleGroup} Volume Over Time
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={muscleVolumeOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="display" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.text }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'Volume']} />
                  <Line type="monotone" dataKey="volume" stroke="#FF5E00" strokeWidth={2.5} dot={{ fill: '#FF5E00', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {selectedMuscleGroup && muscleVolumeOverTime.length === 0 && (
            <div className="card text-center py-6 animate-fadeIn">
              <p style={{ color: 'rgba(148,163,184,0.6)' }}>
                No data yet for {selectedMuscleGroup}.
              </p>
              <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
                Log exercises targeting this muscle group to see the trend!
              </p>
            </div>
          )}
          {selectedMuscleGroup && muscleVolumeOverTime.length === 1 && (
            <div className="card text-center py-6 animate-fadeIn">
              <p style={{ color: 'rgba(148,163,184,0.6)' }}>
                1 session logged for {selectedMuscleGroup}. Log more to see trends!
              </p>
            </div>
          )}

          {/* Total volume overview */}
          {muscleData.length > 0 ? (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>Total Volume by Muscle Group</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={muscleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: chartColors.text }} />
                  <YAxis dataKey="muscleGroup" type="category" tick={{ fontSize: 11, fill: 'rgba(148,163,184,0.6)' }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} formatter={(value) => [`${Number(value).toLocaleString()} kg`, 'Volume']} />
                  <Bar dataKey="volume" fill="#FF5E00" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="card text-center py-8 animate-fadeIn">
              <p style={{ color: 'rgba(148,163,184,0.6)' }}>No workout data yet.</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Log some workouts to see muscle group analysis!</p>
            </div>
          )}
          {muscleData.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>Volume Breakdown</h3>
              <div className="space-y-2">
                {muscleData.map((item, i) => {
                  const pct = (item.volume / muscleData[0].volume) * 100;
                  return (
                    <div key={item.muscleGroup} className="animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: 'rgba(203,213,225,0.7)' }}>{item.muscleGroup}</span>
                        <span style={{ color: 'rgba(148,163,184,0.5)' }}>{item.volume.toLocaleString()} kg</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF5E00, #FF7828)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
