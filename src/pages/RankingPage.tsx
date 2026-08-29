import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useWorkout } from '../context/WorkoutContext';
import { calculateAllMuscleScores, getTotalLifetimeScore, getTier, TIERS } from '../utils/muscleScoring';
import BodyHeatmap3D from '../components/progress/BodyHeatmap3D';

export default function RankingPage() {
  const { activeUser } = useUser();
  const { workoutData } = useWorkout();

  const muscleScores = useMemo(
    () => calculateAllMuscleScores(workoutData, activeUser),
    [workoutData, activeUser],
  );

  const totalScore = useMemo(() => getTotalLifetimeScore(muscleScores), [muscleScores]);
  const totalTier = getTier(totalScore);

  // Sort muscles by score descending
  const sorted = useMemo(() => [...muscleScores].sort((a, b) => b.score - a.score), [muscleScores]);

  return (
    <div className="space-y-4 page-enter">
      {/* Header with total score */}
      <div
        className="rounded-2xl p-6 text-center overflow-hidden relative"
        style={{
          background: `linear-gradient(160deg, ${totalTier.color}15, ${totalTier.color}05)`,
          border: `1px solid ${totalTier.color}30`,
          boxShadow: totalTier.cssGlow !== 'none' ? totalTier.cssGlow : undefined,
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>
          Lifetime Strength Rank
        </p>
        <p className="text-5xl font-black mb-1" style={{ color: totalTier.color }}>
          {totalScore.toLocaleString()}
        </p>
        <p className="text-sm font-bold" style={{ color: totalTier.color }}>
          {totalTier.name}
        </p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {totalTier.glow}
        </p>
      </div>

      {/* 3D Heatmap */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
          3D Muscle Map — Drag to Rotate
        </p>
        <BodyHeatmap3D muscleScores={muscleScores} height={320} />
      </div>

      {/* Tier Legend */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Rank Tiers</p>
        <div className="grid grid-cols-3 gap-2">
          {[...TIERS].reverse().map((tier) => (
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
                {tier.minScore.toLocaleString()}+
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Muscle Rankings */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Muscle Rankings</p>
        <div className="space-y-2">
          {sorted.map((ms, i) => {
            const maxScore = Math.max(...sorted.map((s) => s.score), 1);
            const barWidth = (ms.score / maxScore) * 100;

            return (
              <div key={ms.muscle} className="flex items-center gap-3">
                <span className="w-5 text-center text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  #{i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {ms.muscle}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: `${ms.tier.color}20`, color: ms.tier.color }}
                      >
                        {ms.tier.name}
                      </span>
                      <span className="text-xs font-bold" style={{ color: ms.tier.color }}>
                        {ms.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        background: ms.tier.color,
                        boxShadow: ms.tier.cssGlow !== 'none' ? `0 0 8px ${ms.tier.color}40` : undefined,
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
