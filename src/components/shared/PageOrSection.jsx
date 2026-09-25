import PageHeading from "./PageHeading";

// A sales page renders two ways (owner, 2026-09-24): on its own route with
// its own page heading, or as one part of a combined page - F&B Sales holds
// the guest and non-guest halves, Laundry Sales does the same. The body is
// identical either way; only the frame around it changes, so neither page
// can drift from the other.
//
// hideTitle is for the combined pages, where each half is a tab (owner,
// 2026-09-25): the selected tab already names what is on screen, so a
// heading under it would say the same word twice. The section keeps the
// name for screen readers, which don't get it from the tab.
export default function PageOrSection({ asSection = false, hideTitle = false, icon, title, dataComponent, children }) {
  if (asSection) {
    return (
      <section
        data-component={dataComponent}
        aria-label={title}
        className="w-full flex flex-col items-start gap-[3rem]"
      >
        {!hideTitle && (
          <h2 className="text-4xl font-secondary font-bold text-[color:var(--black)]">{title}</h2>
        )}
        {children}
      </section>
    );
  }
  return (
    <div
      data-component={dataComponent}
      className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]"
    >
      <PageHeading icon={icon}>{title}</PageHeading>
      {children}
    </div>
  );
}
