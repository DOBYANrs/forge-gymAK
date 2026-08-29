import { useEffect, useRef, type RefObject } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  revealClass?: string;
}

/**
 * Adds scroll-triggered reveal animations to an element.
 * The element should have a `.reveal-on-scroll` class (or custom class).
 *
 * Usage:
 *   const ref = useScrollReveal();
 *   <div ref={ref} className="reveal-on-scroll">...</div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: ScrollRevealOptions = {}
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { threshold = 0.15, rootMargin = '0px 0px -40px 0px', revealClass = 'revealed' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add(revealClass);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(revealClass);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [threshold, rootMargin, revealClass]);

  return ref;
}

/**
 * Adds mouse-tracking spotlight effect to cards.
 * Call this in the component and pass the ref to the card element.
 */
export function useCardSpotlight<T extends HTMLElement = HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mouse-x', `${x}%`);
      el.style.setProperty('--mouse-y', `${y}%`);
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return ref;
}

/**
 * Adds 3D tilt effect on hover.
 * Pass the ref to the card element.
 */
export function use3DTilt<T extends HTMLElement = HTMLElement>(maxTilt = 6): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (y - 0.5) * -maxTilt;
      const rotateY = (x - 0.5) * maxTilt;
      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale(1)';
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [maxTilt]);

  return ref;
}

/**
 * Adds ripple effect to buttons on click.
 */
export function useRipple() {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height) * 0.4}px`;
    ripple.style.marginLeft = `-${Math.max(rect.width, rect.height) * 0.2}px`;
    ripple.style.marginTop = `-${Math.max(rect.width, rect.height) * 0.2}px`;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return { onClick: handleClick };
}
