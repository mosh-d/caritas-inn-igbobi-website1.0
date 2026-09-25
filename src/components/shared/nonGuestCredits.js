// Which credits belong to a bill, and how to describe where one came from.
//
// A non-guest overpayment doesn't sit on the folio as a negative balance —
// the excess spins off into its own credit row (see
// NonGuestFoliosService.settleFolioPayment), which is why an overpaid bill
// still reads "settled" rather than "in credit". That's fine as long as the
// credit is findable afterwards.
//
// It wasn't. The only lookup was by the source folio's guest_name, and a
// walk-in sale is usually rung up without one — so paying ₦2,000 on a
// ₦1,500 laundry bill produced a ₦500 credit that nothing in the app could
// ever show or spend again (owner, 2026-09-24: "recorded as if only ₦1,500
// was paid instead of showing a credit").

// Credits that can be offered against a folio: the ones that came off this
// very bill first — that's the overpayment case, and it needs no name at
// all — then any pending credit belonging to the same named customer.
export const creditsForFolio = (credits = [], folio) => {
  if (!folio) return [];
  const name = (folio.guest_name || "").trim().toLowerCase();
  return credits.filter((c) => {
    if (c.status !== "pending") return false;
    if (String(c.source_non_guest_folio_id) === String(folio.id)) return true;
    const sourceName = (c.source_folio?.guest_name || "").trim().toLowerCase();
    return Boolean(name) && sourceName === name;
  });
};

// Whose credit it is, in as few words as the record actually supports — a
// name if the sale carried one, otherwise the folio number it came off.
export const creditOwnerLabel = (credit) =>
  credit?.source_folio?.guest_name?.trim()
  || credit?.source_folio?.folio_number
  || "Unnamed sale";

export const creditServiceLabel = (credit) =>
  credit?.source_folio?.service_type === "laundry" ? "Laundry" : "F&B";
