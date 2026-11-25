// Shared motion tokens. One rhythm for the whole site: exits run faster than entrances,
// everything is transform/opacity only, and MotionConfig honours prefers-reduced-motion.
import type { Transition } from 'framer-motion';

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  in: [0.55, 0, 0.75, 0.2] as const,
};

export const t = {
  quick: { duration: 0.16, ease: ease.out } satisfies Transition,
  base: { duration: 0.26, ease: ease.out } satisfies Transition,
  slow: { duration: 0.4, ease: ease.out } satisfies Transition,
  exit: { duration: 0.18, ease: ease.in } satisfies Transition,
  spring: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } satisfies Transition,
  softSpring: { type: 'spring', stiffness: 260, damping: 32 } satisfies Transition,
};

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
