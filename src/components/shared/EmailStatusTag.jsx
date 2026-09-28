// Whether the booking confirmation reached the guest, as Resend reported it
// (owner, 2026-09-28). Shown only when it didn't: the front desk then asks
// for a correct address at check-in. Nothing for "sent" or "delivered".
// "Unreachable", not "bounced": the tag is read by the front desk, not by
// anyone who knows email jargon (owner, 2026-09-28).
const EMAIL_PROBLEMS = {
  bounced: { label: "Email unreachable", className: "bg-red-100 text-red-700" },
  complained: { label: "Email marked spam", className: "bg-orange-100 text-orange-700" },
};

export default function EmailStatusTag({ status, className = "" }) {
  const problem = EMAIL_PROBLEMS[status];
  if (!problem) return null;
  return (
    <span
      title="The booking confirmation couldn't be delivered - ask the guest for a correct email"
      className={`text-sm font-bold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${problem.className} ${className}`}
    >
      {problem.label}
    </span>
  );
}
