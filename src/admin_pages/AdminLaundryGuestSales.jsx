import { useState, useEffect } from "react";
import { IoShirtOutline } from "react-icons/io5";
import PageOrSection from "../components/shared/PageOrSection";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import StatusBadge from "../components/shared/StatusBadge";
import PrintReceiptModal from "../components/shared/PrintReceiptModal";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import FolioBalanceModal from "../components/shared/FolioBalanceModal";
import { LAUNDRY_SERVICE_TYPES } from "../components/shared/laundryServices";
import { btn, field, table } from "../components/shared/ui";
import { formatDateTime } from "../utils/report-format";
import { getStoredStaffRole } from "../utils/auth";
import { fetchLaundryItems } from "../utils/menu-api";
import { fetchInHouse } from "../utils/front-office-api";
import { addFolioItemsBatch, fetchFolioById, recordPayment } from "../utils/folios-api";

const emptyRow = { reference_id: "", laundry_service_type: "wash_and_iron", quantity: "1" };
const emptyOrder = { reservation_id: "", bill_no: "", rows: [{ ...emptyRow }] };
const emptyPaymentForm = { splits: [{ amount: "", payment_method: "transfer" }], receipt_number: "", notes: "" };

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

/**
 * An in-house guest's laundry, posted to their own room folio.
 *
 * The walk-in half of this page opens a non-guest folio; a guest already in
 * the house has a folio of their own, so their laundry belongs on it and is
 * settled with the rest of the stay at check-out. Until now the only way to
 * record it was the Folios page's generic "Add a Charge" form, which meant
 * finding the folio first and typing the price by hand — off the same
 * catalogue the walk-in side prices automatically.
 *
 * Deliberately in-house only, unlike Guest Sales' second "checked-out
 * (owing)" tab: laundry is handed back to someone who is still in the
 * house. A departed guest's laundry is a walk-in sale.
 */
export default function AdminLaundryGuestSales({ asSection = false, hideTitle = false }) {
  // Laundry is front-desk work (owner's call, 2026-09-14) — the server
  // refuses a waitron's laundry charge, and this keeps the form off their
  // screen rather than letting them fill it in and be refused on submit.
  const canAccess = ["receptionist", "manager", "developer"].includes(getStoredStaffRole());

  const [items, setItems] = useState([]);
  const [inHouse, setInHouse] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [order, setOrder] = useState(emptyOrder);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [printReceipt, setPrintReceipt] = useState(null);

  const loadGuests = () =>
    fetchInHouse()
      .then((list) => setInHouse(list.filter((r) => r.folio)))
      .catch(() => setInHouse([]))
      .finally(() => setLoadingGuests(false));

  useEffect(() => {
    if (!canAccess) return;
    fetchLaundryItems().then(setItems).catch(() => setItems([]));
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemFor = (row) => items.find((i) => String(i.id) === String(row.reference_id));
  const serviceFor = (row) => LAUNDRY_SERVICE_TYPES.find((s) => s.value === row.laundry_service_type);
  // Preview only — the server re-prices every line from the same catalogue
  // at posting time (FoliosService.resolveLaundryCharge), so a stale price
  // on this screen can never become the price on the bill.
  const rowTotal = (row) => {
    const item = itemFor(row);
    const service = serviceFor(row);
    if (!item || !service) return 0;
    return Number(item[service.priceField] || 0) * (Number(row.quantity) || 0);
  };

  const selectedGuest = inHouse.find((r) => String(r.id) === String(order.reservation_id));
  const orderTotal = order.rows.reduce((sum, row) => sum + rowTotal(row), 0);
  // Same "an untouched line never blocks the order" rule as Guest Sales —
  // a line someone started still has to be finished, since dropping it
  // silently would under-post the bill.
  const rowUntouched = (row) => !row.reference_id && String(row.quantity) === "1";
  const postableRows = order.rows.filter((row) => !rowUntouched(row));
  const orderValid = Boolean(order.reservation_id) && postableRows.length > 0
    && postableRows.every((row) => row.reference_id && Number(row.quantity) > 0);
  const orderBlockReason = !order.reservation_id
    ? "Select a guest to post this laundry to."
    : postableRows.length === 0
      ? "Pick a garment on at least one line."
      : "Finish the lines you started — each needs a garment and a quantity of 1 or more.";

  const setRow = (index, patch) =>
    setOrder((p) => ({ ...p, rows: p.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));

  // The folio opened from the list below, kept separate from
  // order.reservation_id for the same reason Guest Sales keeps them apart:
  // staff can take a payment on any guest's folio without that guest being
  // the one the form above is posting to.
  const [selectedFolioMeta, setSelectedFolioMeta] = useState(null);
  const [folioDetail, setFolioDetail] = useState(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [folioError, setFolioError] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [transactionReceipt, setTransactionReceipt] = useState(null);

  const folioId = selectedFolioMeta?.folioId ?? null;

  const loadFolioDetail = async (id) => {
    if (!id) {
      setFolioDetail(null);
      return;
    }
    try {
      setLoadingFolio(true);
      setFolioError(null);
      setFolioDetail(await fetchFolioById(id));
    } catch (err) {
      setFolioError(err.response?.data?.message || "Failed to load folio balance.");
    } finally {
      setLoadingFolio(false);
    }
  };

  useEffect(() => {
    loadFolioDetail(folioId);
    setPaymentForm(emptyPaymentForm);
    setPaymentError(null);
  }, [folioId]);

  const handleSubmit = async () => {
    if (!orderValid || !selectedGuest) return;
    try {
      setSubmitting(true);
      setError(null);
      const result = await addFolioItemsBatch(selectedGuest.folio.id, {
        bill_no: order.bill_no.trim() || undefined,
        items: postableRows.map((row) => ({
          item_type: "laundry_charge",
          reference_id: Number(row.reference_id),
          laundry_service_type: row.laundry_service_type,
          quantity: Number(row.quantity),
          amount: rowTotal(row), // preview only — server resolves the real price
          description: itemFor(row)?.name || "",
        })),
      });
      const roomNumber = selectedGuest.room_assignments?.[0]?.room_number;
      setOrder({ ...emptyOrder, reservation_id: order.reservation_id }); // keep the guest selected for a follow-up
      setPrintReceipt({
        billNo: result.bill_no,
        who: { room_number: roomNumber, guest_name: selectedGuest.guest_name },
        items: result.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          line_total: Number(i.amount) + Number(i.service_charge || 0),
        })),
        total: result.total,
      });
      // The list's own balances are now stale for this guest, and so is the
      // open folio panel if it happens to be this same folio.
      await loadGuests();
      if (String(selectedFolioMeta?.folioId) === String(selectedGuest.folio.id)) {
        await loadFolioDetail(selectedGuest.folio.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post the laundry charge.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasValidPaymentSplits = paymentForm.splits.length > 0 && paymentForm.splits.every((s) => Number(s.amount) > 0);

  const handleRecordPayment = async () => {
    if (!folioDetail || !hasValidPaymentSplits) return;
    try {
      setRecordingPayment(true);
      setPaymentError(null);
      const result = await recordPayment({
        folio_id: folioDetail.id,
        payments: paymentForm.splits.map((s) => ({ amount: Number(s.amount), payment_method: s.payment_method })),
        receipt_number: paymentForm.receipt_number.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });
      setPaymentForm(emptyPaymentForm);
      await loadFolioDetail(folioDetail.id);
      await loadGuests();
      setTransactionReceipt({
        title: "Payment Recorded",
        items: result.payments.map((p) => ({ reference: p.payment_reference, amount: money(p.amount), method: p.payment_method })),
      });
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setRecordingPayment(false);
    }
  };

  if (!canAccess) {
    return (
      <PageOrSection asSection={asSection} hideTitle={hideTitle} icon={IoShirtOutline} title="Guest Sales" dataComponent="AdminLaundryGuestSales">
        <p className="text-2xl text-[color:var(--text-color)]/68">
          You don&apos;t have permission to view this page.
        </p>
      </PageOrSection>
    );
  }

  return (
    <PageOrSection asSection={asSection} hideTitle={hideTitle} icon={IoShirtOutline} title="Guest Sales" dataComponent="AdminLaundryGuestSales">
      <p className="text-xl text-[color:var(--text-color)]/76">
        Laundry for a guest who is in the house — it goes on their room folio and settles with the rest of the stay.
      </p>

      {error && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{error}</p>}

      <div className="w-full flex flex-col gap-4 bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6">
        <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">New Guest Laundry</p>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Guest</label>
            {loadingGuests ? (
              <LoadingSpinner />
            ) : (
              <select
                value={order.reservation_id}
                onChange={(e) => setOrder({ ...order, reservation_id: e.target.value })}
                className={field.select}
              >
                <option value="">Select an in-house guest</option>
                {inHouse.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_assignments?.[0]?.room_number || "—"} — {r.guest_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Bill No (optional)</label>
            <input
              type="text"
              placeholder="Leave blank to have the system generate one"
              value={order.bill_no}
              onChange={(e) => setOrder({ ...order, bill_no: e.target.value })}
              className={field.input}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {order.rows.map((row, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 max-sm:grid-cols-1 items-end">
              <div className="flex flex-col gap-2">
                <label className={field.label}>Clothes</label>
                <select
                  value={row.reference_id}
                  className={field.select}
                  onChange={(e) => setRow(index, { reference_id: e.target.value })}
                >
                  <option value="">-- Select --</option>
                  {items.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={field.label}>Type</label>
                <select
                  value={row.laundry_service_type}
                  className={field.select}
                  onChange={(e) => setRow(index, { laundry_service_type: e.target.value })}
                >
                  {LAUNDRY_SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={field.label}>Number of Items</label>
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  className={field.input}
                  onChange={(e) => setRow(index, { quantity: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-[color:var(--black)]">{money(rowTotal(row))}</span>
                {order.rows.length > 1 && (
                  <button
                    type="button"
                    className={btn.rowDanger}
                    onClick={() => setOrder((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== index) }))}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            className={`${btn.secondary} self-start`}
            onClick={() => setOrder((p) => ({ ...p, rows: [...p.rows, { ...emptyRow }] }))}
          >
            Add another item
          </button>
        </div>

        <div className="flex justify-between items-center border-t border-[color:var(--text-color)]/10 pt-4">
          <span className="text-xl font-bold uppercase tracking-wide text-[color:var(--text-color)]/68">Total</span>
          <span className="text-2xl font-bold">{money(orderTotal)}</span>
        </div>

        <button onClick={handleSubmit} disabled={submitting || !orderValid} className={`${btn.primary} self-start`}>
          {submitting ? "Posting..." : "Post to Folio"}
        </button>
        {/* Never leave a disabled button unexplained. */}
        {!orderValid && !submitting && (
          <p className="text-lg text-[color:var(--text-color)]/68">{orderBlockReason}</p>
        )}
      </div>

      <div className={`${table.card} w-full`}>
        <div className={table.scroll}>
          <table className={table.el}>
            <thead>
              <tr className={table.headRow}>
                <th className={`${table.th} ${table.stickyTh}`}>Guest</th>
                <th className={table.th}>Room</th>
                <th className={table.th}>Folio #</th>
                <th className={table.th}>Date &amp; Time</th>
                <th className={table.th}>Status</th>
                <th className={table.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingGuests ? (
                <tr><td colSpan={6} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
              ) : inHouse.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No in-house guest folios right now.</td></tr>
              ) : (
                // Owing folios first, same as Guest Sales — that's who staff
                // actually need to take a payment from.
                [...inHouse]
                  .sort((a, b) => Number(b.folio?.balance || 0) - Number(a.folio?.balance || 0))
                  .map((r) => {
                    const isSelected = String(r.folio.id) === String(selectedFolioMeta?.folioId);
                    const balance = Number(r.folio?.balance || 0);
                    return (
                      <tr key={r.id} className={`${table.row} ${isSelected ? "bg-[color:var(--emphasis)]/5" : ""}`}>
                        {/* The sticky cell carries its own opaque background,
                            so a selected row's tint has to be matched here
                            too or it sits plain white over the tint. */}
                        <td className={`${table.td} sticky left-0 z-10 max-lg:whitespace-normal! max-lg:min-w-[18rem] [box-shadow:inset_-1px_0_0_color-mix(in_srgb,var(--text-color)_12%,transparent)] ${isSelected ? "bg-[color-mix(in_srgb,var(--emphasis)_5%,white)]" : "bg-white group-hover:bg-[color-mix(in_srgb,black_2%,white)]"}`}>{r.guest_name}</td>
                        <td className={table.td}>{r.room_assignments?.[0]?.room_number || "—"}</td>
                        <td className={table.td}>{r.folio.folio_number}</td>
                        {/* When this guest's bill was opened. */}
                        <td className={`${table.td} whitespace-nowrap`}>{formatDateTime(r.folio.created_at)}</td>
                        <td className={table.td}><StatusBadge status={balance > 0 ? "owing" : "paid"} /></td>
                        <td className={table.td}>
                          <button
                            onClick={() => setSelectedFolioMeta({ folioId: r.folio.id, guestName: r.guest_name, roomNumber: r.room_assignments?.[0]?.room_number })}
                            className={btn.rowPrimary}
                          >
                            {isSelected ? "Viewing" : "View / Pay"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFolioMeta && (
        <FolioBalanceModal
          meta={selectedFolioMeta}
          folioDetail={folioDetail}
          loading={loadingFolio}
          error={folioError}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          hasValidPaymentSplits={hasValidPaymentSplits}
          recordingPayment={recordingPayment}
          paymentError={paymentError}
          onRecordPayment={handleRecordPayment}
          onClose={() => setSelectedFolioMeta(null)}
        />
      )}

      {printReceipt && (
        <PrintReceiptModal
          billNo={printReceipt.billNo}
          who={printReceipt.who}
          items={printReceipt.items}
          total={printReceipt.total}
          onClose={() => setPrintReceipt(null)}
        />
      )}

      {transactionReceipt && (
        <TransactionReceiptModal
          title={transactionReceipt.title}
          items={transactionReceipt.items}
          onClose={() => setTransactionReceipt(null)}
        />
      )}
    </PageOrSection>
  );
}
