import { motion } from "motion/react";

// Motion (motion.dev) for the admin UI (2026-09-19). One place for the
// animation vocabulary, so every page moves the same way.
//
// Components are re-exported under capitalised names on purpose: this repo's
// ESLint config tracks JSX usage only for capitalised bindings
// (no-unused-vars' varsIgnorePattern '^[A-Z_]'), so `<motion.div>` straight
// from "motion/react" reads as an unused import.
//
// Every preset below animates opacity and transform only, and none leaves a
// transform behind once it settles - Motion writes `transform: none` at rest.
// That matters: a transform on an ancestor makes every position:fixed modal
// inside it position against that ancestor instead of the viewport.
// AdminRoot's <MotionConfig reducedMotion="user"> turns all of it off for
// anyone whose system asks for reduced motion.
export { AnimatePresence, MotionConfig } from "motion/react";
export const MotionDiv = motion.div;
export const MotionButton = motion.button;
export const MotionUl = motion.ul;
export const MotionLi = motion.li;

// Ease-out-quint: quick to arrive, soft to settle.
export const EASE_OUT = [0.22, 1, 0.36, 1];

// A page's content arriving after navigation.
export const pageEnter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: EASE_OUT },
};

// Content swapping in under a tab bar.
export const tabEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: EASE_OUT },
};

// A dialog opening: the backdrop fades, the panel rises into place.
export const backdropEnter = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.18 },
};
export const panelEnter = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 420, damping: 32 },
};

// A group of cards arriving one after another (parent + child variants).
export const staggerParent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05 } },
};
export const staggerChild = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};
