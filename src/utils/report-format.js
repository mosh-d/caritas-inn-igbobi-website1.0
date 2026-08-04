// Shared formatting helpers used by both AdminReports.jsx (the live report
// tabs) and AccountantReportsPage.jsx (rendering a sent report's frozen
// snapshot_data) — kept in one place so a snapshot always formats
// identically to how it looked when it was sent.

export const money = (v) =>
  `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pct = (v) => `${Number(v || 0).toFixed(1)}%`;

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

// check_in/check_out are stored as a UTC-midnight marker for the scheduled
// calendar date, not a real point in time — formatting them with a time
// component renders a meaningless "1:00 AM" (UTC midnight shifted into
// WAT). Use this for any date that hasn't actually happened yet (a
// scheduled checkout still in the future); use formatDateTime with the
// actual_check_in/actual_check_out timestamp once it's a real past event.
export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }) : "—";
