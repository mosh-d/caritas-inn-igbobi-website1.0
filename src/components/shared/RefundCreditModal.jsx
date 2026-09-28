import { useState } from "react";
import Modal from "./Modal";
import { btn, field } from "./ui";
import { money, formatPaymentMethod, PAYMENT_METHODS } from "../../utils/report-format";

// Paying a guest's credit back out - confirmed, and recorded with how the
// money left (2026-09-28). The payout method is what lets the payment
// reports take the refund off cash or transfer instead of a catch-all
// "Credit Refunds" line, so it has to be picked; there is no default to
// click past. Shared by Guest Folios and Reservations - Reservations used to
// pay a credit out on a single click, with no confirmation at all.
export default function RefundCreditModal({ credit, guestName, busy, onConfirm, onClose }) {
  const [method, setMethod] = useState("");
  const amount = Number(credit.amount || 0);
  const applied = Number(credit.amount_applied || 0);
  const available = credit.available ?? amount - applied;

  return (
    <Modal
      onClose={onClose}
      title={`Refund ${money(available)}?`}
      subtitle={`From ${credit.deposit_reference}${guestName ? ` — ${guestName}` : ""}`}
      size="sm"
      zIndex={1100}
      footer={
        <>
          <button onClick={onClose} disabled={busy} className={btn.secondary}>
            Back
          </button>
          <button onClick={() => onConfirm(method)} disabled={busy || !method} className={btn.dangerSolid}>
            {busy ? "Refunding..." : "Yes, Refund"}
          </button>
        </>
      }
    >
      <p className="text-xl text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
        This records {money(available)} as handed back to the guest. It can't be undone — only refund once the money has actually left the drawer.
      </p>
      {applied > 0 && (
        <p className="text-xl text-[color:var(--text-color)]/76">
          {money(applied)} of the original {money(amount)} has already gone toward a charge, so only the remaining {money(available)} is refundable.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <label className={field.label}>Paid out by *</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={busy} className={field.select}>
          <option value="">Select how the money left</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{formatPaymentMethod(m)}</option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
