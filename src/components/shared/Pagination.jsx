import Button from "./Button";

// Previous / Page X of Y / Next under a table - the one pager every paged
// list uses (2026-09-28; it had been written out by hand eight times).
// Renders nothing when everything fits on one page.
export default function Pagination({ page, totalPages, onPage, className = "mt-6" }) {
  if (!totalPages || totalPages <= 1) return null;
  const first = page <= 1;
  const last = page >= totalPages;
  return (
    <div className={`flex justify-center items-center gap-4 w-full ${className}`}>
      <Button variant="emphasis" onClick={() => onPage(page - 1)} disabled={first} className={first ? "opacity-30 cursor-not-allowed" : ""}>
        Previous
      </Button>
      <span className="text-lg font-medium">Page {page} of {totalPages}</span>
      <Button variant="emphasis" onClick={() => onPage(page + 1)} disabled={last} className={last ? "opacity-30 cursor-not-allowed" : ""}>
        Next
      </Button>
    </div>
  );
}
