import { useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_ORDER = ['/', '/schedule', '/ranking', '/muscle360', '/social', '/progress'];

const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 0.4;
const MAX_VERTICAL_DRIFT = 80;

export default function SwipeNavigator({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startTime = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = performance.now();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    const dt = performance.now() - startTime.current;

    startX.current = null;
    startY.current = null;

    if (Math.abs(dy) > MAX_VERTICAL_DRIFT) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    const velocity = Math.abs(dx) / dt;
    const isSwipe = Math.abs(dx) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD;
    if (!isSwipe) return;

    const currentIndex = TAB_ORDER.indexOf(location.pathname);
    if (currentIndex === -1) return;

    const direction = dx < 0 ? 1 : -1;
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), TAB_ORDER.length - 1);
    if (nextIndex === currentIndex) return;

    navigate(TAB_ORDER[nextIndex]);
  };

  return (
    <div
      className="h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
