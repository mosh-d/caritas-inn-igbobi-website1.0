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
  textarea:
    "w-full border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl bg-white text-[color:var(--text-color)] placeholder:text-[color:var(--text-color)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)] focus:border-transparent transition-shadow min-h-[8rem] resize-y",
};

export const table = {
  // Wrap the <table> in: <div className={table.card}><div className={table.scroll}><table className={table.el}>...
  card: "w-full bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden",
  scroll: "overflow-x-auto",
  el: "min-w-full border-collapse text-2xl",
  headRow: "border-b border-[color:var(--text-color)]/15 bg-[color:var(--text-color)]/3",
  th: "px-8 py-4 text-left whitespace-nowrap text-xl font-semibold uppercase tracking-wide text-[color:var(--text-color)]/76",
  row: "border-b border-[color:var(--text-color)]/10 last:border-b-0 transition-colors hover:bg-black/2",
  td: "px-8 py-4 text-left",
  // Horizontal action group inside a row — never stacks vertically
  actions: "flex items-center gap-2 flex-nowrap",
};

// Full-width section heading used inside modals
export const sectionTitle = "text-2xl font-bold text-[color:var(--black)]";
