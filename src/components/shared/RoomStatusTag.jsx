// Single shared source for how each room status is labeled/colored, so the
// tag looks and reads identically everywhere it shows up (Rooms page, Room
// Chart, In-House, ...) instead of drifting between per-page copies.
export const ROOM_STATUS_META = {
  available: { label: "Vacant", className: "bg-green-100 text-green-700" },
  occupied: { label: "Occupied", className: "bg-blue-100 text-blue-700" },
  out_of_order: { label: "Out of Order", className: "bg-red-100 text-red-700" },
  complementary: { label: "Complementary", className: "bg-purple-100 text-purple-700" },
  manual_hold: { label: "Manual Hold", className: "bg-orange-100 text-orange-700" },
};

export default function RoomStatusTag({ status, className = "" }) {
  const meta = ROOM_STATUS_META[status];
  if (!meta) return null;
  return (
    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${meta.className} ${className}`}>
      {meta.label}
    </span>
  );
}
