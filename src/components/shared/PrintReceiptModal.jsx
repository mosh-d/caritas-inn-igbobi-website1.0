import Modal from "./Modal";
import { btn } from "./ui";
import { getStoredBranch, getStoredDisplayName } from "../../utils/auth";

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-US", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

// Shown the moment an order (guest or non-guest) is submitted — this is the
// system-printed receipt replacing the paper docket/bill book. `items` is
// [{ description, quantity, line_total }]; `who` is either
// { room_number, guest_name } for a guest folio or { guest_name } (possibly
// null — non-guest orders don't require a name) for a non-guest one. Branch
// and staff name are resolved from the logged-in session, not passed in.
//
// Print via window.print() with the page's own CSS scoped to #print-receipt
// (see print.css) — everything else on the page is hidden for the duration
// of the print, not swapped out into a separate window/tab.
export default function PrintReceiptModal({ billNo, who, items, serviceCharge, total, onClose }) {
  const branch = getStoredBranch();
  const staffName = getStoredDisplayName();
  const now = new Date();

  return (
    <Modal onClose={onClose} title="Receipt" size="sm" footer={
      <>
        <button onClick={onClose} className={btn.secondary}>Close</button>
        <button onClick={() => window.print()} className={btn.primary}>Print</button>
      </>
    }>
      <div id="print-receipt" className="flex flex-col gap-4 text-xl">
        <div className="text-center flex flex-col gap-1 pb-4 border-b border-dashed border-[color:var(--text-color)]/25">
          <p className="text-2xl font-bold text-[color:var(--black)]">{branch?.name || "Receipt"}</p>
          <p className="text-lg text-[color:var(--text-color)]/68">{formatDateTime(now)}</p>
          <p className="text-lg font-mono text-[color:var(--text-color)]/68">Bill No. {billNo}</p>
        </div>

        <div className="flex flex-col gap-1">
          {who?.room_number && (
            <p><span className="text-[color:var(--text-color)]/68">Room</span> {who.room_number}</p>
          )}
          <p><span className="text-[color:var(--text-color)]/68">Guest</span> {who?.guest_name || "Walk-in"}</p>
          {staffName && <p><span className="text-[color:var(--text-color)]/68">Served by</span> {staffName}</p>}
        </div>

        <table className="w-full text-lg border-t border-b border-dashed border-[color:var(--text-color)]/25 py-2">
          <thead>
            <tr className="text-left text-[color:var(--text-color)]/68">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 font-semibold text-right">Qty</th>
              <th className="py-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="py-1.5 capitalize">{item.description}</td>
                <td className="py-1.5 text-right">{item.quantity}</td>
                <td className="py-1.5 text-right">{money(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-1">
          {Number(serviceCharge) > 0 && (
            <div className="flex justify-between text-[color:var(--text-color)]/76">
              <span>Service Charge</span>
              <span>{money(serviceCharge)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-bold text-[color:var(--black)]">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <p className="text-center text-lg text-[color:var(--text-color)]/60 pt-2">Thank you.</p>
      </div>
    </Modal>
  );
}
