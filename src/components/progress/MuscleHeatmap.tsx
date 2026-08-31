import { useMemo } from 'react';
import type { MuscleScore } from '../../utils/muscleScoring';
import { TIERS } from '../../utils/muscleScoring';
import AnatomyBody from './AnatomyBody';

interface MuscleHeatmapProps {
  muscleScores: MuscleScore[];
}

export default function MuscleHeatmap({ muscleScores }: MuscleHeatmapProps) {
  // Separate scored muscles by view
  const frontMuscles = ['Chest', 'Shoulders', 'Biceps', 'Abs', 'Quads', 'Forearms', 'Calves', 'Abductors', 'Adductors'];
  const backMuscles = ['Back', 'Shoulders', 'Triceps', 'Hamstrings', 'Calves', 'Forearms', 'Abs'];

  const frontScores = useMemo(() =>
    muscleScores.filter(s => frontMuscles.includes(s.muscle)),
    [muscleScores]
  );

  const backScores = useMemo(() =>
    muscleScores.filter(s => backMuscles.includes(s.muscle)),
    [muscleScores]
  );

  return (
    <div className="space-y-4">
      {/* Front + Back views side by side */}
      <div className="flex gap-6 justify-center items-start">
        <AnatomyBody muscleScores={frontScores} view="front" width={130} />
        <AnatomyBody muscleScores={backScores} view="back" width={130} />
      </div>

      {/* Tier legend */}
      <div className="flex justify-center gap-3 flex-wrap">
        {[...TIERS].filter(t => t.name !== 'Beginner').map(tier => (
          <div key={tier.name} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: tier.color, boxShadow: tier.cssGlow !== 'none' ? tier.cssGlow : undefined }}
            />
            <span className="text-[9px] font-semibold" style={{ color: tier.color }}>
              {tier.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
