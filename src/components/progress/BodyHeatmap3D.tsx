import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface BodyHeatmap3DProps {
  muscleScores: MuscleScore[];
  height?: number;
}

/**
 * This model is Z-up (Blender export). Z = height (-0.5 feet, +0.5 head)
 * Y = front-back depth, X = left-right width.
 *
 * We color vertices based on their Z (height) position:
 * Map Z ranges to muscle groups, then color by tier score.
 */

// Z-range → muscle group mapping (model coords: Z = -0.5 feet to +0.5 head)
// Using the FRONT face (positive Y) and BACK face (negative Y) for different muscles
const Z_RANGES = [
  { minZ: 0.35, maxZ: 0.50, muscle: 'Head', primary: null },
  { minZ: 0.20, maxZ: 0.35, muscle: 'Shoulders', primary: 'Shoulders' },
  { minZ: 0.05, maxZ: 0.20, muscle: 'Chest', primary: 'Chest' },
  { minZ: -0.10, maxZ: 0.05, muscle: 'Abs', primary: 'Abs' },
  { minZ: -0.25, maxZ: -0.10, muscle: 'Quads/Hips', primary: 'Quads' },
  { minZ: -0.40, maxZ: -0.25, muscle: 'Thighs', primary: 'Hamstrings' },
  { minZ: -0.50, maxZ: -0.40, muscle: 'Calves/Feet', primary: 'Calves' },
];

// Back-side overrides (when Y < 0, use back muscles instead)
const Z_RANGES_BACK = [
  { minZ: 0.35, maxZ: 0.50, muscle: 'Head', primary: null },
  { minZ: 0.20, maxZ: 0.35, muscle: 'Rear Delts', primary: 'Shoulders' },
  { minZ: 0.05, maxZ: 0.20, muscle: 'Back', primary: 'Back' },
  { minZ: -0.10, maxZ: 0.05, muscle: 'Lower Back', primary: 'Back' },
  { minZ: -0.25, maxZ: -0.10, muscle: 'Glutes', primary: 'Hamstrings' },
  { minZ: -0.40, maxZ: -0.25, muscle: 'Hamstrings', primary: 'Hamstrings' },
  { minZ: -0.50, maxZ: -0.40, muscle: 'Calves', primary: 'Calves' },
];

// Side overrides for arms (when |X| > threshold, map to arms)
function getArmMuscle(z: number): string | null {
  if (z > 0.05 && z < 0.30) return 'Biceps';
  if (z > -0.10 && z < 0.05) return 'Triceps';
  if (z < -0.10 && z > -0.30) return 'Forearms';
  return null;
}

function getMuscleForVertex(x: number, y: number, z: number): string | null {
  // Arms (far from center on X axis)
  const armMuscle = getArmMuscle(z);
  if (armMuscle && Math.abs(x) > 0.06) return armMuscle;

  // Use Y to determine front vs back
  const isFront = y > 0;
  const ranges = isFront ? Z_RANGES : Z_RANGES_BACK;

  for (const range of ranges) {
    if (z >= range.minZ && z < range.maxZ) {
      return range.primary;
    }
  }
  return null;
}

// Untrained color
const UNTRAINED_COLOR = new THREE.Color(0x1e212b);
const UNTRAINED_EMISSIVE = new THREE.Color(0x0a0b10);

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
   * Color vertices based on their Z (height) position in the model.
   * Each vertex gets colored by the muscle group it belongs to.
   */
  const applyVertexColors = (model: THREE.Group) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geo = child.geometry;
        const positions = geo.getAttribute('position') as THREE.BufferAttribute;
        if (!positions) return;

        // Determine if this is a front or back mesh based on average Y
        let avgY = 0;
        for (let i = 0; i < positions.count; i++) {
          avgY += positions.getY(i);
        }
        avgY /= positions.count;
        const isFrontMesh = avgY > 0;

        // Create vertex colors
        const colors = new Float32Array(positions.count * 3);

        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);

          const muscle = getMuscleForVertex(x, y, z);
          const score = muscle ? scoresMap.get(muscle) : undefined;

          if (score && score.score > 0) {
            const baseColor = new THREE.Color(score.tier.color);
            // Brighten the color
            const brightColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.15);
            colors[i * 3] = brightColor.r;
            colors[i * 3 + 1] = brightColor.g;
            colors[i * 3 + 2] = brightColor.b;
          } else {
            // Default: subtle body color that shows the anatomy
            colors[i * 3] = 0.22;
            colors[i * 3 + 1] = 0.24;
            colors[i * 3 + 2] = 0.30;
          }
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Apply material with vertex colors
        child.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.35,
          metalness: 0.1,
          transparent: false,
          opacity: 1.0,
          emissive: new THREE.Color(0x111122),
          emissiveIntensity: 0.2,
        });

        // Store metadata for hover detection
        child.userData.muscleName = isFrontMesh ? 'Front' : 'Back';
        child.userData.vertexPositions = positions;
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
    renderer.toneMappingExposure = 2.2;
    container.appendChild(renderer.domElement);

    // BRIGHT lighting for vivid colors
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.2);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, 1.0);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
    topLight.position.set(0, 6, 0);
    scene.add(topLight);

    // Back light to illuminate the back muscles
    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.5 }),
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

        // Apply vertex-based coloring
        applyVertexColors(model);
        scene.add(model);

        const state = {
          scene, camera, renderer, model,
          animationId: 0, isDragging: false,
          previousMousePosition: { x: 0, y: 0 },
        };
        sceneRef.current = state;
        setIsLoading(false);

        // Interaction
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

          // Raycast for hover
          const rect = renderer.domElement.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(model.children, true);
          if (intersects.length > 0) {
            const hit = intersects[0];
            const point = hit.point;
            // Convert hit point back to model space
            const modelPoint = model.worldToLocal(point.clone());
            const muscle = getMuscleForVertex(modelPoint.x, modelPoint.y, modelPoint.z);
            if (muscle) {
              const score = scoresMap.get(muscle);
              setHoveredMuscle(muscle);
              setHoveredScore(score?.score ?? 0);
              setHoveredTier(score?.tier.name ?? 'None');
              setHoveredTierColor(score?.tier.color ?? '#4A4E5D');
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

  // Update vertex colors when scores change
  useEffect(() => {
    if (!sceneRef.current) return;
    applyVertexColors(sceneRef.current.model);
  }, [scoresMap]);

  // Build a legend of scored muscles
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

      {/* Hover tooltip with tier */}
      {hoveredMuscle && (
        <div
          className="absolute top-2 left-2 px-3 py-2 rounded-lg pointer-events-none z-10"
          style={{
            background: 'var(--bg-surface-elevated)',
            border: `1px solid ${hoveredTierColor}`,
            boxShadow: `0 0 20px ${hoveredTierColor}50`,
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

      {/* Muscle legend - compact */}
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
