import { useMemo } from 'react';
import { useWorkout } from '../context/WorkoutContext';
import { calculateOverallUserRank, RANK_TIERS } from '../utils/ranking';
import { USER_COLORS } from '../types';
import Muscle360Viewer from '../components/threed/Muscle360Viewer';

export default function Muscle360Page() {
  const { workoutData } = useWorkout();

  const abel = useMemo(
    () => calculateOverallUserRank(workoutData, 'abel'),
    [workoutData],
  );
  const keneni = useMemo(
    () => calculateOverallUserRank(workoutData, 'keneni'),
    [workoutData],
  );

  const abelColor = USER_COLORS['abel'].primary;
  const keneniColor = USER_COLORS['keneni'].primary;

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <h2 className="text-lg font-black tracking-[0.2em]" style={{ color: '#FF5E00' }}>
          360° MUSCLE PHYSIQUE
        </h2>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Abel vs Keneni — every muscle group colored by its rank tier
        </p>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <Muscle360Viewer
          labelA={{
            name: 'Abel',
            rank: abel.overallRank,
            tierColor: abel.overallTier.color,
            dotColor: abelColor,
          }}
          labelB={{
            name: 'Keneni',
            rank: keneni.overallRank,
            tierColor: keneni.overallTier.color,
            dotColor: keneniColor,
          }}
          ranksA={abel.muscleRanks}
          ranksB={keneni.muscleRanks}
        />
      </div>

      {/* Tier legend */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: 'var(--border-subtle)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
          Rank Tiers
        </p>
        <div className="flex justify-center gap-2.5 flex-wrap">
          {RANK_TIERS.map((tier) => (
            <div key={tier.name} className="flex items-center gap-1.5">
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ background: tier.color, boxShadow: tier.cssGlow !== 'none' ? tier.cssGlow : undefined }}
              />
              <span className="text-[10px] font-bold" style={{ color: tier.color }}>{tier.name}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[9px] mt-3" style={{ color: 'var(--text-muted)' }}>
          Drag the bodies to rotate. Colors follow each user's peak-set muscle rank.
        </p>
      </div>
    </div>
  );
}
