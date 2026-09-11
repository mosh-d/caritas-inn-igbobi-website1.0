import { useState, useEffect } from "react";
import { btn, field } from "./ui";
import LoadingSpinner from "./LoadingSpinner";
import { fetchStaffAccounts } from "../../utils/staff-accounts-api";
import { selectCurrentShift } from "../../utils/shifts-api";

// The 6am prompt: which receptionist this business day belongs to.
//
// Deliberately not the shared Modal — that one closes on ESC, on a backdrop
// click and from its own X, and any of those would defeat the lock. The front
// desk stays shut until the shift is recorded. onCancel is passed only when a
// manager opens this to correct an already-recorded shift, which is a
// different, non-blocking use.
export default function ShiftGate({ businessDate, currentName, onSelected, onCancel }) {
  const [staff, setStaff] = useState(null);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStaffAccounts("receptionist")
      .then((list) => setStaff(list || []))
      .catch(() => {
        setStaff([]);
        setError("Could not load the receptionist list. Refresh the page and try again.");
      });
  }, []);

  const submit = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      setError(null);
      onSelected(await selectCurrentShift(selected));
    } catch (err) {
      setError(err.response?.data?.message || "Could not record the shift. Try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Record the shift"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl font-primary p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-[color:var(--black)]">Whose shift is this?</h2>
          <p className="text-xl text-[color:var(--text-color)]/76">
            The business day{businessDate ? ` (${businessDate})` : ""} has started. Pick the receptionist on
            duty — your own name, or the colleague whose shift it is. The front desk stays locked until this is
            recorded, and the choice goes to the audit trail.
          </p>
          {currentName && (
            <p className="text-xl text-[color:var(--text-color)]/76">
              Recorded so far as <strong className="text-[color:var(--black)]">{currentName}</strong>.
            </p>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        {staff === null ? (
          <LoadingSpinner />
        ) : (
          <div className="flex flex-col gap-2">
            <label className={field.label}>Receptionist on duty</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className={field.select}>
              <option value="">Select a receptionist</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>{person.username}</option>
              ))}
            </select>
            {staff.length === 0 && !error && (
              <p className="text-lg text-[color:var(--text-color)]/60">
                No active receptionist accounts for this branch. A manager has to add one first.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button onClick={submit} disabled={!selected || saving} className={btn.primary}>
            {saving ? "Saving..." : "Start the shift"}
          </button>
          {onCancel && (
            <button onClick={onCancel} disabled={saving} className={btn.secondary}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
