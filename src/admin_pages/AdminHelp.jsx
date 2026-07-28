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
  IoKeyOutline,
} from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";

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
      "Each physical room has one manual status: Available, Out of Order, Complementary, or Reserved (set aside for a branch/zonal manager). Out of Order and Reserved both remove the room from every availability count and picker immediately; Complementary stays bookable and only affects billing.",
      "Complementary only zeroes the room-charge on a guest's folio once ALL of that reservation's assigned rooms are marked complementary — a partially-complementary multi-room stay keeps its manual flag but doesn't change the bill yet.",
      "A room can also show \"Occupied\" — a real guest is assigned there right now, computed live, never set manually.",
      "The Physical Rooms list inside a room type's detail view is collapsible — useful once a room type has a lot of numbered rooms.",
      "Reducing a room type's physical room count can delete rows — you'll be asked to confirm first, and it's refused outright if any of the rooms that would be removed are currently occupied or have a future booking.",
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
      "Confirming a reservation creates its guest profile (or reuses one already matching that email) and its folio — this is also when the accommodation charge is first posted.",
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
      "A profile is created automatically the first time a reservation under that email is confirmed — there's no separate \"add guest\" step.",
      "Total Stays and Total Revenue update automatically on every completed checkout; they're a read-only running history, not something to edit by hand.",
      "Notes here are a list of independent, addable/deletable items about the guest as a person — e.g. \"VIP\", \"Fish allergy\" — and follow the guest across every stay. Compare to In-House's Notes, which are about one specific stay only.",
      "Blacklisting a guest only sets a flag and shows a tag on this page — it currently has no effect on booking, check-in, or anywhere else.",
    ],
  },
  {
    id: "folios",
    icon: IoReceiptOutline,
    label: "Folios",
    summary: "The financial ledger for each reservation — charges, tax, discounts, payments, refunds, deposits, and the running balance.",
    workflow: [
      "Tabs: All (every folio), Outstanding Balance (open folios with money still owed), Overdue (guests who are supposed to have checked out by now but still owe money — checks the scheduled checkout date, not whether they've actually left).",
      "Overdue only starts counting from noon on the scheduled checkout date — matches the hotel's actual noon checkout time, same rule Alerts uses.",
      "Discount on a charge is always a percentage. Tax can be switched between a fixed amount or a percentage — both convert to a real amount before saving.",
      "Recording a payment, refund, or deposit shows a popup with the reference number large and in monospace — write it down or read it to the guest before dismissing it (it won't auto-hide).",
      "Receipt number is always optional — the system-generated payment/deposit reference works as the record on its own if there's no physical receipt book entry.",
      "A folio only auto-closes once its balance reaches zero AND the guest has actually checked out — an open balance keeps it open as a receivable even after checkout.",
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
    summary: "Four report types, each on its own tab, all exportable to Excel.",
    workflow: [
      "Dashboard — revenue, occupancy, and stay totals for a custom date range (the original report; also emailable).",
      "Manifest — every arrival/departure in a date range with room price, receipt numbers, and deposit amounts — the digitized version of the old paper manifest. Its Notes section combines both Special Requests and each stay's own Notes list.",
      "Analysis — every payment received in a date range, broken down by room, receipt number, and method, with a grand total.",
      "PMS Report — a shift-handoff snapshot. Evening = tonight's house (arrivals/departures so far vs. still expected, plus current room status) for wrapping up before Night Audit. Morning = the previous night's audit result plus today's expected activity, for the incoming shift.",
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
    id: "account",
    icon: IoKeyOutline,
    label: "Account",
    summary: "Change your own login password.",
    workflow: [
      "A manager can also reset a receptionist's password here without needing to know their current one — just the manager's own password to confirm.",
    ],
  },
];

export default function AdminHelpPage() {
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
        {SECTIONS.map((s) => (
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
        {SECTIONS.map((s) => (
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
