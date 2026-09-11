const STYLES = {
  // Reservation statuses
  hold: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  // Folio statuses
  open: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
  // Deposit statuses
  applied: "bg-green-100 text-green-700",
  refunded: "bg-red-100 text-red-700",
  // Room assignment statuses
  occupied: "bg-green-100 text-green-700",
  released: "bg-gray-100 text-gray-600",
  // Staff roles
  manager: "bg-purple-100 text-purple-700",
  receptionist: "bg-blue-100 text-blue-700",
  developer: "bg-slate-800 text-white",
  // Missing before now — never actually rendered anywhere until accountant
  // actions started appearing in the Audit Trail (they now can: Reports/
  // Audit Trail access), which is when the plain-gray fallback would have
  // first been visible. Found while adding waitron below.
  accountant: "bg-teal-100 text-teal-700",
  waitron: "bg-amber-100 text-amber-700",
  // Store keeper actions reach the Audit Trail the same way a waitron's do
  // (menu item create/update/delete), so this needs a colour for the same
  // reason accountant did — otherwise it falls back to plain gray.
  storekeeper: "bg-orange-100 text-orange-700",
  // Payment status (Accommodation Report)
  paid: "bg-green-100 text-green-700",
  owing: "bg-red-100 text-red-700",
  // Settled by drawing on an existing credit (an applied deposit from a
  // previous "Reservation" advance payment) rather than a fresh payment.
  pb: "bg-blue-100 text-blue-700",
  // Food/Drink Sales reports — a zero-amount folio charge (staff already
  // can zero out the auto-filled Amount when posting). Purple to match the
  // app's one existing "given away, no charge" convention (complementary
  // rooms).
  complementary: "bg-purple-100 text-purple-700",
  // A room set aside for a manager (Non-Revenue Rooms on the Manifest). Same
  // colour RoomStatusTag gives a reserved room everywhere else.
  reserved: "bg-indigo-100 text-indigo-700",
  // Manifest guest status. "Stay over" (a guest already in house the day
  // before) replaced "in house" on 2026-09-10.
  "checked in": "bg-blue-100 text-blue-700",
  "checked out": "bg-gray-100 text-gray-600",
  "stay over": "bg-green-100 text-green-700",
  // A same-day stay: the one departure the Manifest still lists, since its
  // room was sold that day.
  "checked in & out": "bg-indigo-100 text-indigo-700",
};

export default function StatusBadge({ status, className = "" }) {
  if (!status) return null;
  const style = STYLES[String(status).toLowerCase()] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-3 pt-2 pb-2 rounded-full text-lg font-bold capitalize leading-tight whitespace-nowrap ${style} ${className}`}>
      {status}
    </span>
  );
}
