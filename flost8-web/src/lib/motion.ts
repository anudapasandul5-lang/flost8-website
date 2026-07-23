// FLOST8 branded motion — import these everywhere instead of inline spring stiffness/damping.
// All animations gated via the useMotionSafe() seam (src/hooks/useMotionSafe.ts) in consuming components.

import type { Variants } from 'framer-motion';

// Signature cubic-bezier easing: fast-in, long ease-out (premium feel)
export const EASE = [0.16, 1, 0.3, 1] as const;

// Framer motion transition presets
export const SPRING = { type: "spring", stiffness: 260, damping: 50 } as const;

// Reusable Framer Motion variants
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.5, ease: EASE } },
};

export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.24, delayChildren: 0.15 } },
};

// Stagger with larger delay for orchestrated first-paint sequences (nav → hero)
export const staggerParentSlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.3, delayChildren: 0.22 } },
}

// easeInOutCubic — cinematic accelerate/decelerate for Lenis scrollTo
export const lenisEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
