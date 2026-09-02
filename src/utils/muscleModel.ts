import * as THREE from 'three';
import type { MuscleGroup, MuscleRankResult } from './ranking';

// Map each GLB muscle-mesh name to its muscle-group category for rank coloring.
// null => the uncolored/skin parts (not a scorable muscle).
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

// Steel blue-grey "skin" for the non-muscle parts. Brighter than the old
// near-black so the body reads clearly against the colored muscles.
export const NEUTRAL_COLOR = 0x465672;
export const NEUTRAL_METALNESS = 0.18;
export const NEUTRAL_ROUGHNESS = 0.4;
export const NEUTRAL_EMISSIVE_INTENSITY = 0.14;

// Base emissive for ranked muscle groups (they "glow" against the skin).
export const EMISSIVE_INTENSITY = 0.45;
export const MUSCLE_METALNESS = 0.15;
export const MUSCLE_ROUGHNESS = 0.45;

// Shared scene/rendering feel so the intro video and the 360 page match.
export const EXPOSURE = 2.4;

// Pulses the given muscle materials' emissive between a low/high so the
// ranked groups appear to softly breathe/glow.
export function pulseMuscles(
  muscleMats: THREE.MeshStandardMaterial[],
  time: number,
  base = EMISSIVE_INTENSITY,
  range = 0.25,
): void {
  if (!muscleMats.length) return;
  const k = base + Math.sin(time * 1.8) * range;
  for (const m of muscleMats) m.emissiveIntensity = k;
}

// Color a loaded model's muscle meshes by their rank tier. Clones each mesh's
// material so the result is independent per body. Returns the array of ranked
// muscle materials (for the glow pulse); skin parts share the NEUTRAL color.
export function applyRankColors(
  model: THREE.Object3D,
  rankMap: Map<MuscleGroup, MuscleRankResult>,
): THREE.MeshStandardMaterial[] {
  const muscleMats: THREE.MeshStandardMaterial[] = [];
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;

    const cloned = mat.clone();
    const muscle = MESH_TO_MUSCLE[child.name];
    const rank = muscle ? rankMap.get(muscle) : undefined;
    if (muscle && rank && (rank.score ?? 0) > 0) {
      // Muscle with real training data -> show its rank tier color.
      const color = new THREE.Color(rank.tier.color);
      cloned.color.copy(color);
      cloned.emissive.copy(color);
      cloned.emissiveIntensity = EMISSIVE_INTENSITY;
      cloned.metalness = MUSCLE_METALNESS;
      cloned.roughness = MUSCLE_ROUGHNESS;
      muscleMats.push(cloned);
    } else {
      // Untrained muscle (or skin part) -> steel-blue skin so it blends cleanly
      // with the body instead of showing a dull Beginner gray.
      cloned.color.set(NEUTRAL_COLOR);
      cloned.emissive.copy(new THREE.Color(NEUTRAL_COLOR));
      cloned.emissiveIntensity = NEUTRAL_EMISSIVE_INTENSITY;
      cloned.metalness = NEUTRAL_METALNESS;
      cloned.roughness = NEUTRAL_ROUGHNESS;
    }
    child.material = cloned;
  });
  return muscleMats;
}

// Build a rank lookup Map from a MuscleRankResult[] array.
export function toRankMap(ranks: MuscleRankResult[]): Map<MuscleGroup, MuscleRankResult> {
  const map = new Map<MuscleGroup, MuscleRankResult>();
  for (const r of ranks) map.set(r.muscle, r);
  return map;
}
