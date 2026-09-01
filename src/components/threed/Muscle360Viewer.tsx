import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleRankResult } from '../../utils/ranking';
import {
  applyRankColors,
  toRankMap,
  pulseMuscles,
  EXPOSURE,
} from '../../utils/muscleModel';

interface SideLabel {
  name: string;
  rank: string;
  tierColor: string;
  dotColor: string;
}

interface Muscle360ViewerProps {
  labelA: SideLabel;
  labelB: SideLabel;
  ranksA: MuscleRankResult[];
  ranksB: MuscleRankResult[];
  height?: number;
}

const BODY_OFFSET_X = 0.9;
// Each body drifts on its own axis at its own speed for an organic feel.
const AUTO_SPIN_A = 0.0042;
const AUTO_SPIN_B = 0.0054;

export default function Muscle360Viewer({
  labelA,
  labelB,
  ranksA,
  ranksB,
  height = 440,
}: Muscle360ViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [loadPercent, setLoadPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState('Drag each body to rotate');

  const ranksARef = useRef(ranksA);
  const ranksBRef = useRef(ranksB);
  ranksARef.current = ranksA;
  ranksBRef.current = ranksB;

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.3, 5.4);
    camera.lookAt(0, 0.3, 0);
    const focal = new THREE.Vector3(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050508, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    container.appendChild(renderer.domElement);

    // ===== Lighting: warm key + cool fill + colored rims =====
    scene.add(new THREE.AmbientLight(0xbfc8ff, 1.5));

    const keyLight = new THREE.SpotLight(0xffe2b3, 6.0);
    keyLight.position.set(2, 5, 4);
    keyLight.angle = Math.PI / 5;
    keyLight.penumbra = 0.3;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 1.3);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimWarm = new THREE.DirectionalLight(0xff5e00, 1.4);
    rimWarm.position.set(-2, 2.5, -4);
    scene.add(rimWarm);

    const rimCool = new THREE.DirectionalLight(0x22d3ee, 1.1);
    rimCool.position.set(3, 1.5, -3);
    scene.add(rimCool);

    scene.fog = new THREE.FogExp2(0x050508, 0.06);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 48),
      new THREE.MeshStandardMaterial({
        color: 0x7c8cff,
        transparent: true,
        opacity: 0.06,
        roughness: 1,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;
    scene.add(ground);

    // Two independent rotation groups, one per user.
    const groupA = new THREE.Group();
    const groupB = new THREE.Group();
    scene.add(groupA);
    scene.add(groupB);

    const loader = new GLTFLoader();
    loader.load(
      '/kasaint-gym/muscle_anatomy.glb',
      (gltf) => {
        const base = gltf.scene;

        const box = new THREE.Box3().setFromObject(base);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.0 / maxDim;

        const makeBody = (rankMap: ReturnType<typeof toRankMap>) => {
          const body = base.clone(true);
          body.scale.setScalar(scale);
          body.position.sub(center.clone().multiplyScalar(scale));
          body.position.y += 0.2;
          body.updateMatrixWorld(true);
          const mats = applyRankColors(body, rankMap);
          return { body, mats };
        };

        const bodyAObj = makeBody(toRankMap(ranksARef.current));
        const bodyBObj = makeBody(toRankMap(ranksBRef.current));
        bodyAObj.body.position.x -= BODY_OFFSET_X;
        bodyBObj.body.position.x += BODY_OFFSET_X;
        groupA.add(bodyAObj.body);
        groupB.add(bodyBObj.body);

        setReady(true);

        // ===== Independent rotation: grab the side of the body you want =====
        let isDragging = false;
        let prevX = 0;
        let targetGroup: THREE.Group | null = null;

        const rotationRoot = (el: number) => (el < 0 ? groupA : groupB);

        const onDown = (clientX: number) => {
          // Which side (relative to the canvas center) determines which body.
          const rect = renderer.domElement.getBoundingClientRect();
          const local = (clientX - rect.left) / rect.width - 0.5;
          targetGroup = rotationRoot(local);
          isDragging = true;
          prevX = clientX;
          setHint('Rotating…');
        };
        const onMove = (clientX: number) => {
          if (!isDragging || !targetGroup) return;
          const dx = clientX - prevX;
          prevX = clientX;
          targetGroup.rotation.y += dx * 0.008;
        };
        const onUp = () => {
          isDragging = false;
          targetGroup = null;
          setHint('Drag each body to rotate');
        };

        const mousedown = (e: MouseEvent) => onDown(e.clientX);
        const mousemove = (e: MouseEvent) => onMove(e.clientX);
        const mouseup = () => onUp();
        const touchstart = (e: TouchEvent) => {
          if (e.touches.length === 1) onDown(e.touches[0].clientX);
        };
        const touchmove = (e: TouchEvent) => {
          if (e.touches.length === 1) onMove(e.touches[0].clientX);
        };
        const touchend = () => onUp();

        const canvas = renderer.domElement;
        canvas.addEventListener('mousedown', mousedown);
        canvas.addEventListener('mousemove', mousemove);
        canvas.addEventListener('mouseup', mouseup);
        canvas.addEventListener('mouseleave', mouseup);
        canvas.addEventListener('touchstart', touchstart, { passive: true });
        canvas.addEventListener('touchmove', touchmove, { passive: true });
        canvas.addEventListener('touchend', touchend);
        canvas.style.touchAction = 'none';
        canvas.style.cursor = 'grab';

        // ===== Render loop: independent auto-spin + glow pulse =====
        let animId: number;
        let time = 0;
        const animate = () => {
          animId = requestAnimationFrame(animate);
          time += 0.016;

          if (targetGroup !== groupA) groupA.rotation.y += AUTO_SPIN_A;
          if (targetGroup !== groupB) groupB.rotation.y += AUTO_SPIN_B;

          pulseMuscles(bodyAObj.mats, time);
          pulseMuscles(bodyBObj.mats, time);

          camera.lookAt(focal);
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

        cleanupRef.current = () => {
          cancelAnimationFrame(animId);
          window.removeEventListener('resize', onResize);
          canvas.removeEventListener('mousedown', mousedown);
          canvas.removeEventListener('mousemove', mousemove);
          canvas.removeEventListener('mouseup', mouseup);
          canvas.removeEventListener('mouseleave', mouseup);
          canvas.removeEventListener('touchstart', touchstart);
          canvas.removeEventListener('touchmove', touchmove);
          canvas.removeEventListener('touchend', touchend);
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
        console.error('Muscle360Viewer: Failed to load model:', error);
      },
    );

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [height]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mountRef} className="w-full h-full rounded-xl overflow-hidden" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: '#050508' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#FF5E00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Loading... {loadPercent > 0 && `${loadPercent}%`}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: 'rgba(148,163,184,0.55)' }}>
            {hint}
          </p>
        </div>
      )}

      {/* Abel / Keneni labels pinned to each body */}
      <div
        className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg pointer-events-none"
        style={{ background: 'rgba(5,5,8,0.7)', border: `1px solid ${labelA.tierColor}50` }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: labelA.dotColor }} />
        <div className="leading-tight">
          <p className="text-[11px] font-bold capitalize" style={{ color: labelA.dotColor }}>{labelA.name}</p>
          <p className="text-[10px] font-black" style={{ color: labelA.tierColor }}>{labelA.rank}</p>
        </div>
      </div>
      <div
        className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg pointer-events-none"
        style={{ background: 'rgba(5,5,8,0.7)', border: `1px solid ${labelB.tierColor}50` }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: labelB.dotColor }} />
        <div className="leading-tight text-right">
          <p className="text-[11px] font-bold capitalize" style={{ color: labelB.dotColor }}>{labelB.name}</p>
          <p className="text-[10px] font-black" style={{ color: labelB.tierColor }}>{labelB.rank}</p>
        </div>
      </div>
    </div>
  );
}
