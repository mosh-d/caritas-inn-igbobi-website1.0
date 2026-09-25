import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import StatusBadge from "./StatusBadge";
import PaymentSplitRows from "./PaymentSplitRows";
import AutoGrowTextarea from "./AutoGrowTextarea";
import { chargeTypeLabel, settlementByCharge } from "./folioCharges";
import { formatDateTime } from "../../utils/report-format";
import { btn, field } from "./ui";

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// Compact — a balance summary + payment form, not the full Folio Detail
// experience (no tax/discount, refunds, or closing here; that stays
// Folios-page-only). A modal rather than an inline card: it used to render
// below the guest-folio list, which meant clicking "View / Pay" produced no
// visible feedback above the fold — easy to mistake for the button not
// working at all. Every other "View" action on a folio list in this app
// (Non-Guest Sales, Folios) already opens a modal — this now matches that.
// Shared once Laundry Sales grew its own guest section (2026-09-24): the
// same guest folio, the same balance, the same payment - two copies would
// have been two places for a money-handling panel to drift apart. The state
// it renders still belongs to whichever page opened it; this only draws it.
export default function FolioBalanceModal({ meta, folioDetail, loading, error, paymentForm, setPaymentForm, hasValidPaymentSplits, recordingPayment, paymentError, onRecordPayment, onClose }) {
  const balance = folioDetail ? Number(folioDetail.balance) : 0;
  const isOutstanding = folioDetail && balance > 0;
  const isCredit = folioDetail && balance < 0;
  // What the money received has settled, charge by charge (display only -
  // see settlementByCharge).
  const chargeSettlement = settlementByCharge(
    folioDetail?.items || [],
    folioDetail?.total_received ?? folioDetail?.amount_paid ?? 0,
  );

  return (
    <Modal
      onClose={onClose}
      title={folioDetail?.folio_number || "Folio"}
      subtitle={meta.roomNumber ? `Room ${meta.roomNumber} — ${meta.guestName}` : meta.guestName}
      size="lg"
      loading={loading}
    >
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : error ? (
        <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{error}</p>
      ) : folioDetail && (
        <>
          <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
            <FolioStat label="Balance" value={isOutstanding ? money(folioDetail.balance) : isCredit ? `Credit: ${money(Math.abs(balance))}` : "Settled"} tone={isOutstanding ? "danger" : isCredit ? "success" : "default"} />
            <FolioStat label="Total Charged" value={money(folioDetail.total_amount)} />
            <FolioStat label="Total Paid" value={money(folioDetail.total_received ?? folioDetail.amount_paid)} />
          </div>

          {/* The full charge list, same treatment as AdminNonGuestSales'
              Charges section. It was previously the three most recent lines
              only, which hid most of a stay's food and drink and left the
              visible rows unable to account for the Total Charged above. */}
          <div className="flex flex-col gap-3 pt-4 border-t border-[color:var(--text-color)]/10">
            <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Charges</p>
            {!folioDetail.items?.length ? (
              <p className="text-xl text-[color:var(--text-color)]/76">No charges yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {folioDetail.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl">
                    <span className="capitalize min-w-0 break-words">
                      {/* Unlike a non-guest folio line, an F&B charge here
                          stores its quantity separately and prices the row at
                          price x quantity — so "Jollof Rice - N4,000" reads
                          as a single N4,000 portion unless the count is shown. */}
                      {Number(item.quantity) > 1 && <span className="font-semibold">{item.quantity} &times; </span>}
                      {item.description}
                      {chargeTypeLabel(item) && (
                        <span className="text-[color:var(--text-color)]/68 ml-2">({chargeTypeLabel(item)})</span>
                      )}
                      {item.bill_no && <span className="text-[color:var(--text-color)]/68 ml-2">&middot; Bill No {item.bill_no}</span>}
                      {/* When it was rung up - also what makes the
                          settlement badge beside it read sensibly, since
                          money comes off a bill oldest charge first. */}
                      <span className="text-[color:var(--text-color)]/68 ml-2">&middot; {formatDateTime(item.created_at || item.date)}</span>
                      {Number(item.service_charge) > 0 && <span className="text-[color:var(--text-color)]/68 ml-2">&middot; Service Charge {money(item.service_charge)}</span>}
                      {(item.is_manager || item.is_complementary) && (
                        <span className="ml-2"><StatusBadge status={item.is_manager ? "manager" : "complementary"} /></span>
                      )}
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={chargeSettlement.get(item.id)} />
                      <span className="font-bold whitespace-nowrap">{money(Number(item.amount) + Number(item.service_charge))}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-[color:var(--text-color)]/10">
            <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Record Payment</p>
            {paymentError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{paymentError}</p>}
            <PaymentSplitRows splits={paymentForm.splits} setSplits={(splits) => setPaymentForm({ ...paymentForm, splits })} />
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <div className="flex flex-col gap-2">
                <label className={field.label}>Receipt Number (optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to have the system generate one"
                  value={paymentForm.receipt_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                  className={field.input}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={field.label}>Notes (optional)</label>
                <AutoGrowTextarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className={field.textarea} />
              </div>
            </div>
            <button
              onClick={onRecordPayment}
              disabled={recordingPayment || !hasValidPaymentSplits}
              className={`${btn.primary} self-start`}
            >
              {recordingPayment ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function FolioStat({ label, value, tone }) {
  const valueColor = tone === "danger" ? "text-red-600" : tone === "success" ? "text-green-700" : "text-[color:var(--black)]";
  return (
    <div className="bg-[color:var(--text-color)]/5 border-1 border-gray-200 rounded-lg px-5 py-4">
      <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor} truncate`}>{value}</p>
    </div>
  );
}
