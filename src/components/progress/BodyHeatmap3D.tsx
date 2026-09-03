import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getTier } from '../../utils/muscleScoring';

interface BodyHeatmap3DProps {
  muscleScores: MuscleScore[];
  height?: number;
}

// Node matrix: [1,0,0,0, 0,0,1,0, 0,-1,0,0, 0,0.498,0,1]
// scene_X = raw_X
// scene_Y = raw_Z + 0.498
// scene_Z = -raw_Y
//
// In scene space: camera at (0, 0.5, 4) looking at origin
// So scene_Z > 0 = toward camera = FRONT
// scene_Z < 0 = away from camera = BACK
//
// raw_Y negative -> scene_Z positive -> FRONT
// raw_Y positive -> scene_Z negative -> BACK
// raw_Z positive -> scene_Y positive -> upper body
// raw_Z negative -> scene_Y negative -> lower body

function transformVertex(x: number, y: number, z: number): [number, number, number] {
  return [x, z + 0.498, -y];
}

function getSceneMuscle(sx: number, sy: number, sz: number): string | null {
  const absX = Math.abs(sx);
  const isFront = sz > 0;  // scene_Z > 0 = front (toward camera)

  // Arms — far from center
  if (absX > 0.055) {
    if (sy > 0.56) return 'Shoulders';
    if (sy > 0.46) return isFront ? 'Biceps' : 'Triceps';
    if (sy > 0.34) return isFront ? 'Biceps' : 'Triceps';
    return 'Forearms';
  }

  // Torso
  if (sy > 0.60) return null;  // Head
  if (sy > 0.56) return 'Shoulders';
  if (sy > 0.52) return isFront ? 'Chest' : 'Back';
  if (sy > 0.46) return isFront ? 'Abs' : 'Abs';
  if (sy > 0.40) return isFront ? 'Abs' : 'Abs';

  // Legs
  if (sy > 0.15) return isFront ? 'Quads' : 'Hamstrings';
  return 'Calves';
}

const NEUTRAL_COLOR = new THREE.Color(0x3a3e4d);

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
    for (const s of muscleScores) map.set(s.muscle, s);
    return map;
  }, [muscleScores]);

  // Get tier color as THREE.Color
  function getTierColor(muscle: string | null): { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number } {
    if (!muscle) return { color: NEUTRAL_COLOR.clone(), emissive: new THREE.Color(0x000000), emissiveIntensity: 0 };
    const score = scoresMap.get(muscle);
    if (!score || score.score === 0) {
      return { color: NEUTRAL_COLOR.clone(), emissive: new THREE.Color(0x111122), emissiveIntensity: 0.1 };
    }
    const tier = score.tier;
    const baseColor = new THREE.Color(tier.color);
    // Keep the same hue but render it darker and more saturated so it clearly
    // pops against the dark silver body instead of washing out.
    const surfaceColor = baseColor.clone().multiplyScalar(0.6);
    let emissiveStrength: number;
    switch (tier.name) {
      case 'Legendary': emissiveStrength = 1.2; break;
      case 'Elite': emissiveStrength = 1.0; break;
      case 'Advanced': emissiveStrength = 0.75; break;
      case 'Intermediate': emissiveStrength = 0.55; break;
      case 'Novice': emissiveStrength = 0.4; break;
      default: emissiveStrength = 0.15;
    }
    const emissive = baseColor.clone().multiplyScalar(emissiveStrength);
    return { color: surfaceColor, emissive, emissiveIntensity: emissiveStrength * 0.7 };
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0C10);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0B0C10, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;
    container.appendChild(renderer.domElement);

    // Lighting
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

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.3 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.8;
    scene.add(ground);

    /**
     * PER-MESH COLORING: Each mesh gets a solid material based on its center position.
     * This avoids vertex coloring issues entirely.
     */
    function applyMeshColors(group: THREE.Group) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geo = child.geometry;
          const pos = geo.getAttribute('position') as THREE.BufferAttribute;
          if (!pos) return;

          // Compute bounding box center
          const box = new THREE.Box3().setFromBufferAttribute(pos);
          const center = box.getCenter(new THREE.Vector3());

          // Transform to scene space
          const [sx, sy, sz] = transformVertex(center.x, center.y, center.z);

          // Determine muscle
          const muscle = getSceneMuscle(sx, sy, sz);
          const { color, emissive, emissiveIntensity } = getTierColor(muscle);
          const score = scoresMap.get(muscle || '');

          child.material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.3,
            metalness: 0.1,
            emissive,
            emissiveIntensity,
            transparent: false,
            opacity: 1,
            side: THREE.DoubleSide,
          });

          child.userData.muscleName = muscle || 'Body';
          child.userData.score = score?.score ?? 0;
          child.userData.tierName = score?.tier.name ?? 'None';
          child.userData.tierColor = score?.tier.color ?? '#3a3e4d';
        }
      });
    }

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      '/kasaint-gym/muscle_anatomy.glb',
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

        // Apply per-mesh solid colors
        applyMeshColors(model);
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
          time += 0.016;
          if (!state.isDragging) model.rotation.y = Math.sin(time) * 0.4;
          renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
          const newW = container.clientWidth;
          camera.aspect = newW / h;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, h);
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
    sceneRef.current.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry;
        const pos = geo.getAttribute('position') as THREE.BufferAttribute;
        if (!pos) return;
        const box = new THREE.Box3().setFromBufferAttribute(pos);
        const center = box.getCenter(new THREE.Vector3());
        const [sx, sy, sz] = transformVertex(center.x, center.y, center.z);
        const muscle = getSceneMuscle(sx, sy, sz);
        const { color, emissive, emissiveIntensity } = getTierColor(muscle);
        const score = scoresMap.get(muscle || '');

        child.material = new THREE.MeshStandardMaterial({
          color, roughness: 0.3, metalness: 0.1,
          emissive, emissiveIntensity,
          transparent: false, opacity: 1, side: THREE.DoubleSide,
        });
        child.userData.muscleName = muscle || 'Body';
        child.userData.score = score?.score ?? 0;
        child.userData.tierName = score?.tier.name ?? 'None';
        child.userData.tierColor = score?.tier.color ?? '#3a3e4d';
      }
    });
  }, [scoresMap]);

  const scoredMuscles = useMemo(() => {
    return muscleScores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
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

      {hoveredMuscle && (
        <div className="absolute top-2 left-2 px-3 py-2 rounded-lg pointer-events-none z-10"
          style={{
            background: 'var(--bg-surface-elevated)',
            border: `1px solid ${hoveredTierColor}`,
            boxShadow: `0 0 20px ${hoveredTierColor}60`,
          }}>
          <p className="text-xs font-bold" style={{ color: hoveredTierColor }}>{hoveredMuscle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {hoveredScore.toLocaleString()} pts
            </span>
            {hoveredTier && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: `${hoveredTierColor}30`, color: hoveredTierColor }}>
                {hoveredTier}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {scoredMuscles.map(s => {
          const tier = getTier(s.score);
          return (
            <div key={s.muscle} className="text-center px-1 py-1.5 rounded-md"
              style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
              <div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5"
                style={{ background: tier.color, boxShadow: tier.cssGlow }} />
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
