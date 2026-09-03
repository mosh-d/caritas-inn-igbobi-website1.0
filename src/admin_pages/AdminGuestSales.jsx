import { useState, useEffect } from "react";
import { IoFastFoodOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Modal from "../components/shared/Modal";
import StatusBadge from "../components/shared/StatusBadge";
import PrintReceiptModal from "../components/shared/PrintReceiptModal";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import PaymentSplitRows from "../components/shared/PaymentSplitRows";
import AutoGrowTextarea from "../components/shared/AutoGrowTextarea";
import { btn, field, table } from "../components/shared/ui";
import { getStoredStaffRole } from "../utils/auth";
import { fetchFoodItems, fetchDrinkItems } from "../utils/menu-api";
import { fetchInHouse } from "../utils/front-office-api";
import { addFolioItemsBatch, fetchFolioById, fetchPendingFolios, recordPayment } from "../utils/folios-api";

const emptyRow = { item_kind: "food", reference_id: "", quantity: "1", is_complementary: false };
const emptyOrder = { reservation_id: "", bill_no: "", rows: [{ ...emptyRow }] };
// Deliberately no tax_mode/tax/discount_mode/discount fields, unlike
// AdminFolios.jsx's own payment form — this panel is scoped to "record what
// the guest paid," not the fuller adjustment/refund/closing workflow that
// stays Folios-page-only.
const emptyPaymentForm = { splits: [{ amount: "", payment_method: "transfer" }], receipt_number: "", notes: "" };

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }) : "—";

// Dedicated order-taking page for an in-house guest's room folio —
// AdminFolios.jsx's generic "Add a Charge" form used to be the only way to
// post a food/drink charge to a guest, which meant finding the right folio
// first. This replaces that for food/drink specifically: pick the guest
// from a dropdown (resolves straight to their room folio via
// front-office/in-house, which now includes it), build the order the same
// way Non-Guest Sales does, submit as one batch, print the receipt.
export default function AdminGuestSalesPage() {
  // A receptionist can post everything else to a guest folio EXCEPT
  // food/drink (see FoliosService.addFolioItemsBatch's own role check) — a
  // page that's exclusively food/drink has nothing they could actually
  // submit, so it's hidden from them the same defense-in-depth way
  // AdminNonGuestSales.jsx hides itself from an accountant session.
  const staffRole = getStoredStaffRole();
  const canAccess = !["accountant", "receptionist"].includes(staffRole);

  const [foodItems, setFoodItems] = useState([]);
  const [drinkItems, setDrinkItems] = useState([]);
  const [inHouse, setInHouse] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  // Folios for a guest who has already checked out but still owes F&B — a
  // checked-out reservation drops off fetchInHouse() immediately (it's
  // scoped to currently-active stays), but the backend deliberately leaves
  // an unsettled folio open as a receivable rather than closing it (see
  // ReservationsService.checkOut) — this is the only place that folio is
  // still reachable from once the room-level "In-House" list has moved on.
  // fetchPendingFolios() already returns exactly open+owing folios
  // branch-wide (both still-in-house and departed) — filtered here to
  // departed only, since an in-house one is already covered by the tab
  // above.
  const [checkedOutFolios, setCheckedOutFolios] = useState([]);
  const [loadingCheckedOut, setLoadingCheckedOut] = useState(true);
  const [folioTab, setFolioTab] = useState("in-house");
  useEffect(() => {
    if (!canAccess) return;
    fetchFoodItems().then(setFoodItems).catch(() => {});
    fetchDrinkItems().then(setDrinkItems).catch(() => {});
    fetchInHouse()
      .then((list) => setInHouse(list.filter((r) => r.folio)))
      .catch(() => setInHouse([]))
      .finally(() => setLoadingGuests(false));
    fetchPendingFolios()
      .then((list) => setCheckedOutFolios((list || []).filter((f) => f.reservation?.actual_check_out)))
      .catch(() => setCheckedOutFolios([]))
      .finally(() => setLoadingCheckedOut(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuFor = (kind) => (kind === "food" ? foodItems : drinkItems);
  const itemFor = (row) => menuFor(row.item_kind).find((i) => String(i.id) === String(row.reference_id));
  const isComp = (row) => row.is_complementary;
  // Preview only — the backend always re-resolves price/service_charge
  // itself from the live menu item at posting time, same "never trust the
  // client" reasoning as Non-Guest Sales.
  const rowAmount = (row) => {
    const item = itemFor(row);
    if (!item || isComp(row)) return 0;
    return Number(item.price) * (Number(row.quantity) || 0);
  };
  const rowServiceCharge = (row) => {
    const item = itemFor(row);
    if (!item || isComp(row)) return 0;
    return Number(item.service_charge || 0) * (Number(row.quantity) || 0);
  };

  const [order, setOrder] = useState(emptyOrder);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [printReceipt, setPrintReceipt] = useState(null);

  const selectedGuest = inHouse.find((r) => String(r.id) === String(order.reservation_id));
  const orderTotal = order.rows.reduce((sum, row) => sum + rowAmount(row) + rowServiceCharge(row), 0);
  const orderValid = order.reservation_id && order.rows.length > 0 && order.rows.every((row) => row.reference_id && Number(row.quantity) > 0);

  const updateRow = (index, patch) => {
    setOrder({ ...order, rows: order.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  };
  const addRow = () => setOrder({ ...order, rows: [...order.rows, { ...emptyRow }] });
  const removeRow = (index) => setOrder({ ...order, rows: order.rows.filter((_, i) => i !== index) });

  // The selected folio's balance/recent-charges/payment form, shown in a
  // modal — inHouse's own `folio` field is only { id, folio_number }, no
  // balance, so a real fetch is needed once a row is picked. { folioId,
  // guestName, roomNumber } rather than a raw inHouse/checkedOutFolios row:
  // the two tabs' rows have different shapes (one has room_assignments, the
  // other doesn't), so the modal is fed a small, uniform summary instead of
  // needing to know which tab a selection came from.
  //
  // Deliberately its own state, separate from order.reservation_id: the
  // guest-folio list below lets staff jump straight to any guest's folio to
  // record a payment without that guest needing to be the one selected in
  // the order form above (they might not be placing an order at all — a
  // checked-out guest can't anyway). handleSubmit/orderValid/etc. below stay
  // entirely driven by order.reservation_id — this only ever affects which
  // folio the modal shows.
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
        items: order.rows.map((row) => ({
          item_type: row.item_kind === "food" ? "food_charge" : "drink_charge",
          reference_id: Number(row.reference_id),
          quantity: Number(row.quantity),
          amount: rowAmount(row), // preview only — server resolves the real price
          description: itemFor(row)?.name || "",
          is_complementary: row.is_complementary,
        })),
      });
      const roomNumber = selectedGuest.room_assignments?.[0]?.room_number;
      setOrder({ ...emptyOrder, reservation_id: order.reservation_id }); // keep the same guest selected for a follow-up order
      setPrintReceipt({
        billNo: result.bill_no,
        who: { room_number: roomNumber, guest_name: selectedGuest.guest_name },
        items: result.items.map((i) => ({ description: i.description, quantity: i.quantity, line_total: Number(i.amount) + Number(i.service_charge) })),
        serviceCharge: result.items.reduce((s, i) => s + Number(i.service_charge || 0), 0),
        total: result.total,
      });
      // Only refresh the balance here if this same guest's folio is the one
      // currently open in the modal (selectedFolioMeta can point at a
      // different folio, picked from either list, than the one this order
      // was just posted to) — otherwise the folioId-keyed effect below
      // already owns loading whichever folio actually is selected.
      if (String(selectedFolioMeta?.folioId) === String(selectedGuest.folio.id)) {
        await loadFolioDetail(selectedGuest.folio.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post the order.");
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
      <div data-component="AdminGuestSales" className="px-[4rem] max-sm:px-[1rem] py-[4rem]">
        <p className="text-2xl text-[color:var(--text-color)]/68">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div data-component="AdminGuestSales" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoFastFoodOutline}>Guest Sales</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Post a food/drink order to an in-house guest's room folio and print the receipt.
      </p>

      {error && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{error}</p>}

      <div className="w-full flex flex-col gap-4 bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6">
        <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">New Guest Order</p>

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
        <p className="text-lg text-[color:var(--text-color)]/60">
          One receipt number covers the whole order — leave it blank and the system fills one in.
        </p>

        {order.rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-4 pb-4 border-b border-[color:var(--text-color)]/10 last:border-0 last:pb-0">
            <div className="flex flex-col gap-2">
              <label className={field.label}>Kind</label>
              <select
                value={row.item_kind}
                onChange={(e) => updateRow(index, { item_kind: e.target.value, reference_id: "", is_complementary: false })}
                className={field.select}
              >
                <option value="food">Food</option>
                <option value="drink">Drink</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Item</label>
              <select
                value={row.reference_id}
                onChange={(e) => updateRow(index, { reference_id: e.target.value })}
                className={field.select}
              >
                <option value="">Select an item</option>
                {menuFor(row.item_kind).map((i) => <option key={i.id} value={i.id}>{i.name} — {money(i.price)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Quantity</label>
              <input type="number" min="1" value={row.quantity} onChange={(e) => updateRow(index, { quantity: e.target.value })} className={field.input} />
            </div>
            <div className="flex gap-6 flex-wrap items-center">
              <label className="flex items-center gap-2 text-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.is_complementary}
                  onChange={(e) => updateRow(index, { is_complementary: e.target.checked })}
                  className="w-5 h-5 cursor-pointer"
                />
                Complementary
              </label>
            </div>
            {Number(rowServiceCharge(row)) > 0 && (
              <p className="text-lg text-[color:var(--text-color)]/60">Service Charge: {money(rowServiceCharge(row))}</p>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xl font-bold whitespace-nowrap">{money(rowAmount(row) + rowServiceCharge(row))}</span>
              {order.rows.length > 1 && (
                <button type="button" onClick={() => removeRow(index)} className={btn.rowDanger}>Remove</button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} className={`${btn.rowSecondary} self-start`}>+ Add Item</button>

        <div className="flex justify-between items-center border-t border-[color:var(--text-color)]/10 pt-4">
          <span className="text-xl font-bold uppercase tracking-wide text-[color:var(--text-color)]/68">Total</span>
          <span className="text-2xl font-bold">{money(orderTotal)}</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !orderValid}
          className={`${btn.primary} self-start`}
        >
          {submitting ? "Posting..." : "Post Order"}
        </button>
      </div>

      <div className={table.card}>
        <div className="px-8 py-4 border-b border-[color:var(--text-color)]/10 flex gap-3 flex-wrap">
          {[
            { key: "in-house", label: "In-House" },
            { key: "checked-out", label: "Checked-Out (Owing)" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFolioTab(t.key)}
              className={`px-5 py-2.5 rounded-lg text-lg font-bold cursor-pointer transition-all ${
                folioTab === t.key ? "bg-[color:var(--emphasis)] text-white" : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {folioTab === "in-house" ? (
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Room</th>
                  <th className={table.th}>Guest</th>
                  <th className={table.th}>Folio #</th>
                  <th className={table.th}>Status</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingGuests ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : inHouse.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No in-house guest folios right now.</td></tr>
                ) : (
                  // Owing folios first (highest balance first) — that's who
                  // staff actually need to chase down and take a payment
                  // from; a settled or credit folio can sit further down.
                  [...inHouse]
                    .sort((a, b) => Number(b.folio?.balance || 0) - Number(a.folio?.balance || 0))
                    .map((r) => {
                      const isSelected = String(r.folio.id) === String(selectedFolioMeta?.folioId);
                      const balance = Number(r.folio?.balance || 0);
                      return (
                        <tr key={r.id} className={`${table.row} ${isSelected ? "bg-[color:var(--emphasis)]/5" : ""}`}>
                          <td className={table.td}>{r.room_assignments?.[0]?.room_number || "—"}</td>
                          <td className={table.td}>{r.guest_name}</td>
                          <td className={table.td}>{r.folio.folio_number}</td>
                          <td className={table.td}>
                            <StatusBadge status={balance > 0 ? "owing" : "paid"} />
                          </td>
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
        ) : (
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Guest</th>
                  <th className={table.th}>Folio #</th>
                  <th className={table.th}>Checked Out</th>
                  <th className={table.th}>Balance</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCheckedOut ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : checkedOutFolios.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No checked-out guests owing F&amp;B right now.</td></tr>
                ) : (
                  // Most recently checked out first — that's the receivable
                  // most likely to still be fresh in a guest's memory (or to
                  // still be reachable by phone), and the one staff most
                  // likely mean when they say "the guest who just left".
                  [...checkedOutFolios]
                    .sort((a, b) => new Date(b.reservation?.actual_check_out || 0) - new Date(a.reservation?.actual_check_out || 0))
                    .map((f) => {
                      const isSelected = String(f.id) === String(selectedFolioMeta?.folioId);
                      const guestName = f.guest ? `${f.guest.first_name} ${f.guest.last_name}` : (f.reservation?.guest_name || "N/A");
                      return (
                        <tr key={f.id} className={`${table.row} ${isSelected ? "bg-[color:var(--emphasis)]/5" : ""}`}>
                          <td className={table.td}>{guestName}</td>
                          <td className={table.td}>{f.folio_number}</td>
                          <td className={table.td}>{formatDate(f.reservation?.actual_check_out)}</td>
                          <td className={`${table.td} font-bold text-red-500`}>{money(f.balance)}</td>
                          <td className={table.td}>
                            <button
                              onClick={() => setSelectedFolioMeta({ folioId: f.id, guestName, roomNumber: null })}
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
        )}
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
          serviceCharge={printReceipt.serviceCharge}
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
    </div>
  );
}

// Compact — a balance summary + payment form, not the full Folio Detail
// experience (no tax/discount, refunds, or closing here; that stays
// Folios-page-only). A modal rather than an inline card: it used to render
// below the guest-folio list, which meant clicking "View / Pay" produced no
// visible feedback above the fold — easy to mistake for the button not
// working at all. Every other "View" action on a folio list in this app
// (Non-Guest Sales, Folios) already opens a modal — this now matches that.
// Page-local rather than under components/shared/: it's driven entirely by
// this page's own state/refetch timing, with exactly one consumer, same as
// MenuSection (AdminMenu.jsx) and SummaryStat (AdminFolios.jsx) are already
// page-local in this codebase.
function FolioBalanceModal({ meta, folioDetail, loading, error, paymentForm, setPaymentForm, hasValidPaymentSplits, recordingPayment, paymentError, onRecordPayment, onClose }) {
  const balance = folioDetail ? Number(folioDetail.balance) : 0;
  const isOutstanding = folioDetail && balance > 0;
  const isCredit = folioDetail && balance < 0;

  return (
    <Modal
      onClose={onClose}
      title={folioDetail?.folio_number || "Folio"}
      subtitle={meta.roomNumber ? `Room ${meta.roomNumber} — ${meta.guestName}` : meta.guestName}
      size="md"
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

          {folioDetail.items?.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className={field.label}>Recent Charges</p>
              {folioDetail.items.slice(0, 3).map((item) => (
                <p key={item.id} className="text-lg text-[color:var(--text-color)]/76">
                  {item.description} — {money(Number(item.amount) + Number(item.service_charge))}
                </p>
              ))}
            </div>
          )}

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
