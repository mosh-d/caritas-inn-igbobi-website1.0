import { useState, useEffect } from "react";
import { IoFastFoodOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import PrintReceiptModal from "../components/shared/PrintReceiptModal";
import { btn, field } from "../components/shared/ui";
import { getStoredStaffRole } from "../utils/auth";
import { fetchFoodItems, fetchDrinkItems } from "../utils/menu-api";
import { fetchInHouse } from "../utils/front-office-api";
import { addFolioItemsBatch } from "../utils/folios-api";

const emptyRow = { item_kind: "food", reference_id: "", quantity: "1", is_complementary: false, is_manager: false };
const emptyOrder = { reservation_id: "", bill_no: "", rows: [{ ...emptyRow }] };

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

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
  useEffect(() => {
    if (!canAccess) return;
    fetchFoodItems().then(setFoodItems).catch(() => {});
    fetchDrinkItems().then(setDrinkItems).catch(() => {});
    fetchInHouse()
      .then((list) => setInHouse(list.filter((r) => r.folio)))
      .catch(() => setInHouse([]))
      .finally(() => setLoadingGuests(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuFor = (kind) => (kind === "food" ? foodItems : drinkItems);
  const itemFor = (row) => menuFor(row.item_kind).find((i) => String(i.id) === String(row.reference_id));
  const isCompOrManager = (row) => row.is_complementary || row.is_manager;
  // Preview only — the backend always re-resolves price/service_charge
  // itself from the live menu item at posting time, same "never trust the
  // client" reasoning as Non-Guest Sales.
  const rowAmount = (row) => {
    const item = itemFor(row);
    if (!item || isCompOrManager(row)) return 0;
    return Number(item.price) * (Number(row.quantity) || 0);
  };
  const rowServiceCharge = (row) => {
    const item = itemFor(row);
    if (!item || isCompOrManager(row)) return 0;
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
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post the order.");
    } finally {
      setSubmitting(false);
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
                onChange={(e) => updateRow(index, { item_kind: e.target.value, reference_id: "", is_complementary: false, is_manager: false })}
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
                  checked={row.is_complementary || row.is_manager}
                  disabled={row.is_manager}
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
    </div>
  );
}
