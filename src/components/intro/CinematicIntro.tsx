import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import type { MuscleScore } from '../../utils/muscleScoring';
import { getDaySchedule } from '../../data/schedule';

interface CinematicIntroProps {
  muscleScores: MuscleScore[];
  highlightMuscles: string[];
  onComplete: () => void;
  height?: number;
}

// Get today's workout type for choreography
function getDayType(): string {
  const now = new Date();
  const schedule = getDaySchedule(now);
  if (schedule.isRestDay) return 'rest';
  return schedule.dayOfWeek;
}

// Vertex → muscle mapping (Z = height, X = width, Y = front/back)
/**
 * Vertex → muscle mapping.
 * GLB node matrix swaps axes: scene_Y=raw_Z, scene_Z=-raw_Y
 * So raw_Z = height (head>0, feet<0), raw_Y>0 = front, raw_Y<0 = back
 */
function getVertexMuscle(x: number, y: number, z: number): string | null {
  const absX = Math.abs(x);
  const isFront = y < 0;  // raw_Y negative = FRONT (verified: torso vertices have Y ≈ -0.14)

  // Arms — far from center
  if (absX > 0.055) {
    if (z > 0.08) return 'Shoulders';
    if (z > -0.02) return isFront ? 'Biceps' : 'Triceps';
    if (z > -0.15) return isFront ? 'Biceps' : 'Triceps';
    if (z > -0.30) return 'Forearms';
    return 'Forearms';
  }

  // Head/neck
  if (z > 0.10) return null;

  // Shoulders
  if (z > 0.06) return 'Shoulders';

  // Upper torso
  if (z > 0.02) return isFront ? 'Chest' : 'Back';

  // Mid torso
  if (z > -0.04) return isFront ? 'Abs' : 'Abs';

  // Lower torso
  if (z > -0.10) return isFront ? 'Abs' : 'Abs';

  // Thighs
  if (z > -0.35) return isFront ? 'Quads' : 'Hamstrings';
  if (z > -0.42) return isFront ? 'Quads' : 'Hamstrings';

  // Calves
  return 'Calves';
}

const HIGHLIGHT_COLOR = new THREE.Color(0xFF5E00);

export default function CinematicIntro({
  muscleScores,
  highlightMuscles,
  onComplete,
  height = 400,
}: CinematicIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<string>('loading');
  const [loadPercent, setLoadPercent] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const scoreMapRef = useRef(new Map<string, MuscleScore>());
  useEffect(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) map.set(s.muscle, s);
    scoreMapRef.current = map;
  }, [muscleScores]);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = height;
    const dayType = getDayType();
    const highlightSet = new Set(highlightMuscles);

    // ===== SCENE SETUP =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.3, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050508, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 3.0;
    container.appendChild(renderer.domElement);

    // ===== LIGHTING (bright from start) =====
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 3.0);
    spotLight.position.set(2, 5, 4);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.3;
    scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0xFF5E00, 1.2);
    rimLight.position.set(-3, 2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.0);
    fillLight.position.set(-2, 3, 2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
    topLight.position.set(0, 6, 0);
    scene.add(topLight);

    scene.fog = new THREE.FogExp2(0x050508, 0.06);

    // ===== PARTICLE FIELD =====
    const particleCount = 300;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.003;
      particleVelocities[i * 3 + 1] = Math.random() * 0.005 + 0.001;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      particleSizes[i] = Math.random() * 0.04 + 0.01;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xFF5E00,
      size: 0.03,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // ===== RING PARTICLES (orbit around model) =====
    const ringCount = 80;
    const ringGeo = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      ringPositions[i * 3] = Math.cos(angle) * 1.8;
      ringPositions[i * 3 + 1] = 0;
      ringPositions[i * 3 + 2] = Math.sin(angle) * 1.8;
    }
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringMat = new THREE.PointsMaterial({
      color: 0xFF5E00,
      size: 0.02,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const ringParticles = new THREE.Points(ringGeo, ringMat);
    scene.add(ringParticles);

    // ===== LIGHT BEAM (volumetric cone) =====
    const beamGeo = new THREE.CylinderGeometry(0.01, 1.5, 4, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xFF5E00,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const lightBeam = new THREE.Mesh(beamGeo, beamMat);
    lightBeam.position.set(0, 3, 0);
    lightBeam.rotation.x = Math.PI;
    scene.add(lightBeam);

    // ===== GROUND GLOW =====
    const groundGeo = new THREE.RingGeometry(0.3, 2.5, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0xFF5E00,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const groundGlow = new THREE.Mesh(groundGeo, groundMat);
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = -1.5;
    scene.add(groundGlow);

    // ===== INTRO: Use original silver model, just brighten it =====
    // The model keeps its original material (silver/gray)
    // We only add emissive glow on highlighted muscles during the highlight phase
    const applyIntroGlow = (group: THREE.Group, highlighted: Set<string>) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geo = child.geometry;
          const pos = geo.getAttribute('position') as THREE.BufferAttribute;
          if (!pos) return;

          // Determine if this mesh's vertices overlap with highlighted muscles
          const muscleCounts = new Map<string, number>();
          for (let i = 0; i < pos.count; i++) {
            const m = getVertexMuscle(pos.getX(i), pos.getY(i), pos.getZ(i));
            if (m) muscleCounts.set(m, (muscleCounts.get(m) || 0) + 1);
          }
          let dominantMuscle = '';
          let maxCount = 0;
          for (const [muscle, count] of muscleCounts) {
            if (count > maxCount) { maxCount = count; dominantMuscle = muscle; }
          }

          const isHighlighted = dominantMuscle && highlighted.has(dominantMuscle);
          const glowColor = isHighlighted ? HIGHLIGHT_COLOR : new THREE.Color(0x000000);
          const glowIntensity = isHighlighted ? 0.8 : 0;

          // Keep original material appearance — bright silver with optional orange glow
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xcccccc),  // Bright silver
            roughness: 0.35,
            metalness: 0.2,
            emissive: glowColor,
            emissiveIntensity: glowIntensity,
            transparent: false,
            opacity: 1,
            side: THREE.DoubleSide,
          });

          child.userData.muscleName = dominantMuscle || 'Body';
        }
      });
    };

    // ===== LOAD MODEL =====
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
        const scale = 2.2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.3;

        // Apply bright silver material to all meshes
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xcccccc),
              roughness: 0.35,
              metalness: 0.2,
              side: THREE.DoubleSide,
            });
          }
        });

        scene.add(model);

        setPhase('spin');

        // ===== DAY-SPECIFIC CINEMATIC CHOREOGRAPHY =====
        const tl = gsap.timeline({
          onComplete: () => {
            setPhase('done');
            onCompleteRef.current();
          },
        });

        // === UNIVERSAL: 360° dramatic spin (0 → 2.5s) ===
        tl.to(ambientLight, { intensity: 2.0, duration: 2.5, ease: 'power2.inOut' }, 0);
        tl.to(spotLight, { intensity: 4.5, duration: 2.5, ease: 'power2.inOut' }, 0);
        tl.to(model.rotation, { y: Math.PI * 2, duration: 2.5, ease: 'power2.inOut' }, 0);
        tl.fromTo(camera.position, { z: 5, y: 0.3 }, { z: 3.5, y: 0.1, duration: 2.5, ease: 'power2.inOut' }, 0);

        // Ring particles orbit during spin
        tl.to(ringParticles.rotation, { y: Math.PI * 2, duration: 2.5, ease: 'power2.inOut' }, 0);

        // Ground glow pulse
        tl.to(groundMat, { opacity: 0.12, duration: 2.5, ease: 'power2.inOut' }, 0);

        // === Phase 2: Highlight muscles (2.5s) ===
        tl.call(() => {
          setPhase('highlight');
          applyIntroGlow(model, highlightSet);
        }, [], 2.5);

        // Rim light pulses
        tl.to(rimLight, { intensity: 2.5, duration: 0.8, ease: 'power2.out' }, 2.5);
        tl.call(() => { rimLight.color.set(0xFF5E00); }, [], 2.5);

        // === Phase 3: DAY-SPECIFIC CAMERA MOVEMENTS (3.5s → 5.5s) ===

        if (dayType === 'monday') {
          // MONDAY: Chest/Shoulders/Biceps → zoom into chest
          tl.call(() => setPhase('zoom'), [], 3.5);
          tl.to(camera.position, { z: 0.6, y: 0.15, x: 0, duration: 2.0, ease: 'power3.in' }, 3.5);
          tl.to(camera.rotation, { x: 0.05, y: 0, duration: 2.0, ease: 'power3.in' }, 3.5);
          tl.to(scene.fog!, { density: 0.15, duration: 2.0, ease: 'power3.in' }, 3.5);
          tl.to(spotLight, { angle: Math.PI / 12, intensity: 6.0, duration: 2.0, ease: 'power3.in' }, 3.5);
        } else if (dayType === 'tuesday') {
          // TUESDAY: Back/Quads/Abs → spin to back, dive into back
          tl.call(() => setPhase('zoom'), [], 3.5);
          tl.to(model.rotation, { y: Math.PI, duration: 1.0, ease: 'power2.inOut' }, 3.5);
          tl.to(camera.position, { z: 0.6, y: 0.1, x: 0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(camera.rotation, { x: 0.05, y: 0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(scene.fog!, { density: 0.15, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(spotLight, { angle: Math.PI / 12, intensity: 6.0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.call(() => { rimLight.color.set(0x00E5FF); }, [], 3.5);
        } else if (dayType === 'wednesday' || dayType === 'sunday') {
          // REST DAY: zoom out wide, then zoom into head (mind)
          tl.call(() => setPhase('zoom'), [], 3.5);
          // Pull back first
          tl.to(camera.position, { z: 6, y: 0.5, duration: 1.0, ease: 'power2.in' }, 3.5);
          tl.to(model.rotation, { y: 0, duration: 0.5, ease: 'power2.inOut' }, 3.5);
          // Then dive into head
          tl.to(camera.position, { z: 1.0, y: 1.2, x: 0, duration: 1.5, ease: 'power3.in' }, 4.5);
          tl.to(camera.rotation, { x: -0.2, y: 0, duration: 1.5, ease: 'power3.in' }, 4.5);
          tl.to(scene.fog!, { density: 0.12, duration: 2.0, ease: 'power3.in' }, 3.5);
          tl.call(() => { rimLight.color.set(0xA855F7); }, [], 3.5);
          // Purple glow for rest day
          tl.to(ambientLight.color, { r: 0.8, g: 0.7, b: 1.0, duration: 1.0, ease: 'power2.out' }, 3.5);
        } else if (dayType === 'thursday') {
          // THURSDAY: Chest B + Back B → dual model effect
          // Clone the model for the "back view"
          const backModel = model.clone(true);
          backModel.rotation.y = Math.PI; // facing back
          backModel.position.x = -1.5; // offset left
          model.position.x = 1.5; // offset right
          model.rotation.y = 0;
          scene.add(backModel);

          tl.call(() => setPhase('zoom'), [], 3.5);
          // Pull back to reveal both
          tl.to(camera.position, { z: 5, y: 0.3, duration: 1.0, ease: 'power2.inOut' }, 3.5);
          tl.to(model.position, { x: 1.5, duration: 1.0, ease: 'power2.inOut' }, 3.5);
          // Zoom into the center between both
          tl.to(camera.position, { z: 1.2, y: 0.15, x: 0, duration: 1.8, ease: 'power3.in' }, 4.5);
          tl.to(camera.rotation, { x: 0.05, y: 0, duration: 1.8, ease: 'power3.in' }, 4.5);
          tl.to(scene.fog!, { density: 0.12, duration: 2.0, ease: 'power3.in' }, 3.5);
          tl.call(() => { rimLight.color.set(0x00E676); }, [], 3.5);
        } else if (dayType === 'friday') {
          // FRIDAY: Arms day → zoom into right arm
          tl.call(() => setPhase('zoom'), [], 3.5);
          tl.to(model.rotation, { y: Math.PI * 0.3, duration: 0.8, ease: 'power2.inOut' }, 3.5);
          tl.to(camera.position, { z: 1.5, y: 0.0, x: 0.8, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(camera.rotation, { x: 0.0, y: -0.3, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(scene.fog!, { density: 0.15, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(spotLight, { angle: Math.PI / 12, intensity: 6.0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.call(() => { rimLight.color.set(0xFFB300); }, [], 3.5);
        } else if (dayType === 'saturday') {
          // SATURDAY: Hamstrings/Calves/Abs → rotate to back legs, dive down
          tl.call(() => setPhase('zoom'), [], 3.5);
          tl.to(model.rotation, { y: Math.PI, duration: 1.0, ease: 'power2.inOut' }, 3.5);
          tl.to(camera.position, { z: 1.2, y: -0.6, x: 0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(camera.rotation, { x: 0.3, y: 0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(scene.fog!, { density: 0.15, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.to(spotLight, { angle: Math.PI / 12, intensity: 6.0, duration: 2.0, ease: 'power3.in' }, 3.8);
          tl.call(() => { rimLight.color.set(0xFF1744); }, [], 3.5);
        }

        // === Phase 4: Screen wipe (5.5s → 6.5s) ===
        tl.call(() => {
          if (overlayRef.current) {
            gsap.to(overlayRef.current, { opacity: 1, duration: 0.6, ease: 'power2.in' });
          }
        }, [], 5.5);

        tl.call(() => {
          setPhase('done');
          onCompleteRef.current();
        }, [], 6.2);

        // ===== ANIMATION LOOP =====
        let animId: number;
        let time = 0;
        const animate = () => {
          animId = requestAnimationFrame(animate);
          time += 0.016;

          // Floating particles
          const pPos = particleGeo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < particleCount; i++) {
            pPos.array[i * 3] += particleVelocities[i * 3];
            pPos.array[i * 3 + 1] += particleVelocities[i * 3 + 1];
            pPos.array[i * 3 + 2] += particleVelocities[i * 3 + 2];
            if (pPos.array[i * 3 + 1] > 4) pPos.array[i * 3 + 1] = -4;
          }
          pPos.needsUpdate = true;
          particleMat.opacity = 0.3 + Math.sin(time * 2) * 0.2;

          // Ring particles orbit
          ringParticles.rotation.y += 0.003;
          ringMat.opacity = 0.2 + Math.sin(time * 1.5) * 0.1;

          // Ground glow pulse
          groundGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
          groundMat.opacity = 0.04 + Math.sin(time * 2) * 0.03;

          // Light beam sway
          lightBeam.rotation.z = Math.sin(time * 0.5) * 0.1;
          beamMat.opacity = 0.02 + Math.sin(time * 1.5) * 0.02;

          renderer.render(scene, camera);
        };
        animate();

        // Resize
        const onResize = () => {
          const newW = container.clientWidth;
          camera.aspect = newW / h;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, h);
        };
        window.addEventListener('resize', onResize);

        cleanupRef.current = () => {
          cancelAnimationFrame(animId);
          window.removeEventListener('resize', onResize);
          tl.kill();
          renderer.dispose();
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      },
      (progress) => {
        if (progress.total > 0) setLoadPercent(Math.round((progress.loaded / progress.total) * 100));
      },
      (error) => {
        console.error('CinematicIntro: Failed to load model:', error);
        onCompleteRef.current();
      },
    );

    return () => { cleanupRef.current?.(); };
  }, [highlightMuscles, height]);

  const dayType = getDayType();
  const dayLabels: Record<string, string> = {
    monday: 'CHEST • SHOULDERS • BICEPS',
    tuesday: 'BACK • QUADS • ABS',
    wednesday: 'REST DAY — RECHARGE',
    thursday: 'CHEST • BACK • ABS',
    friday: 'ARMS DAY — ISOLATE',
    saturday: 'HAMSTRINGS • CALVES • ABS',
    sunday: 'REST DAY — RECHARGE',
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mountRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Loading */}
      {phase === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: '#050508' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#FF5E00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Loading... {loadPercent > 0 && `${loadPercent}%`}
            </p>
          </div>
        </div>
      )}

      {/* Spin phase */}
      {phase === 'spin' && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase" style={{ color: 'rgba(255,94,0,0.7)' }}>
            Analyzing physique...
          </p>
        </div>
      )}

      {/* Highlight phase */}
      {phase === 'highlight' && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <p className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: '#FF5E00', textShadow: '0 0 20px rgba(255,94,0,0.5)' }}>
            {dayLabels[dayType] || 'TRAINING'}
          </p>
        </div>
      )}

      {/* Zoom phase */}
      {phase === 'zoom' && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <p className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: '#FF5E00', textShadow: '0 0 20px rgba(255,94,0,0.5)' }}>
            {dayLabels[dayType] || 'TRAINING'}
          </p>
        </div>
      )}

      {/* Black overlay for final wipe */}
      <div
        ref={overlayRef}
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: '#0B0C10', opacity: 0 }}
      />
    </div>
  );
}
