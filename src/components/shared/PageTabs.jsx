// The wrapping pill tabs the PMS already uses to switch what a page is
// showing (Check-Ins' Expected Arrivals / Walk-In / Future Booking, Reports'
// own row). Shared from here (2026-09-25) so a page that splits into tabs
// doesn't hand-copy the markup a third time.
//
// They wrap rather than sit in one scrolling row: underlined in a single
// row, a label broke mid-word on a phone ("Walk- / In").
export default function PageTabs({ tabs, active, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-3 w-full ${className}`} role="tablist">
      {tabs.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`px-6 py-3 rounded-lg text-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
              isActive
                ? "bg-[color:var(--emphasis)] text-white"
                : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
