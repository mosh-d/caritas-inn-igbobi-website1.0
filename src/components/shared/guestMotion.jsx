import { motion } from "motion/react";

// Motion for the guest-facing site (2026-09-19). One vocabulary for every
// page, so the site moves the same way throughout:
//
// - Content arrives once, as it scrolls into view - never again on the way
//   back up, and never on a mere re-render.
// - Only opacity, transform and clip-path animate: nothing shifts the layout
//   under the reader, and it all stays on the compositor.
// - One ease (ease-out-quint): quick to arrive, soft to settle.
// - RootLayout's <MotionConfig reducedMotion="user"> drops the movement for
//   anyone whose system asks for reduced motion; content still fades in.
//
// Built on the lookup table below rather than `<motion.div>` in JSX: this
// repo's ESLint config only tracks JSX usage of capitalised bindings, so a
// JSX-only `motion` import reads as unused.

const EASE = [0.22, 1, 0.36, 1];

// A block counts as "in view" once a fifth of it is on screen - early enough
// that nothing is still settling while it's being read, late enough that the
// arrival is actually seen.
const VIEWPORT = { once: true, amount: 0.2 };

const TAGS = {
  div: motion.div,
  section: motion.section,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  ul: motion.ul,
  li: motion.li,
  tbody: motion.tbody,
  tr: motion.tr,
  span: motion.span,
  img: motion.img,
};
const MotionSpan = motion.span;

// One block fading up into place as it scrolls into view.
export function Reveal({ as = "div", delay = 0, x = 0, y = 28, duration = 0.8, amount = 0.2, children, ...rest }) {
  const Tag = TAGS[as];
  return (
    <Tag
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ ...VIEWPORT, amount }}
      transition={{ duration, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// A set of siblings arriving one after another - cards, list items, rows.
// Its RevealItems (at any depth below it) take their cue from it.
export function RevealGroup({ as = "div", stagger = 0.08, delay = 0, amount = 0.15, children, ...rest }) {
  const Tag = TAGS[as];
  return (
    <Tag
      initial="hidden"
      whileInView="shown"
      viewport={{ ...VIEWPORT, amount }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const ITEM = {
  hidden: ({ x = 0, y = 24, scale = 1 } = {}) => ({ opacity: 0, x, y, scale }),
  shown: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

// One member of a RevealGroup. x / y / scale set where it arrives from.
export function RevealItem({ as = "div", x, y, scale, variants = ITEM, children, ...rest }) {
  const Tag = TAGS[as];
  return (
    <Tag variants={variants} custom={{ x, y, scale }} {...rest}>
      {children}
    </Tag>
  );
}

const WORD = {
  hidden: { y: "110%" },
  shown: { y: "0%", transition: { duration: 0.9, ease: EASE } },
};

// A heading whose words rise one after another from behind their own line,
// like type being set. On the page's first view (`onLoad`) for the hero, or
// as it scrolls into view for section headings. The words stay real text,
// separated by real spaces, so it reads, wraps, copies and indexes exactly
// as the plain heading did. The mask's small bottom padding (cancelled by an
// equal negative margin) keeps descenders from being clipped.
export function Words({ text, as = "h2", onLoad = false, delay = 0, stagger = 0.07, children, ...rest }) {
  const Tag = TAGS[as];
  const trigger = onLoad ? { animate: "shown" } : { whileInView: "shown", viewport: VIEWPORT };
  return (
    <Tag
      initial="hidden"
      {...trigger}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {text.split(" ").map((word, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className="inline-block overflow-hidden align-bottom pb-[0.15em] -mb-[0.15em]">
            <MotionSpan className="inline-block" variants={WORD}>
              {word}
            </MotionSpan>
          </span>
        </span>
      ))}
      {children}
    </Tag>
  );
}
