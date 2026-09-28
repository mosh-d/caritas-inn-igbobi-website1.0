import { useState } from "react";
import { canRefundCredit, creditOwnerLabel, creditServiceLabel } from "./nonGuestCredits";
import { formatDateTime, formatPaymentMethod, money } from "../../utils/report-format";
import { btn, table } from "./ui";
import RefundCreditModal from "./RefundCreditModal";
import { getStoredStaffRole } from "../../utils/auth";
import Pagination from "./Pagination";
import usePagedRows from "../../utils/usePagedRows";
import { refundNonGuestCredit } from "../../utils/non-guest-folios-api";

// Money the hotel owes back, listed the same way money owed TO the hotel
// already is. Until now an overpayment on a walk-in bill went into a credit
// row that no screen showed, so nobody could tell it existed — the one place
// it could surface needed the sale to have been rung up under a name, and
// most aren't.
//
// A credit is spent against a particular bill, so it is applied from inside
// that folio (where the target is unambiguous), not from this list. What the
// list does offer is paying a credit back out (2026-09-28), each drawer its
// own: the F&B floor refunds F&B credits, the front desk laundry ones (see
// canRefundCredit). onRefunded reloads the page's credits afterwards.
export default function NonGuestCreditsPanel({ credits = [], loading = false, onRefunded }) {
  const pending = credits.filter((c) => c.status === "pending");
  const total = pending.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const role = getStoredStaffRole();
  const refundable = pending.some((c) => canRefundCredit(c, role));
  const pendingPage = usePagedRows(pending);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [message, setMessage] = useState(null);

  const handleRefund = async (refundMethod) => {
    const credit = refundTarget;
    try {
      setRefunding(true);
      setMessage(null);
      await refundNonGuestCredit(credit.id, refundMethod);
      setRefundTarget(null);
      setMessage({ ok: true, text: `Refunded ${money(credit.amount)} (${credit.credit_reference}) by ${formatPaymentMethod(refundMethod)}.` });
      await onRefunded?.();
    } catch (err) {
      setRefundTarget(null);
      setMessage({ ok: false, text: err.response?.data?.message || "Failed to refund the credit." });
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h3 className="text-3xl font-bold text-[color:var(--black)]">Unclaimed Credit</h3>
        {pending.length > 0 && (
          <span className="text-xl font-bold text-blue-700">{money(total)} on file</span>
        )}
      </div>
      <p className="text-lg text-[color:var(--text-color)]/68">
        Overpayments kept on file. Open the bill you want it spent on and apply it there — a credit
        from an overpayment can always be applied back to the bill it came off.
      </p>
      {message && (
        <p className={`text-xl rounded-lg px-4 py-3 border ${message.ok ? "text-green-700 bg-green-50 border-green-200" : "text-red-600 bg-red-50 border-red-200"}`}>
          {message.text}
        </p>
      )}
      {loading ? null : pending.length === 0 ? (
        <p className="text-xl text-[color:var(--text-color)]/68">No unclaimed credit right now.</p>
      ) : (
        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={`${table.th} ${table.stickyTh}`}>Customer</th>
                  <th className={table.th}>From</th>
                  <th className={table.th}>Sold As</th>
                  <th className={table.th}>Date &amp; Time</th>
                  <th className={table.th}>Amount</th>
                  <th className={table.th}>Reference</th>
                  {refundable && <th className={table.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pendingPage.rows.map((c) => (
                  <tr key={c.id} className={table.row}>
                    <td className={`${table.td} ${table.stickyTd}`}>{creditOwnerLabel(c)}</td>
                    <td className={table.td}>{c.source_folio?.folio_number || "—"}</td>
                    <td className={table.td}>{creditServiceLabel(c)}</td>
                    <td className={`${table.td} whitespace-nowrap`}>{formatDateTime(c.created_at)}</td>
                    <td className={`${table.td} font-bold text-blue-700`}>{money(c.amount)}</td>
                    <td className={`${table.td} font-mono text-base`}>{c.credit_reference}</td>
                    {refundable && (
                      <td className={table.td}>
                        {canRefundCredit(c, role) && (
                          <button onClick={() => setRefundTarget(c)} disabled={refunding} className={btn.rowDanger}>
                            Refund
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={pendingPage.page} totalPages={pendingPage.totalPages} onPage={pendingPage.setPage} className="mt-0" />
      {refundTarget && (
        <RefundCreditModal
          credit={refundTarget}
          reference={refundTarget.credit_reference}
          guestName={creditOwnerLabel(refundTarget)}
          busy={refunding}
          onConfirm={handleRefund}
          onClose={() => setRefundTarget(null)}
        />
      )}
    </div>
  );
}
