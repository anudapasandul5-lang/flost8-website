// FLOST8 branded motion — import these everywhere instead of inline spring stiffness/damping.
// All animations gated via framer-motion's useReducedMotion() in consuming components.

// Signature cubic-bezier easing: fast-in, long ease-out (premium feel)
export const EASE = [0.16, 1, 0.3, 1] as const;

// Framer motion transition presets
export const SPRING = { type: "spring", stiffness: 400, damping: 40 } as const;

// Reusable Framer Motion variants
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const fadeUpBlur = {
  // Desktop: blur-in reveal. Mobile/reduced-motion: handled in consuming component.
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

export const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// Stagger with larger delay for orchestrated first-paint sequences (nav → hero)
export const staggerParentSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
