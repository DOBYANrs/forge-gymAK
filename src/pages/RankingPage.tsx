import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { calculateOverallUserRank, getTodayActivatedMuscles } from '../utils/ranking';
import { COMPOUND_LIFTS } from '../utils/tierEngine';
import RankBodyMap from '../components/progress/RankBodyMap';

export default function RankingPage() {
  const { activeUser } = useUser();
  const { workoutData } = useWorkout();

  const rankResult = useMemo(
    () => calculateOverallUserRank(workoutData, activeUser),
    [workoutData, activeUser],
  );

  const activeToday = useMemo(
    () => getTodayActivatedMuscles(workoutData, activeUser),
    [workoutData, activeUser],
  );

  const { overallRank, overallTier, averageLevel, overallZ, liftResults, muscleRanks } = rankResult;

  return (
    <div className="space-y-4 page-enter">
      {/* Header with overall rank */}
      <div
        className="rounded-2xl p-6 text-center overflow-hidden relative"
        style={{
          background: `linear-gradient(160deg, ${overallTier.color}15, ${overallTier.color}05)`,
          border: `1px solid ${overallTier.color}30`,
          boxShadow: overallTier.cssGlow !== 'none' ? overallTier.cssGlow : undefined,
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>
          Overall Strength Rank
        </p>
        <p className="text-5xl font-black mb-1" style={{ color: overallTier.color }}>
          {overallRank}
        </p>
        <p className="text-sm font-bold" style={{ color: overallTier.color }}>
          Median Z: {typeof overallZ === 'number' ? overallZ.toFixed(2) : '—'} · Tier Avg: {averageLevel.toFixed(1)} / 6.0
        </p>
      </div>

      {/* 2D Body Heatmap */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
          Muscle Strength Map — Click a Muscle for Details
        </p>
        <RankBodyMap muscleRanks={muscleRanks} activeToday={activeToday} />
      </div>

      {/* Scientific Session Report */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Strength Tier Report</p>
        <p className="text-[9px] mb-3" style={{ color: 'var(--text-muted)' }}>
          e1RM = Reps^0.10 × Load · Scaled = e1RM / BW^0.67 · Z = (Scaled − μ) / σ · Overall = median compound Z
        </p>
        {liftResults && liftResults.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[9px]">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="text-left font-semibold pb-1">Lift</th>
                    <th className="font-semibold pb-1">e1RM</th>
                    <th className="font-semibold pb-1">Scaled</th>
                    <th className="font-semibold pb-1">Z</th>
                    <th className="font-semibold pb-1">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {[...liftResults]
                    .sort((a, b) => Number(COMPOUND_LIFTS.includes(b.lift as never)) - Number(COMPOUND_LIFTS.includes(a.lift as never)))
                    .map((r) => {
                      const isCompound = COMPOUND_LIFTS.includes(r.lift as never);
                      return (
                        <tr key={r.lift} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', opacity: isCompound ? 1 : 0.45 }}>
                          <td className="py-1 pr-2 font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {r.lift}
                            {r.hasData && <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>({r.bestLoad}kg×{r.bestReps})</span>}
                          </td>
                          <td className="py-1 text-center" style={{ color: 'var(--text-muted)' }}>{r.e1RM.toFixed(1)}</td>
                          <td className="py-1 text-center" style={{ color: 'var(--text-muted)' }}>{r.scaled.toFixed(2)}</td>
                          <td className="py-1 text-center" style={{ color: r.z >= 0 ? r.tier.color : 'var(--text-muted)' }}>{r.z.toFixed(2)}</td>
                          <td className="py-1 text-center">
                            <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${r.tier.color}20`, color: r.tier.color }}>
                              {r.tier.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Shaded rows are compound lifts (included in the overall median). Isolation moves are dimmed and reported separately.
            </p>
          </>
        ) : (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            No logged sets yet — log lifts to generate your scientific strength report.
          </p>
        )}
      </div>

      {/* Muscle Group Rankings */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Muscle Rankings (Peak Set Score)</p>
        <div className="space-y-2">
          {muscleRanks.map((mr) => {
            const maxScore = Math.max(...muscleRanks.map((m) => m.peakScore), 1);
            const barWidth = mr.peakScore > 0 ? (mr.peakScore / maxScore) * 100 : 0;
            const hasData = mr.peakScore > 0;

            return (
              <div key={mr.muscle} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: hasData ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>
                      {mr.muscle}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: `${mr.tier.color}20`, color: mr.tier.color }}
                      >
                        {mr.tier.name}
                      </span>
                      {hasData && (
                        <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
                          {mr.peakWeight}kg × {mr.peakReps}
                        </span>
                      )}
                      <span className="text-xs font-bold" style={{ color: hasData ? mr.tier.color : 'rgba(255,255,255,0.2)' }}>
                        {mr.peakScore.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        background: hasData ? mr.tier.color : 'rgba(255,255,255,0.06)',
                        boxShadow: hasData && mr.tier.cssGlow !== 'none' ? `0 0 8px ${mr.tier.color}40` : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
