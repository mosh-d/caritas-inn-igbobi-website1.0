import { useState, useEffect, useCallback } from "react";
import { IoCartOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { btn, field, table } from "../components/shared/ui";
import { getStoredStaffRole } from "../utils/auth";
import { fetchFoodItems, fetchDrinkItems } from "../utils/menu-api";
import { fetchDirectSales, createDirectSale } from "../utils/direct-sales-api";

const PAYMENT_METHODS = ["cash", "card", "transfer", "pos", "online"];
const emptyRow = { item_kind: "food", reference_id: "", quantity: "1" };

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatTime = (d) => d ? new Date(d).toLocaleTimeString("en-US", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }) : "—";

export default function AdminWalkInSales() {
  // Nav already hides this page from an accountant session (see
  // adminNavItems.js) — this is just the same defense-in-depth
  // permission-denied fallback every other role-gated page already has
  // (AdminMenu.jsx, AdminAuditTrail.jsx).
  const canAccess = getStoredStaffRole() !== "accountant";

  const [foodItems, setFoodItems] = useState([]);
  const [drinkItems, setDrinkItems] = useState([]);
  useEffect(() => {
    if (!canAccess) return;
    fetchFoodItems().then(setFoodItems).catch(() => {});
    fetchDrinkItems().then(setDrinkItems).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const loadSales = useCallback(async () => {
    try {
      setLoadingSales(true);
      setSales(await fetchDirectSales());
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load today's sales.") + " Please refresh the page.");
    } finally {
      setLoadingSales(false);
    }
  }, []);
  useEffect(() => { if (canAccess) loadSales(); }, [canAccess, loadSales]);

  if (!canAccess) {
    return (
      <div data-component="AdminWalkInSales" className="px-[4rem] max-sm:px-[1rem] py-[4rem]">
        <p className="text-2xl text-[color:var(--text-color)]/68">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  const menuFor = (kind) => (kind === "food" ? foodItems : drinkItems);
  const itemFor = (row) => menuFor(row.item_kind).find((i) => String(i.id) === String(row.reference_id));
  const rowAmount = (row) => {
    const item = itemFor(row);
    if (!item) return 0;
    return Number(item.price) * (Number(row.quantity) || 0);
  };
  const total = rows.reduce((sum, row) => sum + rowAmount(row), 0);
  const rowsValid = rows.length > 0 && rows.every((row) => row.reference_id && Number(row.quantity) > 0);

  const updateRow = (index, patch) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!rowsValid) return;
    try {
      setSubmitting(true);
      setError(null);
      await createDirectSale({
        items: rows.map((row) => ({
          item_kind: row.item_kind,
          reference_id: Number(row.reference_id),
          quantity: Number(row.quantity),
        })),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      });
      setRows([{ ...emptyRow }]);
      setPaymentMethod("cash");
      setNotes("");
      setSuccessMessage("Sale recorded.");
      setTimeout(() => setSuccessMessage(""), 5000);
      await loadSales();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record sale.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-component="AdminWalkInSales" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoCartOutline}>Walk-In Sales</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Record a food/drink sale to someone who isn't a hotel guest — walk-in restaurant/bar customers, for example. Nothing here touches a folio; it's recorded on its own so it still shows up in reports.
      </p>

      {error && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{error}</p>}
      {successMessage && <p className="text-green-700 text-xl bg-green-50 border border-green-200 rounded-lg px-4 py-3 w-full">{successMessage}</p>}

      <div className="w-full flex flex-col gap-4 bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6">
        <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Items</p>
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-4 pb-4 border-b border-[color:var(--text-color)]/10 last:border-0 last:pb-0">
            <div className="flex flex-col gap-2">
              <label className={field.label}>Kind</label>
              <select
                value={row.item_kind}
                onChange={(e) => updateRow(index, { item_kind: e.target.value, reference_id: "" })}
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
            <div className="flex items-center justify-between gap-4">
              <span className="text-xl font-bold whitespace-nowrap">{money(rowAmount(row))}</span>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(index)} className={btn.rowDanger}>Remove</button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} className={`${btn.rowSecondary} self-start`}>+ Add Item</button>

        <div className="flex justify-between items-center border-t border-[color:var(--text-color)]/10 pt-4">
          <span className="text-xl font-bold uppercase tracking-wide text-[color:var(--text-color)]/68">Total</span>
          <span className="text-2xl font-bold">{money(total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={field.select}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={field.input} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting || !rowsValid} className={`${btn.primary} self-start`}>
          {submitting ? "Recording..." : "Record Sale"}
        </button>
      </div>

      <div className="w-full flex flex-col gap-3">
        <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Today's Sales</p>
        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Time</th>
                  <th className={table.th}>Items</th>
                  <th className={table.th}>Payment</th>
                  <th className={table.th}>Total</th>
                  <th className={table.th}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {loadingSales ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : sales.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No walk-in sales recorded today.</td></tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className={table.row}>
                      <td className={table.td}>{formatTime(sale.created_at)}</td>
                      <td className={table.td}>{(sale.items || []).map((i) => `${i.description} x${i.quantity}`).join(", ")}</td>
                      <td className={`${table.td} capitalize`}>{sale.payment_method}</td>
                      <td className={`${table.td} font-bold`}>{money(sale.total_amount)}</td>
                      <td className={`${table.td} font-mono text-base`}>{sale.sale_reference}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
