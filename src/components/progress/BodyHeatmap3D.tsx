import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface BodyHeatmap3DProps {
  muscleScores: MuscleScore[];
  height?: number;
}

/*
 * This model is Z-up (Blender export). Z = height (-0.5 feet, +0.5 head)
 * Y = front-back depth, X = left-right width.
 *
 * 10 meshes (anatomical layers):
 *   Mesh 0: Lower body structure (Z: -0.5 to 0.12, Y: centered)
 *   Mesh 1: Lower body structure (Z: -0.5 to 0.11, Y: centered)
 *   Mesh 2: Abs/organs (Z: -0.30 to 0.18, Y: front-biased)
 *   Mesh 3: Full anterior torso (Z: -0.50 to 0.49, Y: front)
 *   Mesh 4: Front-only muscles (Z: full, Y: 0.02 to 0.14)
 *   Mesh 5: Upper anterior (Z: -0.35 to 0.50, Y: front, lateral)
 *   Mesh 6: Full body outline (Z: full, Y: balanced)
 *   Mesh 7: Back-only muscles (Z: full, Y: -0.11 to -0.02)
 *   Mesh 8: Posterior muscles (Z: full, Y: -0.16 to -0.04)
 *   Mesh 9: Upper back (Z: -0.32 to 0.50, Y: -0.16 to -0.09)
 */

// Neutral color for untrained areas
const NEUTRAL_COLOR = new THREE.Color(0x2a2e3d);

export default function BodyHeatmap3D({ muscleScores, height = 400 }: BodyHeatmap3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    model: THREE.Group;
    animationId: number;
    isDragging: boolean;
    previousMousePosition: { x: number; y: number };
  } | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string>('');
  const [hoveredScore, setHoveredScore] = useState<number>(0);
  const [hoveredTier, setHoveredTier] = useState<string>('');
  const [hoveredTierColor, setHoveredTierColor] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const scoresMap = useMemo(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) {
      map.set(s.muscle, s);
    }
    return map;
  }, [muscleScores]);

  /**
   * Get the color for a muscle, using the tier system.
   * Returns a vivid color with emissive for high-tier muscles.
   */
  function getMuscleColor(muscle: string | null): { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number } {
    if (!muscle) return { color: NEUTRAL_COLOR.clone(), emissive: new THREE.Color(0x000000), emissiveIntensity: 0 };

    const score = scoresMap.get(muscle);
    if (!score || score.score === 0) {
      return { color: NEUTRAL_COLOR.clone(), emissive: new THREE.Color(0x111122), emissiveIntensity: 0.1 };
    }

    const tier = score.tier;
    const baseColor = new THREE.Color(tier.color);

    // Make colors brighter and more vivid
    const brightness = 0.15;
    const brightColor = baseColor.clone().lerp(new THREE.Color(0xffffff), brightness);

    // Emissive intensity scales with tier (Legendary = max glow)
    let emissiveStrength: number;
    switch (tier.name) {
      case 'Legendary':    emissiveStrength = 1.8; break;
      case 'Elite':        emissiveStrength = 1.4; break;
      case 'Advanced':     emissiveStrength = 1.0; break;
      case 'Intermediate': emissiveStrength = 0.7; break;
      case 'Novice':       emissiveStrength = 0.5; break;
      default:             emissiveStrength = 0.2;
    }

    const emissive = baseColor.clone().multiplyScalar(emissiveStrength);

    return { color: brightColor, emissive, emissiveIntensity: emissiveStrength * 0.8 };
  }

  /**
   * Determine which muscle group a vertex belongs to based on its RAW 3D position.
   *
   * IMPORTANT: The GLB model has a node matrix that SWAPS axes:
   *   Node matrix [1,0,0,0, 0,0,1,0, 0,-1,0,0, 0,0.498,0,1]
   *   Means: rendered_Y = raw_Z, rendered_Z = -raw_Y
   *
   * So in raw vertex coordinates:
   *   X: -0.081 to 0.083 (width — stays as X)
   *   Y: -0.172 to 0.148 (raw Y → rendered as -Z = depth)
   *   Z: -0.497 to 0.147 (raw Z → rendered as Y = HEIGHT)
   *
   * In the SCENE after transform:
   *   scene_Y (up) = raw_Z  (so raw_Z > 0 = head, raw_Z < 0 = feet)
   *   scene_Z (depth) = -raw_Y (so raw_Y > 0 = BACK, raw_Y < 0 = FRONT)
   */
  function getVertexMuscle3D(x: number, y: number, z: number): string | null {
    const absX = Math.abs(x);
    // After the node matrix: scene_depth = -raw_Y
    // raw_Y > 0 → scene_Z negative → FRONT
    // raw_Y < 0 → scene_Z positive → BACK
    const isFront = y > 0;  // raw_Y positive = front of body
    // After the node matrix: scene_height = raw_Z
    // raw_Z > 0 → head end, raw_Z < 0 → feet end

    // ===== ARMS (far from center on X: absX > 0.055) =====
    if (absX > 0.055) {
      if (z > 0.08) return 'Shoulders';          // Top of arm / shoulder
      if (z > -0.02) return isFront ? 'Biceps' : 'Triceps';  // Upper arm
      if (z > -0.15) return isFront ? 'Biceps' : 'Triceps';  // Mid arm
      if (z > -0.30) return 'Forearms';           // Lower arm
      return 'Forearms';                           // Wrist area
    }

    // ===== TORSO (absX < 0.055) =====
    if (absX < 0.055) {
      // Head/neck — raw_Z above 0.10
      if (z > 0.10) return null;

      // Shoulders / traps — raw_Z: 0.06 to 0.10
      if (z > 0.06) return 'Shoulders';

      // Upper torso — raw_Z: 0.02 to 0.06
      if (z > 0.02) {
        return isFront ? 'Chest' : 'Back';
      }

      // Mid torso — raw_Z: -0.04 to 0.02
      if (z > -0.04) {
        return isFront ? 'Abs' : 'Abs';
      }

      // Lower torso / hips — raw_Z: -0.10 to -0.04
      if (z > -0.10) {
        return isFront ? 'Abs' : 'Abs';
      }
    }

    // ===== LEGS (raw_Z < -0.10) =====
    if (z < -0.10) {
      // Thighs — raw_Z: -0.10 to -0.35
      if (z > -0.35) {
        return isFront ? 'Quads' : 'Hamstrings';
      }

      // Lower thighs / knees — raw_Z: -0.35 to -0.42
      if (z > -0.42) {
        return isFront ? 'Quads' : 'Hamstrings';
      }

      // Calves / shins — raw_Z < -0.42
      return 'Calves';
    }

    return null;
  }

  /**
   * Apply colors to the model using PURE position-based vertex coloring.
   * Every vertex is colored based on its 3D coordinates, not mesh index.
   */
  const applyColors = (model: THREE.Group) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geo = child.geometry;
        const positions = geo.getAttribute('position') as THREE.BufferAttribute;
        if (!positions) return;

        // Create per-vertex colors
        const colors = new Float32Array(positions.count * 3);
        const primaryMuscleCounts = new Map<string, number>();

        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);

          const muscle = getVertexMuscle3D(x, y, z);
          const { color: vertexColor } = getMuscleColor(muscle);

          colors[i * 3] = vertexColor.r;
          colors[i * 3 + 1] = vertexColor.g;
          colors[i * 3 + 2] = vertexColor.b;

          // Track most common muscle for hover detection
          if (muscle) {
            primaryMuscleCounts.set(muscle, (primaryMuscleCounts.get(muscle) || 0) + 1);
          }
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Find dominant muscle for this mesh (for hover)
        let dominantMuscle = '';
        let maxCount = 0;
        for (const [muscle, count] of primaryMuscleCounts) {
          if (count > maxCount) { maxCount = count; dominantMuscle = muscle; }
        }

        const { emissive, emissiveIntensity } = getMuscleColor(dominantMuscle || null);
        const score = scoresMap.get(dominantMuscle);

        child.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.3,
          metalness: 0.1,
          emissive,
          emissiveIntensity,
          transparent: false,
          opacity: 1.0,
          side: THREE.DoubleSide,
        });

        child.userData.muscleName = dominantMuscle || 'Body';
        child.userData.score = score?.score ?? 0;
        child.userData.tierName = score?.tier.name ?? 'None';
        child.userData.tierColor = score?.tier.color ?? '#9CA3AF';
      }
    });
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0C10);

    const camera = new THREE.PerspectiveCamera(40, width / h, 0.1, 100);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0B0C10, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;
    container.appendChild(renderer.domElement);

    // VIVID lighting — bright enough to see tier colors clearly
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.5);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, 1.2);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
    topLight.position.set(0, 6, 0);
    scene.add(topLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    // Subtle ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.3 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.8;
    scene.add(ground);

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      '/forge-gymAK/male_anatomy.glb',
      (gltf) => {
        const model = gltf.scene;

        // Center and scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.3;

        // Apply per-mesh + vertex coloring
        applyColors(model);
        scene.add(model);

        const state = {
          scene, camera, renderer, model,
          animationId: 0, isDragging: false,
          previousMousePosition: { x: 0, y: 0 },
        };
        sceneRef.current = state;
        setIsLoading(false);

        // Mouse interaction
        const onMouseDown = (e: MouseEvent) => {
          state.isDragging = true;
          state.previousMousePosition = { x: e.clientX, y: e.clientY };
        };
        const onMouseMove = (e: MouseEvent) => {
          if (!state.isDragging) return;
          const deltaX = e.clientX - state.previousMousePosition.x;
          const deltaY = e.clientY - state.previousMousePosition.y;
          model.rotation.y += deltaX * 0.008;
          model.rotation.x += deltaY * 0.004;
          model.rotation.x = Math.max(-0.8, Math.min(0.8, model.rotation.x));
          state.previousMousePosition = { x: e.clientX, y: e.clientY };

          // Hover detection
          const rect = renderer.domElement.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(model.children, true);
          if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData.muscleName && obj.userData.muscleName !== 'Body') {
              setHoveredMuscle(obj.userData.muscleName);
              setHoveredScore(obj.userData.score);
              setHoveredTier(obj.userData.tierName);
              setHoveredTierColor(obj.userData.tierColor);
            } else {
              setHoveredMuscle('');
            }
          } else {
            setHoveredMuscle('');
          }
        };
        const onMouseUp = () => { state.isDragging = false; };

        const onTouchStart = (e: TouchEvent) => {
          if (e.touches.length === 1) {
            state.isDragging = true;
            state.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
        };
        const onTouchMove = (e: TouchEvent) => {
          if (!state.isDragging || e.touches.length !== 1) return;
          const deltaX = e.touches[0].clientX - state.previousMousePosition.x;
          const deltaY = e.touches[0].clientY - state.previousMousePosition.y;
          model.rotation.y += deltaX * 0.008;
          model.rotation.x += deltaY * 0.004;
          model.rotation.x = Math.max(-0.8, Math.min(0.8, model.rotation.x));
          state.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };
        const onTouchEnd = () => { state.isDragging = false; };

        const canvas = renderer.domElement;
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', onTouchMove, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd);

        let time = 0;
        const animate = () => {
          state.animationId = requestAnimationFrame(animate);
          time += 0.004;
          if (!state.isDragging) model.rotation.y = Math.sin(time) * 0.4;
          renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
          const w = container.clientWidth;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        (state as any)._cleanup = () => {
          window.removeEventListener('resize', onResize);
          canvas.removeEventListener('mousedown', onMouseDown);
          canvas.removeEventListener('mousemove', onMouseMove);
          canvas.removeEventListener('mouseup', onMouseUp);
          canvas.removeEventListener('mouseleave', onMouseUp);
          canvas.removeEventListener('touchstart', onTouchStart);
          canvas.removeEventListener('touchmove', onTouchMove);
          canvas.removeEventListener('touchend', onTouchEnd);
        };
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (error) => {
        console.error('Failed to load model:', error);
        setIsLoading(false);
      },
    );

    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        (sceneRef.current as any)._cleanup?.();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [scoresMap, height]);

  // Update colors when scores change
  useEffect(() => {
    if (!sceneRef.current) return;
    applyColors(sceneRef.current.model);
  }, [scoresMap]);

  // Build legend
  const scoredMuscles = useMemo(() => {
    return muscleScores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [muscleScores]);

  return (
    <div className="relative">
      <div ref={mountRef} style={{ width: '100%', height }} className="rounded-xl overflow-hidden" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(11,12,16,0.9)' }}>
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[var(--accent-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Loading 3D model... {loadProgress > 0 && `${loadProgress}%`}
            </p>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredMuscle && (
        <div
          className="absolute top-2 left-2 px-3 py-2 rounded-lg pointer-events-none z-10"
          style={{
            background: 'var(--bg-surface-elevated)',
            border: `1px solid ${hoveredTierColor}`,
            boxShadow: `0 0 20px ${hoveredTierColor}60`,
          }}
        >
          <p className="text-xs font-bold" style={{ color: hoveredTierColor }}>
            {hoveredMuscle}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {hoveredScore.toLocaleString()} pts
            </span>
            {hoveredTier && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${hoveredTierColor}30`, color: hoveredTierColor }}>
                {hoveredTier}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Muscle legend */}
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {scoredMuscles.map(s => {
          const tier = getTier(s.score);
          return (
            <div
              key={s.muscle}
              className="text-center px-1 py-1.5 rounded-md"
              style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}
            >
              <div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5" style={{ background: tier.color, boxShadow: tier.cssGlow }} />
              <p className="text-[9px] font-semibold" style={{ color: tier.color }}>{s.muscle}</p>
              <p className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{tier.name}</p>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
        Drag to rotate · Hover muscles for details
      </p>
    </div>
  );
}


