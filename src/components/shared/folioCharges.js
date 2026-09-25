// One vocabulary for a folio's charge lines, shared by every view that lists
// them (Guest Folios, Guest Sales, and the non-guest pages).

// What each charge is, in the guest's language. Food and drink both read
// "F&B" (owner, 2026-09-24): a guest reading their bill cares that the line
// came from the restaurant or bar, not which of the two tables it sits in.
export const CHARGE_TYPE_LABELS = {
  room_charge: "Room Charge",
  breakfast_charge: "Breakfast",
  food_charge: "F&B",
  drink_charge: "F&B",
  laundry_charge: "Laundry Charge",
  penalty: "Penalty",
  adjustment: "Adjustment",
  // For fixing an accommodation charge after the fact. Kept distinct from
  // Room Charge so a correction stops being reported as an extra night of
  // its own on the Accommodation and Debt Recovery reports.
  correction: "Correction",
};

export const chargeTypeLabel = (item) => CHARGE_TYPE_LABELS[item?.item_type] || item?.item_type || "";

// A charge line's own money. Guest folio rows carry a computed `total`;
// non-guest rows price themselves as amount + service charge.
export const chargeTotal = (item) =>
  Number(item?.total ?? Number(item?.amount || 0) + Number(item?.service_charge || 0));

// Which charges the money received has settled, line by line (owner,
// 2026-09-24: "so we can tell what exactly the system has used money to
// settle").
//
// A folio records one running amount paid, never an allocation per charge —
// a payment settles the bill, not a chosen line of it. So this reads the
// bill the way money actually comes off one: oldest charge first, until the
// money runs out. The line it runs out on is part paid; everything after it
// is owing. Display only - it changes nothing about what is owed, only how
// the list reads.
//
// A line that costs nothing gets no tag at all (owner, 2026-09-25), and is
// simply left out of the map — StatusBadge renders nothing for a missing
// status, so every caller gets this without asking. It used to read "Paid",
// which claimed money had settled a complementary item that was given away
// free: "French Fries (F&B) ... Paid ₦0.00". There is nothing to settle on
// a free line, so the question the tag answers doesn't apply to it. Same
// for a manager line (zeroed server-side the same way) and for a negative
// adjustment, which takes money OFF the bill rather than being settled by
// it. None of them consume any of the money on hand, so leaving them out
// changes nothing about how the paying lines are read.
export function settlementByCharge(items = [], amountPaid = 0) {
  const order = [...items].sort(
    (a, b) =>
      new Date(a.created_at || 0) - new Date(b.created_at || 0) ||
      Number(a.id || 0) - Number(b.id || 0),
  );
  let left = Number(amountPaid || 0);
  const state = new Map();
  for (const item of order) {
    const total = chargeTotal(item);
    if (total <= 0) {
      continue; // nothing to settle — see above
    }
    if (left >= total) {
      state.set(item.id, "paid");
      left -= total;
    } else if (left > 0) {
      state.set(item.id, "part paid");
      left = 0;
    } else {
      state.set(item.id, "owing");
    }
  }
  return state;
}
