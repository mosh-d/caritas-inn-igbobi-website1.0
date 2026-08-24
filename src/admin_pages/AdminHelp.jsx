import {
  IoHelpCircleOutline,
  IoGridOutline,
  IoBedOutline,
  IoAppsOutline,
  IoCalendarOutline,
  IoPeopleOutline,
  IoReceiptOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoHomeOutline,
  IoBarChartOutline,
  IoMoonOutline,
  IoNotificationsOutline,
  IoDocumentTextOutline,
  IoKeyOutline,
  IoRestaurantOutline,
  IoCartOutline,
} from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import { isManager, isAccountant, getStoredStaffRole } from "../utils/auth";

// Mirrors ADMIN_NAV_ITEMS' order (adminNavItems.js) so the quick-jump chips
// and section order match the sidebar exactly — this page exists so a new
// staff member (or anyone unsure what a page actually does) has one place to
// check instead of guessing from a label alone.
const SECTIONS = [
  {
    id: "overview",
    icon: IoGridOutline,
    label: "Overview",
    summary: "The daily snapshot: today's arrivals/departures, who's in-house, payments received, and a quick room-inventory glance.",
    workflow: [
      "\"MTD\" on Payments Received means Month-to-Date — total collected so far this calendar month.",
      "Clicking a number (e.g. \"Outstanding\") jumps to the matching page with the right tab pre-selected.",
      "A colored banner appears here whenever any room is flagged Out of Order, Complementary, or Reserved — showing the count, and for Reserved, the room number(s) too. Clicking a banner jumps straight to Rooms with that room type open and the room highlighted.",
      "Room status (Out of Order/Complementary/Reserved, set from the Rooms page) is the only way to pull a room out of availability — there's no separate manual room-count override.",
    ],
  },
  {
    id: "rooms",
    icon: IoBedOutline,
    label: "Rooms",
    summary: "Manage room TYPES (Deluxe, Standard, etc.) — pricing, capacity, amenities — and the individual numbered rooms (inventory) within each type.",
    workflow: [
      "Each physical room has one manual status, set from its room type's Physical Rooms list: Available, Out of Order, Complementary, or Reserved (set aside for a branch/zonal manager).",
      "Out of Order and Reserved both hide the room from every availability count and booking picker right away. Complementary is different — the room stays fully bookable and visible; only the bill changes.",
      "Marking a room Complementary automatically lowers the bill from that point on — you never need to add a manual discount yourself. If the guest hasn't checked in yet, the first night is already billed correctly. If they're already checked in, tonight's Night Audit will bill only the non-complementary rooms from now on.",
      "The one thing it won't do: fix nights that were already charged before you marked the room Complementary — those stay billed as they were. The one exception is if every room on that reservation ends up Complementary — then the system automatically wipes every night already charged for that stay.",
      "A room can also show \"Occupied\" — a real guest is assigned there right now. This is worked out automatically and can never be set by hand.",
      "The Physical Rooms list inside a room type's detail view is collapsible — useful once a room type has a lot of numbered rooms.",
      "Reducing a room type's physical room count can delete rows — you'll be asked to confirm first, and it's refused outright if any of the rooms being removed are currently occupied or have a future booking.",
    ],
  },
  {
    id: "room-chart",
    icon: IoAppsOutline,
    label: "Room Chart",
    summary: "A calendar-style grid — room numbers down the side, dates across the top — for seeing who's booked into which room over a date range at a glance.",
    workflow: [
      "Best for spotting a scheduling conflict or a gap in a room's booking visually, faster than reading a list of reservations one at a time.",
      "Each room's live status tag (Occupied, Out of Order, Complementary, Reserved) shows here too, so you can tell a real stay apart from an admin flag without leaving the chart.",
    ],
  },
  {
    id: "reservations",
    icon: IoCalendarOutline,
    label: "Reservations",
    summary: "The full booking list and lifecycle for every reservation, from first hold through checkout.",
    workflow: [
      "Lifecycle: Hold (created, awaiting payment) → Confirmed (paid) → Active (checked in) → Completed (checked out). A Hold can also be Cancelled, or become a No-Show if the guest never arrives.",
      "A Hold auto-cancels itself if left unconfirmed too long (see Alerts → Unconfirmed) — always confirm a real booking promptly so it doesn't expire.",
      "Confirming a reservation creates its guest profile (or reuses one already matching that phone number) and its folio, ready for payment — no room charge is posted yet at this point. That happens night by night: the first night at check-in, then one more each night through Night Audit.",
      "Extending a stay checks real-time capacity for the extra nights before allowing it — it can be refused if another booking already has those rooms for that window.",
      "Room Assignments here supports multiple room numbers per reservation for multi-room bookings.",
      "Early Checkout is for ending an active stay ahead of schedule — it releases the room immediately and asks for confirmation first since it can't be undone.",
      "\"Special Requests\" here is a single field for this one stay (e.g. a note the guest gave at booking) — it's different from the Notes list on In-House, which supports multiple independent notes.",
      "A \"Blacklisted\" tag shows next to the guest's name if their profile is flagged — for now this is informational only (see Guests below); it doesn't block or warn on booking yet.",
    ],
  },
  {
    id: "guests",
    icon: IoPeopleOutline,
    label: "Guests",
    summary: "The guest profile directory — contact details plus lifetime stay history.",
    workflow: [
      "A profile is created automatically the first time a reservation under that phone number is confirmed — there's no separate \"add guest\" step.",
      "Total Stays and Total Revenue update automatically on every completed checkout; they're a read-only running history, not something to edit by hand.",
      "Notes here are a list of independent, addable/deletable items about the guest as a person — e.g. \"VIP\", \"Fish allergy\" — and follow the guest across every stay. Compare to In-House's Notes, which are about one specific stay only.",
      "Blacklisting a guest only sets a flag and shows a tag on this page — it currently has no effect on booking, check-in, or anywhere else.",
    ],
  },
  {
    id: "folios",
    icon: IoReceiptOutline,
    label: "Guest Folios",
    summary: "The financial ledger for each reservation — charges, tax, discounts, payments, refunds, reservation credit, and the running balance.",
    workflow: [
      "Tabs: All (every folio), Outstanding Balance (open folios with money still owed), Overdue (guests who are supposed to have checked out by now but still owe money — checks the scheduled checkout date, not whether they've actually left).",
      "Overdue only starts counting from noon on the scheduled checkout date — matches the hotel's actual noon checkout time, same rule Alerts uses.",
      "Guest Ledger vs. City Ledger (standard hotel accounting terms, shown as the Guest Status column on Outstanding Balance/Overdue): a balance owed by a guest who's still registered/in-house is Guest Ledger — a front-desk matter. Once that same guest has actually checked out and still owes, it becomes City Ledger — a receivable to collect, not something front desk can resolve just by finishing checkout.",
      "Checkout is never blocked by an outstanding balance — the room still has to be released for housekeeping/resale, and the folio simply stays open as a City Ledger receivable instead of auto-closing. The checkout screen shows a clear warning with the exact amount before staff confirm, but it's a warning, not a hard stop — standard PMS behavior.",
      "Charge Type (top of Add-a-Charge) determines the rest of the form — Room Charge, Laundry Charge, Penalty, Adjustment, or Correction. Food and drink charges are posted from Guest Sales instead, not from here.",
      "Discount on a charge is always a percentage. Tax can be switched between a fixed amount or a percentage — both convert to a real amount before saving.",
      "For a discount of a specific amount rather than a percentage, post a charge with a negative amount instead (e.g. -2,000) — it reduces the balance by exactly that much.",
      "Recording a payment, refund, or reservation credit shows a popup with the reference number large and in monospace — write it down or read it to the guest before dismissing it (it won't auto-hide).",
      "Receipt number is always optional — the system-generated payment/credit reference works as the record on its own if there's no physical receipt book entry.",
      "A folio only auto-closes once its balance reaches zero AND the guest has actually checked out — an open balance keeps it open as a receivable even after checkout.",
    ],
  },
  {
    id: "non-guest-sales",
    icon: IoCartOutline,
    label: "Non-Guest Sales",
    waitstaffVisible: true,
    summary: "Record a food/drink order for someone who isn't a hotel guest — payment can be recorded now or later, and it closes out automatically once the balance is settled.",
    workflow: [
      "Guest name is optional — a non-guest customer shouldn't have to give their name just to order food. Opening a sale and posting its first charge happen together in one step: pick one or more items (Food or Drink, from the same menu Guest Folios' charge picker uses) and a quantity each, then Open Folio. More charges can be added afterward from that sale's own page, as long as it's still open.",
      "Bill No (from the F&B docket/bill book) is required for every food item — unlike a guest folio, where it's optional, since there guest name/room already identify the folio. Drinks don't have one, same as on a guest folio. That's how a nameless sale is found again later, via the list's search.",
      "Guest Name/Phone can be added or changed at any time, open or closed — worth doing once it's clear it needs to be traced back to a person: an unpaid balance, or a credit from an overpayment.",
      "Available to waitrons, receptionists, and managers — not accountants.",
      "Payment is a separate step from opening the sale — Record Payment supports splitting across methods, same as a guest folio. It auto-closes the instant its balance reaches zero; there's no separate \"close\" step for the normal case.",
      "If a guest overpays and there's no change to give back, enter the full amount received anyway — the excess is kept on file automatically as credit, surfaced as Credit on File (with an Apply Credit button) the next time a sale is opened with that same guest name. Matching is by name, so a credit is only findable this way once a name has been added.",
      "Payment Status on the list is Owing (balance still due), Paid (settled by a fresh payment), or PB — Paid Before (settled at least partly by applying an existing credit). In practice PB/Owing are rare here — a non-guest sale is almost always paid in full on the spot; Guest Folios (room-based stays) is where those statuses mostly come from.",
      "Shows up automatically in the Reports → Dashboard tab's Payments Received / Payments by Method totals, and in Food Sales / Drink Sales — there's no separate non-guest-sales report to check.",
    ],
  },
  {
    id: "check-ins",
    icon: IoLogInOutline,
    label: "Check-Ins",
    summary: "Expected Arrivals for a chosen date, plus a Walk-In flow for a guest with no existing reservation.",
    workflow: [
      "A reservation must already be Confirmed (paid) before it can be checked in — a Hold has to be confirmed first (do that from Reservations).",
      "Confirming check-in and assigning room number(s) happens together in one step — supports multiple rooms for a multi-room booking.",
      "Walk-In creates a brand-new reservation and checks it in immediately, for a guest who shows up without booking ahead.",
    ],
  },
  {
    id: "check-outs",
    icon: IoLogOutOutline,
    label: "Check-Outs",
    summary: "Expected departures for a chosen date.",
    workflow: [
      "Checking out marks the stay Completed, releases the room back to availability right away, and auto-closes the folio if the balance is already ₦0 — an outstanding balance keeps the folio open so it still shows up under Folios → Overdue.",
    ],
  },
  {
    id: "in-house",
    icon: IoHomeOutline,
    label: "In-House",
    summary: "Everyone currently checked in, live — room number(s), status tags, checked-in date, and expected checkout.",
    workflow: [
      "An \"Overdue\" flag appears once a guest is past noon on their scheduled checkout date — the same cutoff rule used everywhere else in the app.",
      "Room assignments can be changed here without going back to Reservations.",
      "Notes here are a list of independent, addable/deletable items about this one stay (e.g. \"Arriving late\") — separate from the Reservations page's single \"Special Requests\" field and from the guest's own Notes list.",
    ],
  },
  {
    id: "reports",
    icon: IoBarChartOutline,
    label: "Reports",
    alwaysVisible: true,
    summary: "Seven report types, each on its own tab, all exportable to Excel.",
    workflow: [
      "Dashboard — revenue, occupancy, and stay totals for a custom date range (the original report; also emailable).",
      "Manifest — every arrival/departure in a date range with room price, receipt numbers, and reservation credit amounts — the digitized version of the old paper manifest. Its Notes section combines both Special Requests and each stay's own Notes list. Uses each reservation's *scheduled* check_in/check_out — the operational \"who's due in/out\" view, not the actual-occupancy one below.",
      "Analysis — every payment received in a date range, broken down by room, receipt number, and method, with a grand total.",
      "PMS Report — a shift-handoff snapshot. Evening = tonight's house (arrivals/departures so far vs. still expected, plus current room status) for wrapping up before Night Audit. Morning = the previous night's audit result plus today's expected activity, for the incoming shift.",
      "Accommodation — one row per room actually in use on a single given date (actual occupancy/billing, not scheduled dates — this is the deliberate difference from Manifest), with room price, breakfast price, payment mode, payment status (Paid / Owing / PB — see Guest Folios for what PB means), amount paid, shift, and a remark (Checked In / Checked Out / In House).",
      "Food Sales — every food order for a given date, one row per order, whether charged to a room's folio or a non-guest sale. Status is Owing / Paid / PB — Paid Before (same three-way split as Accommodation's Payment Status, since a payment settles a whole folio rather than one specific charge) or Complementary for a $0 charge. A separate Payment Method column shows how it was actually paid, when that's known.",
      "Drink Sales — same shape as Food Sales (one row per order, with Customer/Bill No/Status/Payment Method), just filtered to drinks instead of food. No longer aggregated by item.",
      "Food Sales and Drink Sales both show a Total, a payment-method breakdown (grouped by how each non-guest/non-guest-folio charge was actually paid — a charge still owing isn't in it, since nothing's been paid yet; every folio-billed charge is grouped into one \"Charged to Room\" figure instead, since there's no way to know which later payment actually covered which specific charge), and a By Staff breakdown of who posted each charge.",
      "Remarks (whatever was typed into the Notes field when the charge was posted — see Guest Folios) shows up here too. A Non-Guest Sales charge never has one of its own (there's no per-charge notes field there) — legacy and Guest Folios charges are the only sources for this column.",
      "An accountant session doesn't see the Shift selector or the Send to Accountant button on any tab here — those are front-office-only, for handing a report off to the accountant. An accountant runs these same reports for their own audits, not to send them to themselves.",
    ],
  },
  {
    id: "night-audit",
    icon: IoMoonOutline,
    label: "Night Audit",
    summary: "The once-daily close-out that posts each in-house guest's room charge for the night.",
    workflow: [
      "Can only be run once per branch per date — running it again for a date already audited is blocked outright.",
      "Automatically skips a reservation with no open folio, or one that already has a room charge posted for that date (safe to re-check without double-charging).",
      "Automatically excludes any of a reservation's rooms currently marked Complementary from the charge — a fully-complementary stay is skipped entirely for that night.",
    ],
  },
  {
    id: "alerts",
    icon: IoNotificationsOutline,
    label: "Alerts",
    summary: "Everything that needs front-desk attention, in one place: Missed Check-Ins, Unconfirmed holds, Overdue Checkouts, and Overdue Balances.",
    workflow: [
      "Missed Check-Ins and Overdue Checkouts only fire from noon on the scheduled date onward — a same-day reservation isn't \"missed\"/\"overdue\" until the hotel's actual noon check-in/checkout time has passed.",
      "Unconfirmed holds show a live countdown to when they'll auto-cancel if nobody confirms payment in time.",
      "The sidebar's alert badge count matches this page's total, and both update live over the websocket connection.",
    ],
  },
  {
    id: "audit-trail",
    icon: IoDocumentTextOutline,
    label: "Audit Trail",
    managerOnly: true,
    alwaysVisible: true,
    summary: "A record of every action taken by staff on this branch's account — who did what, and when. Manager, accountant, and developer visibility only — always read-only, no actions taken from here.",
    workflow: [
      "Filter by Staff, Role, or Action to narrow the list — all three can be combined at once.",
      "Some actions link straight to the specific record affected (e.g. \"View folio →\") — for a payment, this opens the folio and highlights that exact payment line.",
      "Not every action is logged with a full readable sentence yet — anything not listed below still shows up, just as a plain \"METHOD /route\" entry.",
      "Payment recorded / Payment refunded — money paid or refunded directly against an existing folio.",
      "Charge posted — a new charge (room service, damages, etc.) added to a folio. This is the opposite direction from a payment: it's what the guest now owes, not what they've paid.",
      "Reservation (Credit) recorded — money collected in advance before a folio exists yet (at the hold/booking stage). Shown as \"Reservation (Credit)\" throughout; references still read DEP-XXXXXX.",
      "Reservation (Credit) applied — credit converted into a real payment once the guest's folio exists (at confirmation, check-in, or automatically when a later night's charge posts). No new money changes hands — it's reclassifying money already collected.",
      "Reservation (Credit) refunded — credit given back to the guest instead of being applied. Only the portion not already spent on a charge can be refunded.",
      "Room price updated / Room status changed — a room type's price, or a specific room's status (Out of Order, Complementary, Reserved, Available), was changed.",
      "Reservation confirmed / cancelled / extended — the reservation lifecycle actions taken from the Reservations or Bookings pages.",
      "Check-in / Check-out — a guest was checked into or out of their room.",
      "Folio closed — a folio was closed out once fully settled.",
    ],
  },
  {
    id: "accountant-reports",
    icon: IoBarChartOutline,
    label: "Accountant Reports",
    accountantOnly: true,
    summary: "Every report the front office has sent, grouped by the day it was sent — click one to see exactly what was sent.",
    workflow: [
      "What you see is a frozen snapshot from the moment it was sent — if the underlying reservation or folio changes afterward, this view doesn't change with it.",
      "Grouped by the calendar day a report was actually sent, not by whatever date or date-range the report itself covers.",
      "Click a report to expand it in place, with its own Export to Excel button.",
      "\"Shift\" shows which receptionist was on duty when the report was generated — not necessarily whoever actually clicked Send.",
    ],
  },
  {
    id: "menu",
    icon: IoRestaurantOutline,
    label: "Menu",
    managerOnly: true,
    summary: "The food and drink item list — name and price — that Guest Sales and Non-Guest Sales both pull from.",
    workflow: [
      "Manager-only, same tier as room pricing.",
      "Setting an item Out of Stock (instead of deleting it) keeps it out of future pickers while preserving any past folio charge or non-guest sale that already referenced it.",
      "A price change here only affects new charges/sales going forward — a historical charge or sale keeps whatever price was in effect when it was made.",
    ],
  },
  {
    id: "account",
    icon: IoKeyOutline,
    label: "Account",
    alwaysVisible: true,
    summary: "Change your own login password.",
    workflow: [
      "A manager can also reset a receptionist's password here without needing to know their current one — just the manager's own password to confirm.",
    ],
  },
];

export default function AdminHelpPage() {
  const manager = isManager();
  const role = getStoredStaffRole();
  const isWaitstaffRole = role === "waitron";
  // Same shape as visibleAdminNavItems() (adminNavItems.js) — an accountant
  // session sees only accountantOnly + alwaysVisible sections, and a
  // waitron session sees only alwaysVisible + waitstaffVisible ones,
  // since none of the other front-desk pages apply to either.
  const visibleSections = SECTIONS.filter((s) => {
    if (s.accountantOnly) return isAccountant();
    if (role === "accountant") return s.alwaysVisible === true;
    if (isWaitstaffRole) return s.alwaysVisible === true || s.waitstaffVisible === true;
    if (s.managerOnly) return manager;
    return true;
  });

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div data-component="AdminHelp" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoHelpCircleOutline}>Help &amp; Workflow Guide</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76 -mt-4">
        What each page does and how it fits into the daily workflow. Jump to a section:
      </p>

      <div className="flex gap-3 text-xl flex-wrap">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold cursor-pointer transition-all bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"
          >
            <s.icon size={18} className="shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="w-full flex flex-col gap-8">
        {visibleSections.map((s) => (
          <section key={s.id} id={s.id} className="w-full flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-4">
              <span className="w-[3.6rem] h-[3.6rem] rounded-xl bg-[color:var(--emphasis)]/10 text-[color:var(--emphasis)] flex items-center justify-center shrink-0">
                <s.icon size={20} />
              </span>
              <h2 className="text-3xl font-bold text-[color:var(--black)]">{s.label}</h2>
            </div>
            <div className="bg-white p-8 rounded-xl border border-[color:var(--text-color)]/10 flex flex-col gap-4 w-full">
              <p className="text-2xl text-[color:var(--text-color)]/84">{s.summary}</p>
              <ul className="flex flex-col gap-3 list-disc pl-6">
                {s.workflow.map((line, i) => (
                  <li key={i} className="text-xl leading-relaxed text-[color:var(--text-color)]/76">{line}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
