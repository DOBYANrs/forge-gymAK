import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { MuscleScore } from '../../utils/muscleScoring';

interface BodyHeatmap3DProps {
  muscleScores: MuscleScore[];
  height?: number;
}

// Create a simplified body mesh with separable muscle groups
function createBodyMesh(_scene: THREE.Scene, scores: Map<string, MuscleScore>) {
  const bodyGroup = new THREE.Group();

  // Material for uncharted areas
  const baseMaterial = new THREE.MeshPhongMaterial({
    color: 0x1a1a2e,
    transparent: true,
    opacity: 0.6,
    wireframe: false,
  });

  // Helper to create a muscle zone
  function createMuscle(
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    rotation?: [number, number, number],
    scale?: [number, number, number],
    muscleName?: string,
  ) {
    const score = muscleName ? scores.get(muscleName) : undefined;
    const color = score ? new THREE.Color(score.tier.color) : new THREE.Color(0x1a1a2e);
    const emissive = score && score.score > 250
      ? new THREE.Color(score.tier.color).multiplyScalar(0.2)
      : new THREE.Color(0x000000);

    const material = new THREE.MeshPhongMaterial({
      color,
      emissive,
      emissiveIntensity: score && score.score >= 1000 ? 0.4 : 0.15,
      transparent: true,
      opacity: 0.85,
      shininess: 60,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    if (scale) mesh.scale.set(...scale);
    mesh.userData = { muscleName, score: score?.score ?? 0, tierName: score?.tier.name ?? 'None' };
    return mesh;
  }

  // ===== TORSO =====
  // Chest
  const chestGeo = new THREE.SphereGeometry(0.42, 16, 16);
  bodyGroup.add(createMuscle(chestGeo, [0, 0.3, 0.15], undefined, [1, 0.8, 0.5], 'Chest'));

  // Back
  const backGeo = new THREE.SphereGeometry(0.42, 16, 16);
  bodyGroup.add(createMuscle(backGeo, [0, 0.3, -0.15], undefined, [1, 0.8, 0.5], 'Back'));

  // Abs / Core
  const absGeo = new THREE.CylinderGeometry(0.3, 0.28, 0.5, 12);
  bodyGroup.add(createMuscle(absGeo, [0, -0.15, 0.05], undefined, [1, 1, 0.6], 'Abs'));

  // ===== SHOULDERS =====
  const shoulderGeo = new THREE.SphereGeometry(0.15, 12, 12);
  bodyGroup.add(createMuscle(shoulderGeo, [-0.45, 0.5, 0], undefined, [1, 0.8, 0.8], 'Shoulders'));
  bodyGroup.add(createMuscle(shoulderGeo, [0.45, 0.5, 0], undefined, [1, 0.8, 0.8], 'Shoulders'));

  // ===== ARMS =====
  // Biceps (upper arm front)
  const bicepGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 8);
  bodyGroup.add(createMuscle(bicepGeo, [-0.52, 0.2, 0.08], [0, 0, 0.15], undefined, 'Biceps'));
  bodyGroup.add(createMuscle(bicepGeo, [0.52, 0.2, 0.08], [0, 0, -0.15], undefined, 'Biceps'));

  // Triceps (upper arm back)
  const tricepGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8);
  bodyGroup.add(createMuscle(tricepGeo, [-0.52, 0.2, -0.08], [0, 0, 0.15], undefined, 'Triceps'));
  bodyGroup.add(createMuscle(tricepGeo, [0.52, 0.2, -0.08], [0, 0, -0.15], undefined, 'Triceps'));

  // Forearms
  const forearmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.3, 8);
  bodyGroup.add(createMuscle(forearmGeo, [-0.56, -0.15, 0.05], [0, 0, 0.1], undefined, 'Forearms'));
  bodyGroup.add(createMuscle(forearmGeo, [0.56, -0.15, 0.05], [0, 0, -0.1], undefined, 'Forearms'));

  // ===== LEGS =====
  // Quads (upper leg front)
  const quadGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.5, 10);
  bodyGroup.add(createMuscle(quadGeo, [-0.18, -0.7, 0.08], undefined, undefined, 'Legs'));
  bodyGroup.add(createMuscle(quadGeo, [0.18, -0.7, 0.08], undefined, undefined, 'Legs'));

  // Calves
  const calfGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.4, 8);
  bodyGroup.add(createMuscle(calfGeo, [-0.18, -1.2, 0.03], undefined, undefined, 'Legs'));
  bodyGroup.add(createMuscle(calfGeo, [0.18, -1.2, 0.03], undefined, undefined, 'Legs'));

  // ===== HEAD =====
  const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
  const headMat = baseMaterial.clone();
  headMat.opacity = 0.4;
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.75, 0);
  bodyGroup.add(head);

  // Position the whole body
  bodyGroup.position.y = 0.3;

  return bodyGroup;
}

export default function BodyHeatmap3D({ muscleScores, height = 350 }: BodyHeatmap3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bodyGroup: THREE.Group;
    animationId: number;
    isDragging: boolean;
    previousMousePosition: { x: number; y: number };
  } | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string>('');
  const [hoveredScore, setHoveredScore] = useState<number>(0);

  const scoresMap = useMemo(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) {
      map.set(s.muscle, s);
    }
    return map;
  }, [muscleScores]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const h = height;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0C10);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 100);
    camera.position.set(0, 0, 3.5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0B0C10, 1);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 3, 4);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    backLight.position.set(-2, -1, -3);
    scene.add(backLight);

    // Body
    const bodyGroup = createBodyMesh(scene, scoresMap);
    scene.add(bodyGroup);

    // Store refs
    const state = {
      scene,
      camera,
      renderer,
      bodyGroup,
      animationId: 0,
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
    };
    sceneRef.current = state;

    // Mouse/touch interaction for rotation
    const onMouseDown = (e: MouseEvent) => {
      state.isDragging = true;
      state.previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return;
      const deltaX = e.clientX - state.previousMousePosition.x;
      const deltaY = e.clientY - state.previousMousePosition.y;
      bodyGroup.rotation.y += deltaX * 0.01;
      bodyGroup.rotation.x += deltaY * 0.005;
      bodyGroup.rotation.x = Math.max(-0.5, Math.min(0.5, bodyGroup.rotation.x));
      state.previousMousePosition = { x: e.clientX, y: e.clientY };

      // Raycast for hover
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bodyGroup.children, false);
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

    // Touch events
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
      bodyGroup.rotation.y += deltaX * 0.01;
      bodyGroup.rotation.x += deltaY * 0.005;
      bodyGroup.rotation.x = Math.max(-0.5, Math.min(0.5, bodyGroup.rotation.x));
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
      time += 0.005;
      if (!state.isDragging) {
        bodyGroup.rotation.y = Math.sin(time) * 0.3;
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

    return () => {
      cancelAnimationFrame(state.animationId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scoresMap, height]);

  // Update colors when scores change
  useEffect(() => {
    if (!sceneRef.current) return;
    const { bodyGroup } = sceneRef.current;
    bodyGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.muscleName) {
        const score = scoresMap.get(child.userData.muscleName);
        if (score) {
          const color = new THREE.Color(score.tier.color);
          (child.material as THREE.MeshPhongMaterial).color.copy(color);
          child.userData.score = score.score;
          child.userData.tierName = score.tier.name;
        }
      }
    });
  }, [scoresMap]);

  return (
    <div className="relative">
      <div ref={mountRef} style={{ width: '100%', height }} className="rounded-xl overflow-hidden" />

      {/* Hover tooltip */}
      {hoveredMuscle && (
        <div
          className="absolute top-2 left-2 px-3 py-1.5 rounded-lg text-xs font-semibold pointer-events-none"
          style={{
            background: 'var(--bg-surface-elevated)',
            border: 'var(--border-subtle)',
            color: '#fff',
          }}
        >
          {hoveredMuscle}: {hoveredScore} pts
        </div>
      )}

      {/* Instructions */}
      <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
        Drag to rotate · Hover muscles for details
      </p>
    </div>
  );
}
