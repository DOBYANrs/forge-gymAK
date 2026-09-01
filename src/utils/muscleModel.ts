import * as THREE from 'three';
import { getMuscleRankFor, type MuscleGroup, type MuscleRankResult } from './ranking';

// Map each GLB muscle-mesh name to its muscle-group category for rank coloring.
// null => a neutral skin tone (not a scorable muscle).
export const MESH_TO_MUSCLE: Record<string, MuscleGroup | null> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  lats: 'Back',
  upper_back: 'Back',
  glutes: 'Legs',
  lower_back: 'Back',
  triceps: 'Triceps',
  quads: 'Legs',
  hamstings: 'Hamstrings',
  adductor: 'Adductors',
  calves: 'Calves',
  biceps: 'Biceps',
  abs: 'Abs',
  forearms: 'Forearms',
  neck: null,
  main_body001: null,
};

const NEUTRAL_COLOR = 0x171a24;
const EMISSIVE_INTENSITY = 0.35;

// Color a loaded model's muscle meshes by their rank tier. Clones each mesh's
// shared material so the result is independent per body.
export function applyRankColors(
  model: THREE.Object3D,
  rankMap: Map<MuscleGroup, MuscleRankResult>,
): void {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;

    const cloned = mat.clone();
    const muscle = MESH_TO_MUSCLE[child.name];
    if (muscle) {
      const rank = rankMap.get(muscle);
      // No data (peakScore 0) fall back to generic Beginner tier.
      const tier = rank && rank.peakScore > 0 ? rank.tier : getMuscleRankFor(muscle, 0);
      const color = new THREE.Color(tier.color);
      cloned.color.copy(color);
      cloned.emissive.copy(color);
      cloned.emissiveIntensity = EMISSIVE_INTENSITY;
      cloned.metalness = 0.15;
      cloned.roughness = 0.55;
    } else {
      cloned.color.set(NEUTRAL_COLOR);
      cloned.emissive.set(NEUTRAL_COLOR);
      cloned.emissiveIntensity = 0.06;
      cloned.metalness = 0.3;
      cloned.roughness = 0.7;
    }
    child.material = cloned;
  });
}

// Build a rank lookup Map from a MuscleRankResult[] array.
export function toRankMap(ranks: MuscleRankResult[]): Map<MuscleGroup, MuscleRankResult> {
  const map = new Map<MuscleGroup, MuscleRankResult>();
  for (const r of ranks) map.set(r.muscle, r);
  return map;
}
