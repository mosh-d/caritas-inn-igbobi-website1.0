// Shared class recipes for the redesigned admin UI.
// Keep these in sync across pages so every table, modal, and form feels identical.

export const btn = {
  // Solid brand-orange call-to-action
  primary:
    "px-8 pt-4 pb-4 rounded-lg bg-[color:var(--emphasis)] text-white text-xl font-bold tracking-wide cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--emphasis)] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
  // Quiet bordered action
  secondary:
    "px-8 pt-4 pb-4 rounded-lg border border-[color:var(--text-color)]/25 bg-white text-[color:var(--text-color)] text-xl font-semibold tracking-wide cursor-pointer transition-all hover:bg-black/5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--text-color)] disabled:opacity-40 disabled:cursor-not-allowed",
  // Destructive
  danger:
    "px-8 pt-4 pb-4 rounded-lg border border-red-300 bg-white text-red-600 text-xl font-semibold tracking-wide cursor-pointer transition-all hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-40 disabled:cursor-not-allowed",
  // Solid destructive (confirm step)
  dangerSolid:
    "px-8 pt-4 pb-4 rounded-lg bg-red-600 text-white text-xl font-bold tracking-wide cursor-pointer transition-all hover:bg-red-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-40 disabled:cursor-not-allowed",
  // Positive action (confirm reservation, record payment)
  success:
    "px-8 pt-4 pb-4 rounded-lg bg-green-700 text-white text-xl font-bold tracking-wide cursor-pointer transition-all hover:bg-green-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-40 disabled:cursor-not-allowed",
  // Compact variants for table rows — always laid out horizontally
  rowPrimary:
    "px-5 pt-2.5 pb-2.5 rounded-lg bg-[color:var(--emphasis)] text-white text-lg font-bold tracking-wide cursor-pointer whitespace-nowrap transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--emphasis)] disabled:opacity-40 disabled:cursor-not-allowed",
  rowSecondary:
    "px-5 pt-2.5 pb-2.5 rounded-lg border border-[color:var(--text-color)]/25 bg-white text-[color:var(--text-color)] text-lg font-semibold tracking-wide cursor-pointer whitespace-nowrap transition-all hover:bg-black/5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--text-color)] disabled:opacity-40 disabled:cursor-not-allowed",
  rowDanger:
    "px-5 pt-2.5 pb-2.5 rounded-lg border border-red-300 bg-white text-red-600 text-lg font-semibold tracking-wide cursor-pointer whitespace-nowrap transition-all hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-40 disabled:cursor-not-allowed",
  rowSuccess:
    "px-5 pt-2.5 pb-2.5 rounded-lg bg-green-700 text-white text-lg font-bold tracking-wide cursor-pointer whitespace-nowrap transition-all hover:bg-green-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-40 disabled:cursor-not-allowed",
};

export const field = {
  label: "text-xl font-semibold text-[color:var(--text-color)]/84",
  input:
    "w-full border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl bg-white text-[color:var(--text-color)] placeholder:text-[color:var(--text-color)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)] focus:border-transparent transition-shadow",
  select:
    "w-auto border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl bg-white text-[color:var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)] focus:border-transparent transition-shadow cursor-pointer",
  // resize-none + overflow-hidden since height is driven by AutoGrowTextarea
  // (see components/shared/AutoGrowTextarea.jsx) — a manual resize handle
  // would just get overridden on the next keystroke anyway.
  textarea:
    "w-full border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl bg-white text-[color:var(--text-color)] placeholder:text-[color:var(--text-color)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)] focus:border-transparent transition-shadow resize-none overflow-hidden",
};

export const table = {
  // Wrap the <table> in: <div className={table.card}><div className={table.scroll}><table className={table.el}>...
  card: "w-full bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden",
  scroll: "overflow-x-auto",
  el: "min-w-full border-collapse text-2xl",
  headRow: "border-b border-[color:var(--text-color)]/15 bg-[color:var(--text-color)]/3",
  th: "px-8 py-4 text-left whitespace-nowrap text-xl font-semibold uppercase tracking-wide text-[color:var(--text-color)]/76",
  // `group` lets the identification column below track the row's own hover
  // tint via group-hover, instead of sitting static while everything else
  // visibly dims/tints on hover.
  row: "group border-b border-[color:var(--text-color)]/10 last:border-b-0 transition-colors hover:bg-black/2",
  td: "px-8 py-4 text-left whitespace-nowrap",
  // Horizontal action group inside a row — never stacks vertically
  actions: "flex items-center gap-2 flex-nowrap",
  // The column that identifies which row this is (2026-09-19) - a guest,
  // customer, staff member, room type or whatever else a table's rows are
  // actually rows OF - pinned to the left so it stays in view while a wide
  // table scrolls sideways. Compose with the table's own padding/typography
  // classes (table.th/table.td, or a page's own px-*/py-*), not in place of
  // them: `` `${table.th} ${table.stickyTh}` ``. Position-based (works
  // whichever column it's applied to), not `:first-child`-based, since the
  // identifying column isn't always the first one in the markup.
  //
  // stickyTh's background MUST be opaque (fixed 2026-09-19): a translucent
  // one - table.headRow's own bg-[...]/3 tint, tried first - is only 3%
  // opaque, nowhere near enough to hide the next column's header text once
  // the table is actually scrolled ("GUESFTOLIO #"). color-mix against a
  // real opaque colour keeps the same visual tint while genuinely covering
  // what scrolls underneath - the same formula Reports' own sticky columns
  // already use (index.css).
  //
  // The divider is a box-shadow, never a real `border` (fixed 2026-09-19,
  // second pass: the border rendered fine at rest and then vanished once
  // scrolled). table.el sets border-collapse: collapse, and a COLLAPSED
  // border is resolved against the table's true, un-scrolled grid geometry -
  // a separate pass from a sticky element's own compositing - so it can
  // visually decouple from the cell once scrolling moves it. A box-shadow is
  // pure paint on the element's own box; it has no part in border-collapse
  // resolution, so there is nothing for it to decouple from. Same fix
  // Reports' sticky columns already use, for the same reason.
  //
  // table.td never wraps, but below `lg` the pinned column does - at word
  // breaks, inside a minimum width - so a long name takes two lines rather
  // than a phone's whole width (2026-09-19). Without the minimum, an
  // overflowing table shrinks it to its longest single word. Important (!)
  // because it composes with table.td's whitespace-nowrap, and between two
  // same-property utilities Tailwind's stylesheet order wins, not class order.
  stickyTh: `sticky left-0 z-10 bg-[color-mix(in_srgb,var(--text-color)_3%,white)] [box-shadow:inset_-1px_0_0_color-mix(in_srgb,var(--text-color)_12%,transparent)]`,
  stickyTd: `sticky left-0 z-10 max-lg:whitespace-normal! max-lg:min-w-[18rem] bg-white group-hover:bg-[color-mix(in_srgb,black_2%,white)] [box-shadow:inset_-1px_0_0_color-mix(in_srgb,var(--text-color)_12%,transparent)]`,
};

// Full-width section heading used inside modals
export const sectionTitle = "text-2xl font-bold text-[color:var(--black)]";
