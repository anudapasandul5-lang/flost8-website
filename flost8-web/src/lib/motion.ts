// FLOST8 branded motion — import these everywhere instead of inline spring stiffness/damping.
// All animations gated via framer-motion's useReducedMotion() in consuming components.

import type { Variants } from 'framer-motion';

// Signature cubic-bezier easing: fast-in, long ease-out (premium feel)
export const EASE = [0.16, 1, 0.3, 1] as const;

// Framer motion transition presets
export const SPRING = { type: "spring", stiffness: 400, damping: 40 } as const;

// Reusable Framer Motion variants
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.05, ease: EASE } },
};

export const fadeUpBlur: Variants = {
  // IMPORTANT: filter animation is NOT suppressed by the CSS reduced-motion safety net.
  // Consuming components MUST check useReducedMotion() and skip this variant if true.
  // Desktop only — gate behind: const shouldReduce = useReducedMotion(); const variant = shouldReduce ? fadeUp : fadeUpBlur;
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.2, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } },
};

export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.08 } },
};

// Stagger with larger delay for orchestrated first-paint sequences (nav → hero)
export const staggerParentSlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.15 } },
};

// IMPORTANT: transform (y) animation is NOT suppressed by the CSS reduced-motion safety net.
// Consuming components MUST check useReducedMotion() and skip this variant if true.
// For use on a child element inside an `overflow-hidden` wrapper to create a line-mask reveal.
export const lineReveal: Variants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 0.9, ease: EASE } },
};

// IMPORTANT: clipPath animation is NOT suppressed by the CSS reduced-motion safety net.
// Consuming components MUST check useReducedMotion() and skip this variant if true.
export const clipReveal: Variants = {
  hidden: { clipPath: 'inset(100% 0% 0% 0%)' },
  visible: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 1, ease: EASE } },
};

// IMPORTANT: transform (x) animation is NOT suppressed by the CSS reduced-motion safety net.
// Consuming components MUST check useReducedMotion() and skip this variant if true.
// direction: 1 slides in from the right, -1 slides in from the left.
export const slideInX = (direction: 1 | -1): Variants => ({
  hidden: { opacity: 0, x: 48 * direction },
  visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE } },
});
