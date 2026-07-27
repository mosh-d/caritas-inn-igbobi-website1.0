// Returns the browser's local calendar date as YYYY-MM-DD.
//
// Deliberately NOT `new Date().toISOString().split("T")[0]` — toISOString()
// always converts to UTC first. For any timezone ahead of UTC (Lagos/WAT is
// UTC+1), that reports the WRONG calendar date for roughly the first hour
// after each local midnight: a guest booking at 12:26am WAT on the 22nd
// would see "today" computed as the 21st, since UTC hadn't rolled over yet.
// That's how a check-in date that had already passed locally still looked
// selectable. Building the string from the local getters instead reflects
// whatever date the guest's own clock is actually showing.
export const localTodayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// The hotel's actual check-in/check-out time is 12:00pm (noon) Lagos time,
// not midnight — a stay scheduled to leave "today" isn't actually overdue
// the instant that calendar day begins. WAT is a fixed UTC+1 offset
// year-round (Nigeria doesn't observe DST). Mirrors the backend's
// hasPassedNoonCutoff() in reservation-rules.constants.ts — check_in/
// check_out are always stored as UTC midnight representing the Lagos
// calendar date, so noon Lagos time on that date is UTC midnight + 11 hours.
const WAT_OFFSET_MINUTES = 60;
export const hasPassedNoonCutoff = (dateOnly, now = new Date()) => {
  const d = new Date(dateOnly);
  const dayUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const cutoff = dayUTC + (12 * 60 - WAT_OFFSET_MINUTES) * 60000;
  return now.getTime() >= cutoff;
};
