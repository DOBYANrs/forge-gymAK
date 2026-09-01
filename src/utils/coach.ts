import type { ExerciseLog, UserId } from '../types';
import {
  calculateOverallUserRank,
  getActivatedMusclesOnDate,
  type MuscleGroup,
  type TierInfo,
} from './ranking';

// ============================================================
// OFFLINE COACH
// Everything here runs purely from local workout data — no network,
// no AI. It works even with the phone fully offline.
// ============================================================

export interface CoachInsights {
  summary: string;
  advice: string[]; // 2-3 short lines
  weakest: { muscle: MuscleGroup; tier: TierInfo }[];
  totalExercises: number;
  totalSets: number;
  totalVolume: number;
  todayGroups: string[];
}

type DayLike = { exercises: ExerciseLog[] } | undefined;

function summarizeDay(workoutData: Record<string, Record<string, DayLike>>, userId: UserId, dateKey: string) {
  const day = workoutData[userId]?.[dateKey];
  let totalSets = 0;
  let totalVolume = 0;
  let totalExercises = 0;

  for (const ex of day?.exercises ?? []) {
    let filled = 0;
    for (const set of ex.sets) {
      if (set.weightKg > 0 && set.reps > 0) {
        filled += 1;
        totalSets += 1;
        totalVolume += set.weightKg * set.reps;
      }
    }
    if (filled > 0) totalExercises += 1;
  }
  return { totalExercises, totalSets, totalVolume };
}

function formatVolume(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

// Identify the muscle groups the user is weakest in: first truly untrained
// ones, then the lowest-tier trained ones.
function findLacking(sorted: { muscle: MuscleGroup; peakScore: number; tier: TierInfo }[]) {
  const untrained = sorted.filter((m) => m.peakScore <= 0).map((m) => m.muscle);
  const trained = sorted
    .filter((m) => m.peakScore > 0)
    .sort((a, b) => a.tier.level - b.tier.level || a.peakScore - b.peakScore);
  return { untrained, trained };
}

export function buildCoachInsights(
  workoutData: Record<string, Record<string, DayLike>>,
  userId: UserId,
  dateKey: string,
): CoachInsights {
  const rankResult = calculateOverallUserRank(
    workoutData as never,
    userId,
  );

  const { totalExercises, totalSets, totalVolume } = summarizeDay(workoutData, userId, dateKey);
  const todayGroups = getActivatedMusclesOnDate(workoutData as never, userId, dateKey);

  // Summary: 1-2 lines
  const groupsText = todayGroups.length > 0 ? todayGroups.join(', ') : 'no muscles logged';
  const summary =
    `${totalExercises} move${totalExercises === 1 ? '' : 's'} · ${totalSets} set${totalSets === 1 ? '' : 's'} · ` +
    `${formatVolume(totalVolume)}kg volume — hit ${groupsText.toLowerCase()}.`;

  // Weakest muscle analysis
  const sorted = rankResult.muscleRanks
    .slice()
    .sort((a, b) => b.peakScore - a.peakScore)
    .map((m) => ({ muscle: m.muscle, peakScore: m.peakScore, tier: m.tier }));

  const weakest: { muscle: MuscleGroup; tier: TierInfo }[] = sorted
    .filter((m) => m.peakScore <= 0 || m.tier.level <= 1)
    .map((m) => ({ muscle: m.muscle, tier: m.tier }))
    .slice(0, 3);

  const { untrained, trained } = findLacking(sorted);

  // ===== Build 2-3 advice lines =====
  const advice: string[] = [];

  const untrainedTop = untrained.slice(0, 3);
  if (untrainedTop.length > 0) {
    advice.push(
      `You haven't trained ${untrainedTop.join(' & ')} yet — start them now to grow your ranks.`,
    );
  }

  if (trained.length > 0 && advice.length < 3) {
    const low = trained.filter((m) => m.tier.level <= 2);
    if (low.length >= 2) {
      advice.push(
        `${low[0].muscle} (${low[0].tier.name}) & ${low[1].muscle} (${low[1].tier.name}) are your weakest — add a 2nd weekly session.`,
      );
    } else if (low.length === 1) {
      advice.push(`${low[0].muscle} (${low[0].tier.name}) is your weakest — push it with an extra weekly session.`);
    }
  }

  // Balance check: any whole side/category never trained?
  if (advice.length < 3) {
    const trainedSet = new Set(sorted.filter((m) => m.peakScore > 0).map((m) => m.muscle));
    const lower = ['Legs', 'Hamstrings', 'Calves'].filter((m) => !trainedSet.has(m as MuscleGroup));
    const core = ['Abs', 'Core'].filter((m) => !trainedSet.has(m as MuscleGroup));
    if (lower.length === 3) {
      advice.push(`Your whole lower body is untrained — don't skip leg days for a balanced physique.`);
    } else if (core.length === 2) {
      advice.push(`Train your core (Abs) more — core strength protects your back.`);
    }
  }

  if (advice.length === 0) {
    advice.push(`Strong all-rounders! Keep progressing with steady weight increases each week.`);
  }

  return {
    summary,
    advice: advice.slice(0, 3),
    weakest,
    totalExercises,
    totalSets,
    totalVolume,
    todayGroups,
  };
}
