/**
 * Page-level heading with a brand-tinted icon chip.
 * Usage: <PageHeading icon={IoBedOutline}>Rooms</PageHeading>
 * `badge` renders after the title (e.g. the alerts count pill).
 */
export default function PageHeading({ icon: Icon, children, badge, className = "" }) {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {Icon && (
        <span className="w-[4.4rem] h-[4.4rem] rounded-2xl bg-[color:var(--emphasis)]/10 text-[color:var(--emphasis)] flex items-center justify-center shrink-0">
          <Icon size={26} />
        </span>
      )}
      <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)] leading-none">{children}</h1>
      {badge}
    </div>
  );
}
