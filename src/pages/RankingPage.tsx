import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { calculateOverallUserRank, RANK_TIERS } from '../utils/ranking';
import RankBodyMap from '../components/progress/RankBodyMap';

export default function RankingPage() {
  const { activeUser } = useUser();
  const { workoutData } = useWorkout();

  const rankResult = useMemo(
    () => calculateOverallUserRank(workoutData, activeUser),
    [workoutData, activeUser],
  );

  const { overallRank, overallTier, averageLevel, muscleRanks } = rankResult;

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
          Tier Point Average: {averageLevel.toFixed(1)} / 5.0
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
        <RankBodyMap muscleRanks={muscleRanks} />
      </div>

      {/* Tier Legend */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Rank Tiers</p>
        <div className="grid grid-cols-3 gap-2">
          {[...RANK_TIERS].reverse().map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl p-2.5 text-center"
              style={{
                background: `${tier.color}10`,
                border: `1px solid ${tier.color}25`,
              }}
            >
              <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ background: tier.color, boxShadow: tier.cssGlow }} />
              <p className="text-[10px] font-bold" style={{ color: tier.color }}>{tier.name}</p>
              <p className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                {tier.threshold.toLocaleString()}+ pts
              </p>
            </div>
          ))}
        </div>
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
