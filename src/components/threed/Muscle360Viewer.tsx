import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleRankResult } from '../../utils/ranking';
import { applyRankColors, toRankMap } from '../../utils/muscleModel';

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
const AUTO_SPIN_SPEED = 0.0042;

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
  const [dragging, setDragging] = useState(false);

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
    renderer.toneMappingExposure = 2.2;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));

    const spotLight = new THREE.SpotLight(0xffffff, 4.0);
    spotLight.position.set(2, 5, 4);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.3;
    scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0xff5e00, 1.2);
    rimLight.position.set(-3, 2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.0);
    fillLight.position.set(-2, 3, 2);
    scene.add(fillLight);

    scene.fog = new THREE.FogExp2(0x050508, 0.06);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(4, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05,
        roughness: 1,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;
    scene.add(ground);

    const bodies = new THREE.Group();
    scene.add(bodies);

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

        const makeBody = (offsetX: number, rankMap: ReturnType<typeof toRankMap>) => {
          const body = base.clone(true);
          body.scale.setScalar(scale);
          body.position.sub(center.clone().multiplyScalar(scale));
          body.position.y += 0.2;
          body.position.x += offsetX;
          applyRankColors(body, rankMap);
          bodies.add(body);
        };

        makeBody(-BODY_OFFSET_X, toRankMap(ranksARef.current));
        makeBody(BODY_OFFSET_X, toRankMap(ranksBRef.current));

        setReady(true);

        // ===== Pointer drag to rotate (both together) =====
        let isDragging = false;
        let prevX = 0;

        const onDown = (clientX: number) => {
          isDragging = true;
          prevX = clientX;
          setDragging(true);
        };
        const onMove = (clientX: number) => {
          if (!isDragging) return;
          const dx = clientX - prevX;
          prevX = clientX;
          bodies.rotation.y += dx * 0.008;
        };
        const onUp = () => {
          isDragging = false;
          setDragging(false);
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

        // ===== Render loop with idle auto-spin =====
        let animId: number;
        const animate = () => {
          animId = requestAnimationFrame(animate);
          if (!isDragging) {
            bodies.rotation.y += AUTO_SPIN_SPEED;
          }
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
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {dragging ? 'Rotating' : 'Drag to rotate 360°'}
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
