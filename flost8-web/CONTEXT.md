# FLOST8 Web — Context

Domain language for the FLOST8 marketing site (React + Vite). Defines project-specific terms so code and reviews use one consistent vocabulary.

## Language

**motion-safe**:
The single seam (`src/hooks/useMotionSafe.ts`) that decides whether motion runs, honoring the user's `prefers-reduced-motion` setting. Every animation site — framer-motion and anime.js alike — reads its verdict (`reduce`) and gates through it (`guard`, `variant`) rather than calling `useReducedMotion()` directly.
_Avoid_: reduced-motion-check, a11y-guard, shouldReduce
