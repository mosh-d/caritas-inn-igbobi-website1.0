import { IoLockClosed } from "react-icons/io5";

// Marks a control everyone on the page can see but only a manager can use
// (owner, 2026-09-28) - room types, capacity and prices on Rooms, a guest's
// blacklist standing on Guests. It sits beside the control or at the right
// of its section heading, so the reason it is locked is on screen before
// anyone tries it. The server refuses the same actions for every other role;
// this only says so up front.
export default function ManagerOnlyTag({ className = "" }) {
  return (
    <span
      title="Only a manager can change this"
      className={`inline-flex items-center gap-1.5 text-sm font-bold normal-case tracking-normal px-3 py-1 rounded-full whitespace-nowrap bg-amber-50 text-amber-800 ring-1 ring-amber-200 ${className}`}
    >
      <IoLockClosed aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      Manager only access
    </span>
  );
}
