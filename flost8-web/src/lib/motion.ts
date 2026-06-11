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
  visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: EASE } },
};

export const fadeUpBlur: Variants = {
  // IMPORTANT: filter animation is NOT suppressed by the CSS reduced-motion safety net.
  // Consuming components MUST check useReducedMotion() and skip this variant if true.
  // Desktop only — gate behind: const shouldReduce = useReducedMotion(); const variant = shouldReduce ? fadeUp : fadeUpBlur;
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.15, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } },
};

export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.1 } },
};

// Stagger with larger delay for orchestrated first-paint sequences (nav → hero)
export const staggerParentSlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2, delayChildren: 0.15 } },
};
