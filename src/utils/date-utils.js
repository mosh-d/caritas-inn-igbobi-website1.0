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

// The hotel's "business day" runs 6:00am-to-6:00am Lagos time, not midnight
// — mirrors the backend's currentBusinessDate() in
// reservation-rules.constants.ts exactly (same formula, same reasoning): a
// guest arriving before 6am is checking into the business day that's still
// technically "yesterday's." Unlike localTodayISO() above, this does NOT use
// the device's local calendar getters — it shifts the device clock's own
// epoch value (Date.now(), a real, timezone-independent instant) by a fixed
// WAT-then-6am offset before reading UTC fields. That makes it correct even
// on a device whose clock is accurate but whose DISPLAY timezone isn't set
// to Africa/Lagos (confirmed as a real scenario 2026-08-11 — a receptionist
// whose phone's time was verified correct still couldn't be shown the right
// business date by a naive local-getter approach in the general case).
//
// This only ever feeds a date picker's `min` — a UX hint, not a business
// rule. The actual value used to create a walk-in's reservation is always
// computed authoritatively server-side (ReservationsService.
// createReservationHold), from the server's own clock, never trusted from
// here. Worst case if this helper is ever wrong: a picker's minimum date is
// off by a day; it can never produce an incorrect reservation record.
const BUSINESS_DAY_START_HOUR = 6;
const shiftedBusinessDateUTC = (now = serverNow()) => {
  const shifted = new Date(now.getTime() + (WAT_OFFSET_MINUTES - BUSINESS_DAY_START_HOUR * 60) * 60000);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
};
const isoFromUTCms = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

// Today's business date (YYYY-MM-DD) — before 6am Lagos this is YESTERDAY's
// calendar date, matching what a walk-in checking in right now will actually
// be recorded with server-side.
export const currentBusinessDateISO = () => isoFromUTCms(shiftedBusinessDateUTC());

// The earliest valid Walk-In checkout date: business date + 1 day. Before
// 6am Lagos this resolves to TODAY (a same-day stay is valid — the guest
// arrived before the cutover); at/after 6am it resolves to TOMORROW (a
// normal one-night stay), exactly matching the confirmed hotel policy.
export const minWalkInCheckOutISO = () => isoFromUTCms(shiftedBusinessDateUTC() + 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Server clock anchoring
// ---------------------------------------------------------------------------
// Everything above reads the device's own clock. That is right for the
// guest-facing booking pages (a guest should see their own date), but wrong
// for the admin panel: a front-desk PC with a mis-set clock or timezone
// quietly shows the wrong day's arrivals and defaults every report to the
// wrong date. The server is the only source of truth for "today" in Lagos
// terms — see reservation-rules.constants.ts's own note on exactly this.
//
// Rather than re-plumbing 21 call sites, we measure the difference between
// the server's clock and this device's once at admin load, then apply that
// offset wherever an admin-facing date is derived. Until the sync lands (or
// if it fails outright) every helper below behaves exactly as it did before,
// so a network hiccup degrades to today's behaviour rather than breaking the
// page.
let serverClockOffsetMs = 0;

export const applyServerClock = (serverTimeISO) => {
  const serverMs = new Date(serverTimeISO).getTime();
  if (!Number.isFinite(serverMs)) return;
  serverClockOffsetMs = serverMs - Date.now();
};

// How far off this device is, in minutes — surfaced so the admin panel can
// warn staff that the machine's own clock needs fixing, rather than silently
// papering over it forever.
export const deviceClockDriftMinutes = () => Math.round(serverClockOffsetMs / 60000);

const serverNow = () => new Date(Date.now() + serverClockOffsetMs);

// The Lagos calendar date, anchored to the server's clock — the admin-panel
// counterpart to localTodayISO(). Derived by shifting a real instant by the
// fixed WAT offset and reading UTC fields, so it is correct even on a device
// whose display timezone is not Africa/Lagos.
export const adminTodayISO = () => {
  const shifted = new Date(serverNow().getTime() + WAT_OFFSET_MINUTES * 60000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
};
