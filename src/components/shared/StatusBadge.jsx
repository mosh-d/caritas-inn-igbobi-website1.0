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
