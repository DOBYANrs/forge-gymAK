import { useEffect, useRef, useState } from 'react';
import createBodyHighlighter, { type IExerciseData, type Muscle } from 'body-highlighter';
import { RANK_TIERS, type MuscleRankResult, type MuscleGroup } from '../../utils/ranking';

interface RankBodyMapProps {
  muscleRanks: MuscleRankResult[];
}

type ViewMuscleDef = { key: Muscle; activity: MuscleGroup };

const FRONT_MUSCLES: ViewMuscleDef[] = [
  { key: 'chest', activity: 'Chest' },
  { key: 'front-deltoids', activity: 'Shoulders' },
  { key: 'biceps', activity: 'Biceps' },
  { key: 'triceps', activity: 'Triceps' },
  { key: 'forearm', activity: 'Forearms' },
  { key: 'abs', activity: 'Abs' },
  { key: 'obliques', activity: 'Abs' },
  { key: 'quadriceps', activity: 'Legs' },
  { key: 'abductors', activity: 'Abductors' },
  { key: 'calves', activity: 'Calves' },
];

const BACK_MUSCLES: ViewMuscleDef[] = [
  { key: 'trapezius', activity: 'Back' },
  { key: 'upper-back', activity: 'Back' },
  { key: 'back-deltoids', activity: 'Shoulders' },
  { key: 'triceps', activity: 'Triceps' },
  { key: 'lower-back', activity: 'Core' },
  { key: 'forearm', activity: 'Forearms' },
  { key: 'adductor', activity: 'Adductors' },
  { key: 'hamstring', activity: 'Hamstrings' },
  { key: 'calves', activity: 'Calves' },
];

const ACTIVITY_BY_MUSCLE = new Map<Muscle, MuscleGroup>(
  [...FRONT_MUSCLES, ...BACK_MUSCLES].map(({ key, activity }) => [key, activity]),
);

export default function RankBodyMap({ muscleRanks }: RankBodyMapProps) {
  const frontRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ label: string; color: string; detail: string } | null>(null);

  useEffect(() => {
    const rankMap = new Map<string, MuscleRankResult>();
    for (const mr of muscleRanks) rankMap.set(mr.muscle, mr);

    const buildData = (defs: ViewMuscleDef[]): IExerciseData[] => {
      const out: IExerciseData[] = [];
      for (const { key, activity } of defs) {
        const rank = rankMap.get(activity);
        if (!rank || rank.peakScore <= 0) continue;
        out.push({ name: activity, muscles: [key], frequency: rank.tier.level + 1 });
      }
      return out;
    };

    const handleClick = ({ muscle }: { muscle: Muscle }) => {
      const activity = ACTIVITY_BY_MUSCLE.get(muscle);
      const rank = activity ? rankMap.get(activity) : undefined;
      setTooltip({
        label: rank?.muscle ?? String(muscle),
        color: rank?.tier.color ?? 'var(--text-muted)',
        detail: rank && rank.peakScore > 0
          ? `Peak: ${rank.peakScore} pts (${rank.peakWeight}kg × ${rank.peakReps})`
          : 'No data yet',
      });
    };

    const colors = RANK_TIERS.map((t) => t.color);

    let front: ReturnType<typeof createBodyHighlighter> | null = null;
    let back: ReturnType<typeof createBodyHighlighter> | null = null;

    if (frontRef.current) {
      front = createBodyHighlighter({
        type: 'anterior',
        data: buildData(FRONT_MUSCLES),
        container: frontRef.current,
        bodyColor: 'rgba(255,255,255,0.06)',
        highlightedColors: colors,
        onClick: handleClick,
      });
    }
    if (backRef.current) {
      back = createBodyHighlighter({
        type: 'posterior',
        data: buildData(BACK_MUSCLES),
        container: backRef.current,
        bodyColor: 'rgba(255,255,255,0.06)',
        highlightedColors: colors,
        onClick: handleClick,
      });
    }

    return () => {
      front?.destroy();
      back?.destroy();
    };
  }, [muscleRanks]);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 justify-center items-start">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Front
          </p>
          <div ref={frontRef} style={{ width: 150, height: 300 }} className="mx-auto" />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Back
          </p>
          <div ref={backRef} style={{ width: 150, height: 300 }} className="mx-auto" />
        </div>
      </div>

      {/* Tier legend */}
      <div className="flex justify-center gap-2.5 flex-wrap">
        {RANK_TIERS.map((tier) => (
          <div key={tier.name} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ background: tier.color, boxShadow: tier.cssGlow !== 'none' ? tier.cssGlow : undefined }} />
            <span className="text-[9px] font-semibold" style={{ color: tier.color }}>{tier.name}</span>
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="mx-auto mt-1 px-3 py-2 rounded-lg text-center"
          style={{ background: 'var(--bg-surface-elevated)', border: `1px solid ${tooltip.color}40`, maxWidth: 260 }}
        >
          <p className="text-xs font-bold" style={{ color: tooltip.color }}>{tooltip.label}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{tooltip.detail}</p>
        </div>
      )}
    </div>
  );
}
