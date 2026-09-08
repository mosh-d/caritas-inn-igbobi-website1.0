import { useState, useEffect, useCallback } from "react";
import { IoShirtOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Modal from "../components/shared/Modal";
import StatusBadge from "../components/shared/StatusBadge";
import PhoneInput from "../components/shared/PhoneInput";
import PaymentSplitRows from "../components/shared/PaymentSplitRows";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import PrintReceiptModal from "../components/shared/PrintReceiptModal";
import AutoGrowTextarea from "../components/shared/AutoGrowTextarea";
import { btn, field, table } from "../components/shared/ui";
import { fetchLaundryItems } from "../utils/menu-api";
import {
  fetchNonGuestFolios,
  fetchNonGuestFolioById,
  createNonGuestFolio,
  addNonGuestFolioItem,
  updateNonGuestFolioGuestInfo,
  recordNonGuestPayment,
} from "../utils/non-guest-folios-api";

const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// The two ways the same garment is sold. Kept in one place so the labels on
// the picker, the receipt and the folio line can never disagree.
const SERVICE_TYPES = [
  { value: "wash_and_iron", label: "Wash & Iron", priceField: "wash_and_iron_price" },
  { value: "ironing_only", label: "Ironing Only", priceField: "ironing_only_price" },
];

const emptyRow = { reference_id: "", laundry_service_type: "wash_and_iron", quantity: 1 };
const emptyNewFolio = { guest_name: "", guest_phone: "", bill_no: "", rows: [{ ...emptyRow }] };
const emptyPayment = { splits: [{ amount: "", payment_method: "cash" }], receipt_number: "", notes: "" };

/**
 * Laundry sales to non-guests — the same workflow as Non-Guest Sales, for a
 * different catalogue.
 *
 * It shares the non_guest_folios tables wholesale rather than duplicating the
 * folio/payment/credit machinery, and is kept apart from the F&B page purely
 * by service_type (derived server-side from the lines, never sent from here).
 * A guest already in the house is charged for laundry on their own folio
 * instead — this page is only for walk-in laundry customers.
 */
export default function AdminLaundrySalesPage() {
  const [items, setItems] = useState([]);
  const [folios, setFolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newFolio, setNewFolio] = useState(emptyNewFolio);
  const [submitting, setSubmitting] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadFolios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNonGuestFolios({ service_type: "laundry", limit: 50 });
      setFolios(data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load laundry sales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaundryItems().then(setItems).catch(() => setItems([]));
    loadFolios();
  }, [loadFolios]);

  const itemFor = (row) => items.find((i) => String(i.id) === String(row.reference_id));
  const priceFor = (row) => {
    const item = itemFor(row);
    const service = SERVICE_TYPES.find((s) => s.value === row.laundry_service_type);
    return item && service ? Number(item[service.priceField] || 0) : 0;
  };
  const rowTotal = (row) => priceFor(row) * Number(row.quantity || 0);
  const orderTotal = newFolio.rows.reduce((sum, r) => sum + rowTotal(r), 0);
  const orderValid = newFolio.rows.some((r) => r.reference_id && Number(r.quantity) > 0);

  const setRow = (index, patch) => {
    setNewFolio((p) => ({
      ...p,
      rows: p.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  const handleCreate = async () => {
    if (!orderValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createNonGuestFolio({
        guest_name: newFolio.guest_name.trim() || undefined,
        guest_phone: newFolio.guest_phone.trim() || undefined,
        bill_no: newFolio.bill_no.trim() || undefined,
        items: newFolio.rows
          .filter((r) => r.reference_id && Number(r.quantity) > 0)
          .map((r) => ({
            item_kind: "laundry",
            reference_id: Number(r.reference_id),
            laundry_service_type: r.laundry_service_type,
            quantity: Number(r.quantity),
          })),
      });
      setPrintReceipt({
        billNo: result.items?.[0]?.bill_no,
        who: { guest_name: result.guest_name },
        items: (result.items || []).map((i) => ({
          description: i.description,
          quantity: i.quantity,
          line_total: Number(i.amount) + Number(i.service_charge || 0),
        })),
        total: result.total_amount,
      });
      setNewFolio(emptyNewFolio);
      await loadFolios();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record the sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const openFolio = async (folio) => {
    setSelected(folio);
    setDetailLoading(true);
    try {
      setDetail(await fetchNonGuestFolioById(folio.id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to open the folio.");
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (id) => {
    setDetail(await fetchNonGuestFolioById(id));
    await loadFolios();
  };

  return (
    <div data-component="AdminLaundrySales" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoShirtOutline}>Laundry Sales</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Laundry for someone who is not staying in the house. An in-house guest&apos;s laundry goes on their own folio instead.
      </p>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}

      {/* ── New sale ── */}
      <div className="w-full bg-white rounded-xl border border-[color:var(--text-color)]/10 p-8 flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-[color:var(--black)]">New Laundry Sale</h2>

        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Customer Name (optional)</label>
            <input type="text" value={newFolio.guest_name} className={field.input}
              placeholder="Not needed to record — add it if the bill might go unpaid a while"
              onChange={(e) => setNewFolio({ ...newFolio, guest_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Phone (optional)</label>
            <PhoneInput value={newFolio.guest_phone} onChange={(v) => setNewFolio({ ...newFolio, guest_phone: v })}
              selectClassName={field.select} inputClassName={field.input} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Bill No (optional)</label>
            <input type="text" value={newFolio.bill_no} className={field.input}
              onChange={(e) => setNewFolio({ ...newFolio, bill_no: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {newFolio.rows.map((row, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 max-sm:grid-cols-1 items-end">
              <div className="flex flex-col gap-2">
                <label className={field.label}>Clothes</label>
                <select value={row.reference_id} className={field.select}
                  onChange={(e) => setRow(index, { reference_id: e.target.value })}>
                  <option value="">-- Select --</option>
                  {items.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={field.label}>Type</label>
                <select value={row.laundry_service_type} className={field.select}
                  onChange={(e) => setRow(index, { laundry_service_type: e.target.value })}>
                  {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={field.label}>Number of Items</label>
                <input type="number" min={1} value={row.quantity} className={field.input}
                  onChange={(e) => setRow(index, { quantity: e.target.value })} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-[color:var(--black)]">{money(rowTotal(row))}</span>
                {newFolio.rows.length > 1 && (
                  <button type="button" className={btn.rowDanger}
                    onClick={() => setNewFolio((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== index) }))}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className={`${btn.secondary} self-start`}
            onClick={() => setNewFolio((p) => ({ ...p, rows: [...p.rows, { ...emptyRow }] }))}>
            Add another item
          </button>
        </div>

        <div className="flex justify-between items-center border-t border-[color:var(--text-color)]/10 pt-4">
          <span className="text-2xl font-bold">Total: {money(orderTotal)}</span>
          <button disabled={!orderValid || submitting} onClick={handleCreate} className={btn.primary}>
            {submitting ? "Recording..." : "Record Sale"}
          </button>
        </div>
      </div>

      {/* ── Existing folios ── */}
      <div className="w-full flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-[color:var(--black)]">Laundry Folios</h2>
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className={table.card}>
            <div className={table.scroll}>
              <table className={table.el}>
                <thead>
                  <tr className={table.headRow}>
                    <th className={table.th}>Folio #</th>
                    <th className={table.th}>Customer</th>
                    <th className={table.th}>Total</th>
                    <th className={table.th}>Paid</th>
                    <th className={table.th}>Balance</th>
                    <th className={`${table.th} hidden md:table-cell`}>Payment Status</th>
                    <th className={table.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {folios.length === 0 ? (
                    <tr><td colSpan={7} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No laundry sales yet.</td></tr>
                  ) : (
                    folios.map((f) => (
                      <tr key={f.id} className={table.row}>
                        <td className={`${table.td} font-medium`}>{f.folio_number}</td>
                        {/* Same bill-number fallback the F&B list uses — most
                            of these are recorded without a name. */}
                        <td className={table.td}>
                          {f.guest_name
                            || (f.bill_no && <span className="text-[color:var(--text-color)]/68">Bill No {f.bill_no}</span>)
                            || <span className="text-[color:var(--text-color)]/40">—</span>}
                        </td>
                        <td className={table.td}>{money(f.total_amount)}</td>
                        <td className={table.td}>{money(f.amount_paid)}</td>
                        <td className={`${table.td} font-bold ${Number(f.balance) > 0 ? "text-red-500" : ""}`}>{money(f.balance)}</td>
                        <td className={`${table.td} hidden md:table-cell`}><StatusBadge status={f.payment_status} /></td>
                        <td className={table.td}>
                          <div className={table.actions}>
                            <button onClick={() => openFolio(f)} className={btn.rowPrimary}>View / Pay</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <LaundryFolioModal
          folio={selected}
          detail={detail}
          loading={detailLoading}
          items={items}
          onRefresh={refreshDetail}
          onClose={() => { setSelected(null); setDetail(null); }}
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
    </div>
  );
}

function LaundryFolioModal({ folio, detail, loading, items, onRefresh, onClose }) {
  const [guestInfo, setGuestInfo] = useState({ guest_name: "", guest_phone: "" });
  const [charge, setCharge] = useState({ ...emptyRow });
  const [payment, setPayment] = useState(emptyPayment);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (detail) setGuestInfo({ guest_name: detail.guest_name || "", guest_phone: detail.guest_phone || "" });
  }, [detail]);

  const run = async (action) => {
    setBusy(true);
    setErr(null);
    try {
      await action();
      await onRefresh(folio.id);
    } catch (e) {
      setErr(e.response?.data?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const validSplits = payment.splits.filter((s) => Number(s.amount) > 0);
  const chargeValid = charge.reference_id && Number(charge.quantity) > 0;

  return (
    <>
      <Modal onClose={onClose} title={folio.folio_number} subtitle={folio.guest_name || "Laundry sale"} size="lg" loading={loading}>
        {loading ? <LoadingSpinner size="lg" /> : detail && (
          <>
            {err && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{err}</p>}

            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
              <Stat label="Balance" value={Number(detail.balance) > 0 ? money(detail.balance) : "Settled"} danger={Number(detail.balance) > 0} />
              <Stat label="Total" value={money(detail.total_amount)} />
              <Stat label="Paid" value={money(detail.amount_paid)} />
            </div>

            <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
              <h3 className="text-2xl font-bold text-[color:var(--black)]">Charges</h3>
              {(!detail.items || detail.items.length === 0) ? (
                <p className="text-xl text-[color:var(--text-color)]/76">No charges yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl">
                      <span className="min-w-0 break-words">
                        {Number(item.quantity) > 1 && <span className="font-semibold">{item.quantity} &times; </span>}
                        {item.description}
                        {item.bill_no && <span className="text-[color:var(--text-color)]/68 ml-2">&middot; Bill No {item.bill_no}</span>}
                      </span>
                      <span className="font-bold whitespace-nowrap shrink-0">{money(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {detail.status !== "closed" && (
                <div className="grid grid-cols-4 gap-4 max-sm:grid-cols-1 items-end mt-2">
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Clothes</label>
                    <select value={charge.reference_id} className={field.select}
                      onChange={(e) => setCharge({ ...charge, reference_id: e.target.value })}>
                      <option value="">-- Select --</option>
                      {items.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Type</label>
                    <select value={charge.laundry_service_type} className={field.select}
                      onChange={(e) => setCharge({ ...charge, laundry_service_type: e.target.value })}>
                      {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Number of Items</label>
                    <input type="number" min={1} value={charge.quantity} className={field.input}
                      onChange={(e) => setCharge({ ...charge, quantity: e.target.value })} />
                  </div>
                  <button disabled={busy || !chargeValid} className={btn.secondary}
                    onClick={() => run(async () => {
                      await addNonGuestFolioItem(folio.id, {
                        item_kind: "laundry",
                        reference_id: Number(charge.reference_id),
                        laundry_service_type: charge.laundry_service_type,
                        quantity: Number(charge.quantity),
                      });
                      setCharge({ ...emptyRow });
                    })}>
                    Add Charge
                  </button>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
              <h3 className="text-2xl font-bold text-[color:var(--black)]">Customer</h3>
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className={field.label}>Name</label>
                  <input type="text" value={guestInfo.guest_name} className={field.input}
                    onChange={(e) => setGuestInfo({ ...guestInfo, guest_name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={field.label}>Phone</label>
                  <PhoneInput value={guestInfo.guest_phone} onChange={(v) => setGuestInfo({ ...guestInfo, guest_phone: v })}
                    selectClassName={field.select} inputClassName={field.input} />
                </div>
              </div>
              <button
                disabled={busy || (guestInfo.guest_name === (detail.guest_name || "") && guestInfo.guest_phone === (detail.guest_phone || ""))}
                className={`${btn.secondary} self-start`}
                onClick={() => run(() => updateNonGuestFolioGuestInfo(folio.id, guestInfo))}>
                Save Customer Info
              </button>
            </section>

            {detail.status !== "closed" && (
              <section className="flex flex-col gap-4 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Record Payment</h3>
                <PaymentSplitRows splits={payment.splits} setSplits={(splits) => setPayment({ ...payment, splits })} />
                <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Receipt Number (optional)</label>
                    <input type="text" value={payment.receipt_number} className={field.input}
                      onChange={(e) => setPayment({ ...payment, receipt_number: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Notes (optional)</label>
                    <AutoGrowTextarea value={payment.notes} className={field.textarea}
                      onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
                  </div>
                </div>
                <button disabled={busy || validSplits.length === 0} className={`${btn.primary} self-start`}
                  onClick={() => run(async () => {
                    const result = await recordNonGuestPayment({
                      non_guest_folio_id: folio.id,
                      payments: validSplits.map((s) => ({ amount: Number(s.amount), payment_method: s.payment_method })),
                      receipt_number: payment.receipt_number.trim() || undefined,
                      notes: payment.notes.trim() || undefined,
                    });
                    setPayment(emptyPayment);
                    setReceipt({
                      title: "Payment Recorded",
                      items: (result.payments || []).map((p) => ({
                        reference: p.payment_reference,
                        amount: money(p.amount),
                        method: p.payment_method,
                      })),
                    });
                  })}>
                  {busy ? "Recording..." : "Record Payment"}
                </button>
              </section>
            )}
          </>
        )}
      </Modal>

      {receipt && (
        <TransactionReceiptModal title={receipt.title} items={receipt.items} onClose={() => setReceipt(null)} />
      )}
    </>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className="bg-[color:var(--text-color)]/5 border-1 border-gray-200 rounded-lg px-5 py-4">
      <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">{label}</p>
      <p className={`text-2xl font-bold truncate ${danger ? "text-red-600" : "text-[color:var(--black)]"}`}>{value}</p>
    </div>
  );
}
