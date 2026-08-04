import Modal from "./Modal";
import { btn } from "./ui";
import CopyIconButton from "./CopyIconButton";

// Shown right after any payment/refund/deposit is recorded — the reference
// number is the thing the guest takes down or the receptionist writes on a
// paper receipt, so it stays on screen (manual dismiss, not an auto-fading
// toast) with a copy button, long enough to actually be copied down.
//
// A split payment/deposit (one action, several methods) produces more than
// one reference — pass `items` (an array of { reference, amount, method })
// instead of the single `reference`/`amount` pair to render one block per
// split, each with its own copy button.
export default function TransactionReceiptModal({ title, reference, amount, items, onClose }) {
  const lines = items && items.length > 0 ? items : [{ reference, amount, method: null }];

  return (
    <Modal
      onClose={onClose}
      title={title}
      size="sm"
      footer={<button onClick={onClose} className={`${btn.primary} w-full`}>Done</button>}
    >
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        {lines.map((line, i) => (
          <div key={line.reference || i} className="flex flex-col items-center gap-3 w-full">
            <p className="text-xl font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">
              {lines.length > 1 ? `Reference / Payment ID (${line.method || `#${i + 1}`})` : "Reference / Payment ID"}
            </p>
            <p className="text-4xl font-bold font-mono tracking-wide text-[color:var(--black)] break-all">{line.reference}</p>
            {line.amount != null && <p className="text-2xl text-[color:var(--text-color)]/76">{line.amount}</p>}
            <CopyIconButton value={line.reference} label="Copy Reference" />
          </div>
        ))}
        <p className="text-lg text-[color:var(--text-color)]/60">
          Write this down or have the guest take note of it for their records.
        </p>
      </div>
    </Modal>
  );
}
