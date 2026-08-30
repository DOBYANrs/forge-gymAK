import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import type { MuscleScore } from '../../utils/muscleScoring';

interface CinematicIntroProps {
  muscleScores: MuscleScore[];
  highlightMuscles: string[];
  onComplete: () => void;
  height?: number;
}

/* 
 * Solo Leveling-style cinematic intro:
 * 1. Dark scene fades in
 * 2. 3D body model does a dramatic 360° spin
 * 3. Today's active muscles glow orange
 * 4. Camera dives into highlighted muscles
 * 5. Screen wipes to workout view
 */

// Maps Z-position (height) to muscle groups — same logic as BodyHeatmap3D
// Z: -0.5 = feet, +0.5 = head
function getVertexMuscle(x: number, y: number, z: number): string | null {
  // Arms — far from center on X axis
  if (Math.abs(x) > 0.065) {
    if (z > 0.05 && z < 0.30) return 'Biceps';
    if (z > -0.10 && z < 0.05) return 'Triceps';
    if (z < -0.10 && z > -0.30) return 'Forearms';
    return null;
  }

  const isBack = y < -0.02;

  // Head
  if (z > 0.35) return null;

  // Shoulders
  if (z > 0.20 && z < 0.35) return 'Shoulders';

  // Upper torso
  if (z > 0.05 && z < 0.20) {
    return isBack ? 'Back' : 'Chest';
  }

  // Mid torso
  if (z > -0.10 && z < 0.05) {
    return isBack ? 'Back' : 'Abs';
  }

  // Hips/upper legs
  if (z > -0.25 && z < -0.10) {
    return isBack ? 'Hamstrings' : 'Quads';
  }

  // Lower legs
  if (z > -0.40 && z < -0.25) {
    return isBack ? 'Hamstrings' : 'Quads';
  }

  // Calves/feet
  if (z > -0.50 && z < -0.40) return 'Calves';

  return null;
}

// TIER_COLORS for highlights
const TIER_COLORS: Record<string, THREE.Color> = {
  Beginner: new THREE.Color(0x4A4E5D),
  Novice: new THREE.Color(0x00E676),
  Intermediate: new THREE.Color(0x00E5FF),
  Advanced: new THREE.Color(0xA855F7),
  Elite: new THREE.Color(0xFFB300),
  Legendary: new THREE.Color(0xFF1744),
};

const HIGHLIGHT_COLOR = new THREE.Color(0xFF5E00); // Forge Orange
const NEUTRAL_COLOR = new THREE.Color(0x1a1e2e);

export default function CinematicIntro({
  muscleScores,
  highlightMuscles,
  onComplete,
  height = 400,
}: CinematicIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'loading' | 'spin' | 'highlight' | 'zoom' | 'done'>('loading');
  const [loadPercent, setLoadPercent] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Score map for vertex coloring
  const scoreMap = useRef(new Map<string, MuscleScore>());
  useEffect(() => {
    const map = new Map<string, MuscleScore>();
    for (const s of muscleScores) map.set(s.muscle, s);
    scoreMap.current = map;
  }, [muscleScores]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = height;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050508, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;
    container.appendChild(renderer.domElement);

    // DRAMATIC lighting — dark at first, brightens during highlight
    const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 2.0);
    spotLight.position.set(2, 5, 4);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.3;
    scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0xFF5E00, 0.8);
    rimLight.position.set(-3, 2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    fillLight.position.set(-2, 3, 2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    // Fog for cinematic depth
    scene.fog = new THREE.FogExp2(0x050508, 0.15);

    // Particle field — floating embers
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = Math.random() * 0.003 + 0.001;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xFF5E00,
      size: 0.03,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let model: THREE.Group | null = null;

    // Apply vertex coloring — neutral at first, highlighted muscles get orange glow
    const applyIntroColors = (group: THREE.Group, highlighted: Set<string>, isHighlightPhase: boolean) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geo = child.geometry;
          const pos = geo.getAttribute('position') as THREE.BufferAttribute;
          if (!pos) return;

          const colors = new Float32Array(pos.count * 3);

          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);

            const muscle = getVertexMuscle(x, y, z);

            if (isHighlightPhase && muscle && highlighted.has(muscle)) {
              // This vertex belongs to a highlighted muscle — forge orange
              const score = scoreMap.current.get(muscle);
              const tierColor = score?.tier.color
                ? TIER_COLORS[score.tier.name] ?? HIGHLIGHT_COLOR
                : HIGHLIGHT_COLOR;

              colors[i * 3] = tierColor.r;
              colors[i * 3 + 1] = tierColor.g;
              colors[i * 3 + 2] = tierColor.b;
            } else if (muscle) {
              // Known muscle but not highlighted — dim neutral
              const score = scoreMap.current.get(muscle);
              if (score && score.score > 0) {
                const c = TIER_COLORS[score.tier.name] ?? NEUTRAL_COLOR;
                colors[i * 3] = c.r * 0.15;
                colors[i * 3 + 1] = c.g * 0.15;
                colors[i * 3 + 2] = c.b * 0.15;
              } else {
                colors[i * 3] = 0.08;
                colors[i * 3 + 1] = 0.08;
                colors[i * 3 + 2] = 0.1;
              }
            } else {
              // Head or unknown — very dim
              colors[i * 3] = 0.06;
              colors[i * 3 + 1] = 0.06;
              colors[i * 3 + 2] = 0.07;
            }
          }

          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

          child.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.35,
            metalness: 0.15,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
          });
        }
      });
    };

    // Load model
    const loader = new GLTFLoader();
    loader.load(
      '/forge-gymAK/male_anatomy.glb',
      (gltf) => {
        model = gltf.scene;

        // Center and scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.3;

        // Initial dark coloring
        const highlightSet = new Set(highlightMuscles);
        applyIntroColors(model, highlightSet, false);
        scene.add(model);

        setPhase('spin');

        // ====== GSAP CINEMATIC ANIMATION ======

        const tl = gsap.timeline({
          onComplete: () => {
            setPhase('done');
            onComplete();
          },
        });

        // Phase 1: Scene brightens + model spins 360° (2.5 seconds)
        tl.to(ambientLight, {
          intensity: 0.8,
          duration: 2.5,
          ease: 'power2.inOut',
        }, 0);

        tl.to(spotLight, {
          intensity: 3.5,
          duration: 2.5,
          ease: 'power2.inOut',
        }, 0);

        tl.to(model.rotation, {
          y: Math.PI * 2,
          duration: 2.5,
          ease: 'power2.inOut',
        }, 0);

        // Camera slightly moves during spin
        tl.fromTo(camera.position,
          { z: 5, y: 0.3 },
          { z: 3.5, y: 0.1, duration: 2.5, ease: 'power2.inOut' },
          0
        );

        // Phase 2: Highlight active muscles (at 2.5s)
        tl.call(() => {
          setPhase('highlight');
          if (model) applyIntroColors(model, highlightSet, true);
        }, [], 2.5);

        // Muscle glow pulse
        tl.call(() => {
          if (!model) return;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              gsap.to(child.material, {
                emissiveIntensity: 0.8,
                duration: 0.8,
                ease: 'power2.out',
              });
            }
          });
        }, [], 2.5);

        // Rim light pulses orange
        tl.to(rimLight, {
          intensity: 2.0,
          duration: 0.8,
          ease: 'power2.out',
        }, 2.5);
        tl.call(() => {
          rimLight.color.set(0xFF5E00);
        }, [], 2.5);

        // Phase 3: Camera zoom dive (3.5s → 5s)
        tl.call(() => {
          setPhase('zoom');
        }, [], 3.5);

        // Camera dives into the chest/torso area
        tl.to(camera.position, {
          z: 0.8,
          y: 0.15,
          x: 0,
          duration: 1.8,
          ease: 'power3.in',
        }, 3.5);

        tl.to(camera.rotation, {
          x: 0.1,
          y: 0,
          duration: 1.8,
          ease: 'power3.in',
        }, 3.5);

        // Increase fog as camera zooms in
        tl.to(scene.fog!, {
          density: 0.8,
          duration: 1.8,
          ease: 'power3.in',
        }, 3.5);

        // Spot light narrows to focus beam
        tl.to(spotLight, {
          angle: Math.PI / 12,
          intensity: 5.0,
          duration: 1.8,
          ease: 'power3.in',
        }, 3.5);

        // Phase 4: Screen wipe — overlay fades to black then clears
        tl.call(() => {
          if (overlayRef.current) {
            gsap.to(overlayRef.current, {
              opacity: 1,
              duration: 0.6,
              ease: 'power2.in',
            });
          }
        }, [], 5.0);

        tl.call(() => {
          setPhase('done');
          onComplete();
        }, [], 5.8);

        // Particle animation loop
        let animId: number;
        let time = 0;
        const animateParticles = () => {
          animId = requestAnimationFrame(animateParticles);
          time += 0.016;
          const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < particleCount; i++) {
            posAttr.array[i * 3] += velocities[i * 3];
            posAttr.array[i * 3 + 1] += velocities[i * 3 + 1];
            posAttr.array[i * 3 + 2] += velocities[i * 3 + 2];
            // Reset if too far
            if (Math.abs(posAttr.array[i * 3 + 1]) > 3) {
              posAttr.array[i * 3 + 1] = -3;
            }
          }
          posAttr.needsUpdate = true;
          particleMat.opacity = 0.3 + Math.sin(time * 2) * 0.2;
          renderer.render(scene, camera);
        };
        animateParticles();

        // Resize handler
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
        if (progress.total > 0) {
          setLoadPercent(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (error) => {
        console.error('CinematicIntro: Failed to load model:', error);
        // Skip intro on error
        onComplete();
      },
    );

    return () => {
      cleanupRef.current?.();
    };
  }, [highlightMuscles, height, onComplete]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mountRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Loading state */}
      {phase === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: '#050508' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#FF5E00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Loading model... {loadPercent > 0 && `${loadPercent}%`}
            </p>
          </div>
        </div>
      )}

      {/* Phase indicators — subtle text */}
      {phase === 'spin' && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,94,0,0.6)' }}>
            Analyzing physique...
          </p>
        </div>
      )}
      {phase === 'highlight' && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#FF5E00' }}>
            Today's focus • {highlightMuscles.join(' • ')}
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
