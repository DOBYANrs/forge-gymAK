import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleScore } from '../../utils/muscleScoring';

interface BodyHeatmap3DProps {
  muscleScores: MuscleScore[];
  height?: number;
}

// Map mesh names (from GLB) to muscle groups
// These are common naming conventions in anatomy models
const MESH_MUSCLE_MAP: Record<string, string> = {
  // Chest
  'chest': 'Chest', 'pectorals': 'Chest', 'pec': 'Chest', 'pecs': 'Chest',
  'pectoralis': 'Chest', 'chest_muscle': 'Chest',
  // Back
  'back': 'Back', 'latissimus': 'Back', 'lats': 'Back', 'trapezius': 'Back',
  'traps': 'Back', 'rhomboid': 'Back', 'upper_back': 'Back',
  // Shoulders
  'shoulder': 'Shoulders', 'shoulders': 'Shoulders', 'deltoid': 'Shoulders',
  'delts': 'Shoulders', 'delt': 'Shoulders',
  // Biceps
  'bicep': 'Biceps', 'biceps': 'Biceps', 'biceps_brachii': 'Biceps',
  // Triceps
  'tricep': 'Triceps', 'triceps': 'Triceps', 'triceps_brachii': 'Triceps',
  // Forearms
  'forearm': 'Forearms', 'forearms': 'Forearms', 'brachioradialis': 'Forearms',
  // Quads (front of thigh)
  'quad': 'Quads', 'quads': 'Quads', 'quadriceps': 'Quads', 'thigh': 'Quads',
  'thighs': 'Quads', 'vastus': 'Quads', 'rectus_femoris': 'Quads',
  'front_thigh': 'Quads', 'upper_leg_front': 'Quads',
  // Hamstrings (back of thigh)
  'hamstring': 'Hamstrings', 'hamstrings': 'Hamstrings', 'back_thigh': 'Hamstrings',
  'upper_leg_back': 'Hamstrings', 'bicep_femoris': 'Hamstrings',
  // Calves
  'calf': 'Calves', 'calves': 'Calves', 'gastrocnemius': 'Calves',
  'lower_leg': 'Calves', 'soleus': 'Calves',
  // Abs
  'abs': 'Abs', 'abdominals': 'Abs', 'abdomen': 'Abs', 'core': 'Abs',
  'rectus_abdominis': 'Abs', 'obliques': 'Abs',
};

function findMuscleGroup(name: string): string | null {
  const lower = name.toLowerCase().replace(/[_\-\s]/g, '');
  for (const [key, muscle] of Object.entries(MESH_MUSCLE_MAP)) {
    const cleanKey = key.toLowerCase().replace(/[_\-\s]/g, '');
    if (lower.includes(cleanKey) || cleanKey.includes(lower)) {
      return muscle;
    }
  }
  return null;
}

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
  const [isLoading, setIsLoading] = useState(true);

  const scoresMap = useMemo(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) {
      map.set(s.muscle, s);
    }
    return map;
  }, [muscleScores]);

  // Apply tier colors to the model — BRIGHT and VIVID
  const applyColors = (model: THREE.Group) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshName = child.name.toLowerCase();
        const muscle = findMuscleGroup(meshName);
        const score = muscle ? scoresMap.get(muscle) : undefined;

        if (score && score.score > 0) {
          // Brighten the tier color significantly
          const baseColor = new THREE.Color(score.tier.color);
          const brightColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.25);
          // Strong emissive so muscles GLOW
          const emissiveStrength = score.score >= 4000 ? 1.0 : score.score >= 2000 ? 0.8 : score.score >= 1000 ? 0.6 : score.score >= 500 ? 0.45 : 0.3;
          const emissive = baseColor.clone().multiplyScalar(emissiveStrength);

          child.material = new THREE.MeshStandardMaterial({
            color: brightColor,
            emissive,
            emissiveIntensity: emissiveStrength * 1.5,
            roughness: 0.35,
            metalness: 0.15,
            transparent: false,
            opacity: 1.0,
          });
        } else {
          // Untrained muscles — visible but muted
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x2a2e3d),
            emissive: new THREE.Color(0x111122),
            emissiveIntensity: 0.15,
            roughness: 0.6,
            metalness: 0.05,
            transparent: false,
            opacity: 1.0,
          });
        }

        // Store muscle name for raycasting
        child.userData.muscleName = muscle ?? meshName;
        child.userData.score = score?.score ?? 0;
      }
    });
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const h = height;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0C10);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / h, 0.1, 100);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);

    // Renderer — high exposure for bright colors
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0B0C10, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.0;
    container.appendChild(renderer.domElement);

    // Lights — BRIGHT studio lighting so colors pop
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.0);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, 0.8);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // Extra top light for even illumination
    const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
    topLight.position.set(0, 5, 0);
    scene.add(topLight);

    // Ground plane with subtle reflection
    const groundGeo = new THREE.PlaneGeometry(10, 10);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a14,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.8;
    scene.add(ground);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      '/forge-gymAK/male_anatomy.glb',
      (gltf) => {
        const model = gltf.scene;

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.3;

        // Apply tier colors
        applyColors(model);

        scene.add(model);

        const state = {
          scene,
          camera,
          renderer,
          model,
          animationId: 0,
          isDragging: false,
          previousMousePosition: { x: 0, y: 0 },
        };
        sceneRef.current = state;
        setIsLoading(false);

        // Mouse/touch rotation
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

          // Raycast for hover info
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
            if (obj.userData.muscleName) {
              setHoveredMuscle(obj.userData.muscleName);
              setHoveredScore(obj.userData.score);
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

        // Animation loop — gentle auto-rotate
        let time = 0;
        const animate = () => {
          state.animationId = requestAnimationFrame(animate);
          time += 0.004;
          if (!state.isDragging) {
            model.rotation.y = Math.sin(time) * 0.4;
          }
          renderer.render(scene, camera);
        };
        animate();

        // Resize handler
        const onResize = () => {
          const w = container.clientWidth;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        // Store cleanup refs
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
      () => {},
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

  return (
    <div className="relative">
      <div ref={mountRef} style={{ width: '100%', height }} className="rounded-xl overflow-hidden" />

      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(11,12,16,0.8)' }}
        >
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading 3D model...</p>
          </div>
        </div>
      )}

      {/* Hover tooltip with tier */}
      {hoveredMuscle && (() => {
        const tier = scoresMap.get(hoveredMuscle)?.tier;
        return (
          <div
            className="absolute top-2 left-2 px-3 py-2 rounded-lg pointer-events-none"
            style={{
              background: 'var(--bg-surface-elevated)',
              border: `1px solid ${tier?.color ?? 'var(--border-subtle)'}`,
              boxShadow: tier?.cssGlow !== 'none' ? tier?.cssGlow : undefined,
            }}
          >
            <p className="text-xs font-bold" style={{ color: tier?.color ?? '#fff' }}>
              {hoveredMuscle}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {hoveredScore.toLocaleString()} pts
              </span>
              {tier && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: `${tier.color}20`, color: tier.color }}
                >
                  {tier.name}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
        Drag to rotate · Hover muscles for details
      </p>
    </div>
  );
}
