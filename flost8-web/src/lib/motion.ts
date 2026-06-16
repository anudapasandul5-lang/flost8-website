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

export const fadeUpBlur: Variants = {
  // IMPORTANT: filter animation is NOT suppressed by the CSS reduced-motion safety net.
  // Consuming components MUST use the useMotionSafe() seam and skip this variant if reduce is true.
  // Desktop only — gate via: const { variant } = useMotionSafe(); const v = variant(fadeUpBlur, fadeUp);
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.7, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 1.35, ease: EASE } },
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
