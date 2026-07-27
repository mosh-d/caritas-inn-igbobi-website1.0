import Modal from "./Modal";
import { btn } from "./ui";
import CopyIconButton from "./CopyIconButton";

// Shown right after any payment/refund/deposit is recorded — the reference
// number is the thing the guest takes down or the receptionist writes on a
// paper receipt, so it stays on screen (manual dismiss, not an auto-fading
// toast) with a copy button, long enough to actually be copied down.
export default function TransactionReceiptModal({ title, reference, amount, onClose }) {
  return (
    <Modal
      onClose={onClose}
      title={title}
      size="sm"
      footer={<button onClick={onClose} className={`${btn.primary} w-full`}>Done</button>}
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="text-xl font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">
          Reference / Payment ID
        </p>
        <p className="text-4xl font-bold font-mono tracking-wide text-[color:var(--black)] break-all">{reference}</p>
        {amount != null && <p className="text-2xl text-[color:var(--text-color)]/76">{amount}</p>}
        <CopyIconButton value={reference} label="Copy Reference" />
        <p className="text-lg text-[color:var(--text-color)]/60">
          Write this down or have the guest take note of it for their records.
        </p>
      </div>
    </Modal>
  );
}
