import { useRef, type ReactNode, type PointerEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_ORDER = ['/', '/schedule', '/ranking', '/muscle360', '/social', '/progress'];

const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 0.4;
const MAX_VERTICAL_DRIFT = 120;

// Normalise a path for TAB_ORDER matching (handles missing/extra trailing slash).
function normalizePath(path: string): string {
  if (path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

export default function SwipeNavigator({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startTime = useRef(0);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Only track primary pointers (mouse left button / first touch finger).
    if (!e.isPrimary) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startTime.current = performance.now();
  };

  const finishSwipe = (clientX: number, clientY: number) => {
    if (startX.current === null || startY.current === null) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    const dt = performance.now() - startTime.current;

    startX.current = null;
    startY.current = null;

    // Ignore vertical scrolls / taps.
    if (Math.abs(dy) > MAX_VERTICAL_DRIFT) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    const velocity = Math.abs(dx) / dt;
    const isSwipe = Math.abs(dx) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD;
    if (!isSwipe) return;

    const currentIndex = TAB_ORDER.indexOf(normalizePath(location.pathname));
    if (currentIndex === -1) return;

    const direction = dx < 0 ? 1 : -1;
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), TAB_ORDER.length - 1);
    if (nextIndex === currentIndex) return;

    navigate(TAB_ORDER[nextIndex]);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    finishSwipe(e.clientX, e.clientY);
  };

  const onPointerCancel = () => {
    startX.current = null;
    startY.current = null;
  };

  return (
    <div
      className="h-full"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
