import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useWorkout } from '../context/WorkoutContext';
import { useBody } from '../context/BodyContext';
import { USER_COLORS } from '../types';
import type { UserId } from '../types';
import { formatDisplayDate } from '../utils/dates';
import { calculateVolume } from '../utils/calculations';

const DAYS_30 = 30;

export default function HistoryPage() {
  const { workoutData } = useWorkout();
  const { getAllMetrics } = useBody();
  const [selectedUser, setSelectedUser] = useState<'all' | UserId>('all');

  const last30Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = DAYS_30 - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
    }
    return days;
  }, []);

  const historyEntries = useMemo(() => {
    const users: UserId[] = selectedUser === 'all' ? ['abel', 'keneni'] : [selectedUser];
    const entries: {
      dateKey: string;
      display: string;
      userId: UserId;
      exercises: { name: string; volume: number; sets: number }[];
      totalVolume: number;
    }[] = [];

    for (const dateKey of last30Days) {
      for (const userId of users) {
        const day = workoutData[userId]?.[dateKey];
        if (!day?.exercises?.length) continue;

        entries.push({
          dateKey,
          display: formatDisplayDate(dateKey),
          userId,
          exercises: day.exercises.map((e) => ({
            name: e.exerciseName,
            volume: calculateVolume(e),
            sets: e.sets.length,
          })),
          totalVolume: day.exercises.reduce((sum, e) => sum + calculateVolume(e), 0),
        });
      }
    }

    return entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [selectedUser, workoutData, last30Days]);

  const volumeTrend = useMemo(() => {
    const trendMap: Record<string, { display: string; abelVolume: number; keneniVolume: number }> = {};

    for (const dateKey of last30Days) {
      const display = formatDisplayDate(dateKey);
      const abelDay = workoutData['abel']?.[dateKey];
      const keneniDay = workoutData['keneni']?.[dateKey];

      trendMap[dateKey] = {
        display,
        abelVolume: abelDay?.exercises?.reduce((sum, e) => sum + calculateVolume(e), 0) ?? 0,
        keneniVolume: keneniDay?.exercises?.reduce((sum, e) => sum + calculateVolume(e), 0) ?? 0,
      };
    }

    return Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, val]) => val);
  }, [workoutData, last30Days]);

  const totalWorkouts = historyEntries.length;
  const totalVolume = historyEntries.reduce((sum, e) => sum + e.totalVolume, 0);

  const chartColors = { grid: 'rgba(255,255,255,0.05)', text: 'rgba(148,163,184,0.5)', tooltip: { bg: 'rgba(22,22,40,0.95)', border: 'rgba(255,94,0,0.2)' } };

  return (
    <div className="space-y-4 page-enter">
      <h2 className="section-title">History</h2>

      {/* User filter */}
      <div className="pill-group">
        {(['all', 'abel', 'keneni'] as const).map((user) => (
          <button
            key={user}
            onClick={() => setSelectedUser(user)}
            className={`pill-group-option ${selectedUser === user ? 'active' : ''}`}
            style={{
              color: selectedUser === user && user !== 'all' ? (user === 'abel' ? '#60a5fa' : '#4ade80') : undefined,
            }}
          >
            {user === 'all' ? 'Both' : user.charAt(0).toUpperCase() + user.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Workouts</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#FF5E00' }}>
            {totalWorkouts}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>Last 30 days</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Total Volume</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#FF5E00' }}>
            {totalVolume.toLocaleString()}
            <span className="text-sm ml-1" style={{ color: 'rgba(148,163,184,0.4)' }}>kg</span>
          </p>
        </div>
      </div>

      {/* Volume trend chart */}
      {volumeTrend.some((d) => d.abelVolume > 0 || d.keneniVolume > 0) && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>Daily Volume Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="display" tick={{ fontSize: 9, fill: chartColors.text }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: chartColors.text }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} />
              <Legend formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>} />
              <Line type="monotone" dataKey="abelVolume" stroke="#60a5fa" strokeWidth={2} dot={false} name="Abel" />
              <Line type="monotone" dataKey="keneniVolume" stroke="#4ade80" strokeWidth={2} dot={false} name="Keneni" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body measurements */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>Body Measurements</h3>
        <div className="space-y-2">
          {(['abel', 'keneni'] as UserId[]).map((uid) => {
            const metrics = getAllMetrics(uid);
            if (metrics.length === 0) return null;
            const sorted = [...metrics].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
            const latest = sorted[0];
            const userColor = USER_COLORS[uid];
            return (
              <div key={uid} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: userColor.primary }} />
                  <span className="text-sm font-medium capitalize" style={{ color: '#f1f5f9' }}>{uid}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>Weight </span>
                    <span className="text-sm font-semibold" style={{ color: '#FF5E00' }}>{latest.weightKg} kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>Height </span>
                    <span className="text-sm font-semibold" style={{ color: '#60a5fa' }}>{latest.heightCm} cm</span>
                  </div>
                </div>
              </div>
            );
          })}
          {(['abel', 'keneni'] as UserId[]).every((uid) => getAllMetrics(uid).length === 0) && (
            <p className="text-sm text-center py-3" style={{ color: 'rgba(148,163,184,0.6)' }}>
              No body measurements logged yet. Go to Body page to add them.
            </p>
          )}
        </div>
      </div>

      {/* Daily entries */}
      {historyEntries.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Workout Log</h3>
          {historyEntries.map((entry, idx) => {
            const userColor = USER_COLORS[entry.userId];
            return (
              <details key={`${entry.dateKey}-${entry.userId}-${idx}`} className="card group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: userColor.primary }} />
                      <div>
                        <p className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{entry.display}</p>
                        <p className="text-[10px] font-medium capitalize" style={{ color: userColor.primary }}>
                          {entry.userId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: '#FF5E00' }}>
                        {entry.totalVolume.toLocaleString()} kg
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        {entry.exercises.length} exercises
                      </p>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 space-y-1.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {entry.exercises.map((ex, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span style={{ color: 'rgba(203,213,225,0.7)' }}>{ex.name}</span>
                      <span style={{ color: 'rgba(148,163,184,0.5)' }}>
                        {ex.sets} sets · {ex.volume.toLocaleString()} kg
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p style={{ color: 'rgba(148,163,184,0.6)' }}>No workouts logged in the last 30 days.</p>
        </div>
      )}
    </div>
  );
}
