// Shared formatting helpers used across the report tabs in
// AdminReports.jsx — kept in one place so every report formats identically.

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

// Payment methods are stored lowercase (cash, pos, transfer, ota, ...). OTA
// and POS are initialisms, so a CSS capitalize class rendered them as "Ota"
// and "Pos" — every display of a method goes through here instead. The
// backend has the same helper in common/utils/payment-method.util.ts.
//
// Reports build comma-joined lists of methods ("cash, pos"), so each value is
// handled in turn.
const PAYMENT_METHOD_LABELS = {
  ota: "OTA",
  pos: "POS",
  // The Manifest writes NIL for a night with nothing paid against it.
  nil: "NIL",
  charged_to_room: "Charged to Room",
  reservation_credit: "Reservation Credit",
};

export const formatPaymentMethod = (method) => {
  const raw = String(method ?? "").trim();
  if (!raw) return "—";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const key = part.toLowerCase();
      if (PAYMENT_METHOD_LABELS[key]) return PAYMENT_METHOD_LABELS[key];
      return key
        .split(/[\s_]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    })
    .join(", ");
};
