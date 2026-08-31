import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useUser } from '../context/UserContext';
import { useBody } from '../context/BodyContext';
import { USER_COLORS } from '../types';
import type { UserId } from '../types';
import { formatDisplayDate } from '../utils/dates';

const chartColors = {
  grid: 'rgba(255,255,255,0.05)',
  text: 'rgba(148,163,184,0.5)',
  tooltip: { bg: 'rgba(22,22,40,0.95)', border: 'rgba(255,94,0,0.2)' },
};

export default function BodyPage() {
  const { activeUser } = useUser();
  const { saveMetrics, getAllMetrics } = useBody();
  const [showBoth, setShowBoth] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [saved, setSaved] = useState(false);
  const [logForUser, setLogForUser] = useState<UserId>(activeUser);

  // Get metrics for the SELECTED logForUser, not activeUser
  const selectedMetrics = getAllMetrics(logForUser);

  const latestSelected = selectedMetrics.length > 0
    ? selectedMetrics.reduce((a, b) => a.dateKey > b.dateKey ? a : b)
    : null;

  const chartData = useMemo(() => {
    if (showBoth) {
      const abelData = getAllMetrics('abel');
      const keneniData = getAllMetrics('keneni');
      const dateKeys = new Set([...abelData, ...keneniData].map((m) => m.dateKey));
      return Array.from(dateKeys).sort().map((dateKey) => {
        const abel = abelData.find((m) => m.dateKey === dateKey);
        const keneni = keneniData.find((m) => m.dateKey === dateKey);
        return {
          display: formatDisplayDate(dateKey),
          abelWeight: abel?.weightKg ?? null,
          abelHeight: abel?.heightCm ?? null,
          keneniWeight: keneni?.weightKg ?? null,
          keneniHeight: keneni?.heightCm ?? null,
        };
      });
    }
    // Show metrics for the selected logForUser when not showing both
    return selectedMetrics
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((m) => ({
        display: formatDisplayDate(m.dateKey),
        weight: m.weightKg,
        height: m.heightCm,
        abelWeight: null as number | null,
        abelHeight: null as number | null,
        keneniWeight: null as number | null,
        keneniHeight: null as number | null,
      }));
  }, [selectedMetrics, showBoth, getAllMetrics]);

  const latestMetrics = latestSelected;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h) return;
    saveMetrics(logForUser, w, h);
    setWeight('');
    setHeight('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (userId: UserId, dateKey: string) => {
    const key = 'kasaint_gym_body_metrics';
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data[userId]) {
          delete data[userId][dateKey];
          localStorage.setItem(key, JSON.stringify(data));
          window.location.reload();
        }
      }
    } catch {}
  };

  const userMetrics = useMemo(() => {
    const userIds: UserId[] = showBoth ? ['abel', 'keneni'] : [logForUser];
    const entries: { userId: UserId; dateKey: string; display: string; weightKg: number; heightCm: number }[] = [];
    for (const uid of userIds) {
      const metrics = getAllMetrics(uid);
      metrics.forEach((m) => {
        entries.push({
          userId: uid,
          dateKey: m.dateKey,
          display: formatDisplayDate(m.dateKey),
          weightKg: m.weightKg,
          heightCm: m.heightCm,
        });
      });
    }
    return entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [logForUser, showBoth, getAllMetrics]);

  return (
    <div className="space-y-4 page-enter">
      <h2 className="section-title">Body Metrics</h2>

      {/* Quick stats */}
      {latestMetrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Current Weight</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#FF5E00' }}>
              {latestMetrics.weightKg}
              <span className="text-sm ml-1" style={{ color: 'rgba(148,163,184,0.4)' }}>kg</span>
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.5)' }}>Height</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#FF5E00' }}>
              {latestMetrics.heightCm}
              <span className="text-sm ml-1" style={{ color: 'rgba(148,163,184,0.4)' }}>cm</span>
            </p>
          </div>
        </div>
      )}

      {/* User selector */}
      <div className="pill-group">
        {(['abel', 'keneni'] as UserId[]).map((user) => (
          <button
            key={user}
            onClick={() => setLogForUser(user)}
            className={`pill-group-option ${logForUser === user ? 'active' : ''}`}
            style={{
              color: logForUser === user ? (user === 'abel' ? '#60a5fa' : '#4ade80') : undefined,
              background: logForUser === user ? `rgba(${user === 'abel' ? '96,165,250' : '74,222,128'},0.12)` : undefined,
            }}
          >
            {user.charAt(0).toUpperCase() + user.slice(1)}
          </button>
        ))}
      </div>

      {/* Toggle both users */}
      <div className="card flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>Show both users</span>
        <button onClick={() => setShowBoth(!showBoth)} className={`${showBoth ? 'toggle active' : 'toggle'}`}>
          <span className="toggle-knob" />
        </button>
      </div>

      {/* Log form */}
      <form onSubmit={handleSave} className="card" style={{ borderLeft: `3px solid ${USER_COLORS[logForUser].primary}` }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: USER_COLORS[logForUser].primary }}>
          Log {logForUser.charAt(0).toUpperCase() + logForUser.slice(1)}'s Measurements
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>Weight (kg)</label>
            <input type="number" inputMode="decimal" step={0.1} min={0} value={weight}
              onChange={(e) => setWeight(e.target.value)} placeholder="75.0" className="input-field text-center" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'rgba(148,163,184,0.6)' }}>Height (cm)</label>
            <input type="number" inputMode="decimal" step={0.1} min={0} value={height}
              onChange={(e) => setHeight(e.target.value)} placeholder="175" className="input-field text-center" />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!weight || !height}>
          {saved ? '✓ Saved!' : 'Add Metric'}
        </button>
      </form>

      {chartData.length >= 2 && (
        <>
          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>Weight Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="display" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: chartColors.text }} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} />
                {showBoth ? (
                  <>
                    <Legend formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>} />
                    <Line type="monotone" dataKey="abelWeight" stroke={USER_COLORS.abel.primary} strokeWidth={2} dot={{ fill: USER_COLORS.abel.primary, r: 4 }} name="Abel" connectNulls />
                    <Line type="monotone" dataKey="keneniWeight" stroke={USER_COLORS.keneni.primary} strokeWidth={2} dot={{ fill: USER_COLORS.keneni.primary, r: 4 }} name="Keneni" connectNulls />
                  </>
                ) : (
                  <Line type="monotone" dataKey="weight" stroke="#FF5E00" strokeWidth={2.5} dot={{ fill: '#FF5E00', r: 4 }} activeDot={{ r: 6 }} name="Weight (kg)" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>Height Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="display" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: chartColors.text }} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltip.border}`, fontSize: '12px', background: chartColors.tooltip.bg, color: '#e2e8f0' }} />
                {showBoth ? (
                  <>
                    <Legend formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>} />
                    <Line type="monotone" dataKey="abelHeight" stroke={USER_COLORS.abel.primary} strokeWidth={2} dot={{ fill: USER_COLORS.abel.primary, r: 4 }} name="Abel" connectNulls />
                    <Line type="monotone" dataKey="keneniHeight" stroke={USER_COLORS.keneni.primary} strokeWidth={2} dot={{ fill: USER_COLORS.keneni.primary, r: 4 }} name="Keneni" connectNulls />
                  </>
                ) : (
                  <Line type="monotone" dataKey="height" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: '#60a5fa', r: 4 }} activeDot={{ r: 6 }} name="Height (cm)" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Entries list */}
      {userMetrics.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(203,213,225,0.8)' }}>History</h3>
          <div className="space-y-1">
            {userMetrics.map((entry, i) => {
              const entryColor = USER_COLORS[entry.userId];
              return (
                <div
                  key={`${entry.dateKey}-${entry.userId}-${i}`}
                  className="flex items-center justify-between py-2 px-2 rounded-lg transition-all duration-200 group"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entryColor.primary }} />
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>{entry.display}</span>
                    <span className="text-xs font-medium capitalize" style={{ color: entryColor.primary }}>{entry.userId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: 'rgba(203,213,225,0.7)' }}>{entry.weightKg} kg</span>
                    <span className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>{entry.heightCm} cm</span>
                    <button
                      onClick={() => handleDelete(entry.userId, entry.dateKey)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: 'rgba(239,68,68,0.4)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartData.length < 2 && (
        <div className="card text-center py-8">
          <p style={{ color: 'rgba(148,163,184,0.6)' }}>Log at least 2 measurements to see trends.</p>
        </div>
      )}
    </div>
  );
}
