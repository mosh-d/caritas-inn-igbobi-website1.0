import { useState, useEffect, useCallback, useRef } from "react";
import { IoCartOutline } from "react-icons/io5";
import Button from "../components/shared/Button";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import PaymentSplitRows from "../components/shared/PaymentSplitRows";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import AutoGrowTextarea from "../components/shared/AutoGrowTextarea";
import { btn, field, table } from "../components/shared/ui";
import { getStoredStaffRole } from "../utils/auth";
import { fetchFoodItems, fetchDrinkItems } from "../utils/menu-api";
import {
  fetchWalkInFolios,
  fetchWalkInFolioById,
  createWalkInFolio,
  addWalkInFolioItem,
  updateWalkInFolioGuestInfo,
  closeWalkInFolio,
  recordWalkInPayment,
  fetchWalkInCredits,
  applyWalkInCredit,
} from "../utils/walk-in-folios-api";

const emptyRow = { item_kind: "food", reference_id: "", quantity: "1", bill_no: "", is_complementary: false, is_manager: false };
const emptyNewFolioForm = { guest_name: "", guest_phone: "", rows: [{ ...emptyRow }] };
const emptyPaymentForm = { splits: [{ amount: "", payment_method: "cash" }], receipt_number: "", notes: "" };

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function AdminWalkInSalesPage() {
  // Nav already hides this page from an accountant session (see
  // adminNavItems.js) — same defense-in-depth fallback every other
  // role-gated page already has.
  const canAccess = getStoredStaffRole() !== "accountant";

  const [foodItems, setFoodItems] = useState([]);
  const [drinkItems, setDrinkItems] = useState([]);
  useEffect(() => {
    if (!canAccess) return;
    fetchFoodItems().then(setFoodItems).catch(() => {});
    fetchDrinkItems().then(setDrinkItems).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuFor = (kind) => (kind === "food" ? foodItems : drinkItems);
  const itemFor = (row) => menuFor(row.item_kind).find((i) => String(i.id) === String(row.reference_id));
  const isCompOrManager = (row) => row.is_complementary || row.is_manager;
  // Preview only — the backend re-resolves price/service_charge itself from
  // the same menu item at posting time, same "never trust the client"
  // reasoning as AdminFolios.jsx/AdminWalkInSales.jsx.
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

  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);

  // === New folio form — a folio is created the moment the first charge is
  // added, so this doubles as both "create" and "add first charge" in one
  // submit, mirroring AdminWalkInSales.jsx's old multi-row form almost
  // exactly, minus the payment step (that's a separate action now). ===
  const [newFolio, setNewFolio] = useState(emptyNewFolioForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [nameCredits, setNameCredits] = useState([]);

  // Debounced, purely informational — the folio doesn't exist yet to apply
  // anything to; the actual Apply Credit action lives in the detail modal
  // below, once a real open folio for this guest exists.
  useEffect(() => {
    const name = newFolio.guest_name.trim();
    if (name.length < 2) {
      setNameCredits([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetchWalkInCredits(name).then(setNameCredits).catch(() => setNameCredits([]));
    }, 400);
    return () => clearTimeout(timeout);
  }, [newFolio.guest_name]);

  const newFolioTotal = newFolio.rows.reduce((sum, row) => sum + rowAmount(row) + rowServiceCharge(row), 0);
  // Bill No is required for food (not drink) — guest_name is optional, so
  // it's often the only identifier this folio has at all.
  const newFolioRowsValid = newFolio.rows.length > 0 && newFolio.rows.every((row) => row.reference_id && Number(row.quantity) > 0 && (row.item_kind !== "food" || row.bill_no.trim()));

  const updateNewFolioRow = (index, patch) => {
    setNewFolio({ ...newFolio, rows: newFolio.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  };
  const addNewFolioRow = () => setNewFolio({ ...newFolio, rows: [...newFolio.rows, { ...emptyRow }] });
  const removeNewFolioRow = (index) => setNewFolio({ ...newFolio, rows: newFolio.rows.filter((_, i) => i !== index) });

  const handleCreateFolio = async () => {
    if (!newFolioRowsValid) return;
    try {
      setCreating(true);
      setCreateError(null);
      await createWalkInFolio({
        guest_name: newFolio.guest_name.trim() || undefined,
        guest_phone: newFolio.guest_phone.trim() || undefined,
        items: newFolio.rows.map((row) => ({
          item_kind: row.item_kind,
          reference_id: Number(row.reference_id),
          quantity: Number(row.quantity),
          bill_no: row.item_kind === "food" && row.bill_no.trim() ? row.bill_no.trim() : undefined,
          is_complementary: row.is_complementary,
          is_manager: row.is_manager,
        })),
      });
      setNewFolio(emptyNewFolioForm);
      setNameCredits([]);
      setSuccessMessage("Walk-in folio opened.");
      setTimeout(() => setSuccessMessage(""), 5000);
      loadFolios();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to open walk-in folio.");
    } finally {
      setCreating(false);
    }
  };

  // === Folio list — mirrors AdminFolios.jsx's list (search/status
  // filter/pagination), replacing the old un-paginated "Today's Sales"
  // table. ===
  const [folios, setFolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const loadSeq = useRef(0);
  const loadFolios = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      setLoading(true);
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;
      else if (statusFilter !== "all") params.status = statusFilter;
      const result = await fetchWalkInFolios(params);
      if (seq !== loadSeq.current) return;
      setFolios(result.data || []);
      setTotalPages(result.totalPages || 1);
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError((err.response?.data?.message || "Failed to load walk-in folios.") + " Please refresh the page.");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [page, statusFilter, searchTerm]);
  useEffect(() => { if (canAccess) loadFolios(); }, [canAccess, loadFolios]);

  // === Folio detail modal ===
  const [selectedFolio, setSelectedFolio] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [itemForm, setItemForm] = useState({ ...emptyRow });
  const [addingItem, setAddingItem] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [guestInfoForm, setGuestInfoForm] = useState({ guest_name: "", guest_phone: "" });
  const [savingGuestInfo, setSavingGuestInfo] = useState(false);
  const [guestInfoError, setGuestInfoError] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [closing, setClosing] = useState(false);
  const [folioCredits, setFolioCredits] = useState([]);
  const [applyingCreditId, setApplyingCreditId] = useState(null);
  const [transactionReceipt, setTransactionReceipt] = useState(null);

  // No guest_name means there's nothing to match a credit against yet —
  // fetchWalkInCredits(undefined) would otherwise fall back to the bare
  // "every pending credit at the branch" list, which is the wrong thing to
  // show here.
  const loadFolioCredits = async (guestName) => {
    if (!guestName) {
      setFolioCredits([]);
      return;
    }
    try {
      setFolioCredits(await fetchWalkInCredits(guestName));
    } catch {
      setFolioCredits([]);
    }
  };

  const openFolioDetail = async (folio) => {
    setDetailLoading(true);
    setItemForm({ ...emptyRow });
    setItemError(null);
    setGuestInfoError(null);
    setPaymentForm(emptyPaymentForm);
    setPaymentError(null);
    try {
      const full = await fetchWalkInFolioById(folio.id);
      setSelectedFolio(full);
      setGuestInfoForm({ guest_name: full.guest_name || "", guest_phone: full.guest_phone || "" });
      await loadFolioCredits(full.guest_name);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load walk-in folio.") + " Please refresh the page.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedFolio = async () => {
    if (!selectedFolio) return;
    const full = await fetchWalkInFolioById(selectedFolio.id);
    setSelectedFolio(full);
    setGuestInfoForm({ guest_name: full.guest_name || "", guest_phone: full.guest_phone || "" });
    await loadFolioCredits(full.guest_name);
  };

  const closeFolioDetail = () => {
    setSelectedFolio(null);
    setFolioCredits([]);
  };

  const handleUpdateGuestInfo = async () => {
    if (!selectedFolio) return;
    try {
      setSavingGuestInfo(true);
      setGuestInfoError(null);
      await updateWalkInFolioGuestInfo(selectedFolio.id, {
        guest_name: guestInfoForm.guest_name,
        guest_phone: guestInfoForm.guest_phone,
      });
      await refreshSelectedFolio();
      loadFolios();
      setSuccessMessage("Guest info updated.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setGuestInfoError(err.response?.data?.message || "Failed to update guest info.");
    } finally {
      setSavingGuestInfo(false);
    }
  };

  const itemFormValid = itemForm.reference_id && Number(itemForm.quantity) > 0 && (itemForm.item_kind !== "food" || itemForm.bill_no.trim());

  const handleAddItem = async () => {
    if (!selectedFolio || !itemFormValid) return;
    try {
      setAddingItem(true);
      setItemError(null);
      await addWalkInFolioItem(selectedFolio.id, {
        item_kind: itemForm.item_kind,
        reference_id: Number(itemForm.reference_id),
        quantity: Number(itemForm.quantity),
        bill_no: itemForm.item_kind === "food" && itemForm.bill_no.trim() ? itemForm.bill_no.trim() : undefined,
        is_complementary: itemForm.is_complementary,
        is_manager: itemForm.is_manager,
      });
      setItemForm({ ...emptyRow });
      await refreshSelectedFolio();
      loadFolios();
    } catch (err) {
      setItemError(err.response?.data?.message || "Failed to add charge.");
    } finally {
      setAddingItem(false);
    }
  };

  const hasValidPaymentSplits = paymentForm.splits.length > 0 && paymentForm.splits.every((s) => Number(s.amount) > 0);

  const handleRecordPayment = async () => {
    if (!selectedFolio || !hasValidPaymentSplits) return;
    try {
      setRecordingPayment(true);
      setPaymentError(null);
      const result = await recordWalkInPayment({
        walk_in_folio_id: selectedFolio.id,
        payments: paymentForm.splits.map((s) => ({ amount: Number(s.amount), payment_method: s.payment_method })),
        receipt_number: paymentForm.receipt_number || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentForm(emptyPaymentForm);
      await refreshSelectedFolio();
      loadFolios();
      setSuccessMessage(
        result.overpaid > 0
          ? `Payment recorded — ${money(result.overpaid)} over the balance kept on file as credit for ${selectedFolio.guest_name}.`
          : "Payment recorded.",
      );
      setTimeout(() => setSuccessMessage(""), 6000);
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

  const handleApplyCredit = async (creditId) => {
    if (!selectedFolio) return;
    try {
      setApplyingCreditId(creditId);
      setPaymentError(null);
      await applyWalkInCredit(creditId, selectedFolio.id);
      await refreshSelectedFolio();
      loadFolios();
      setSuccessMessage("Credit applied.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to apply credit.");
    } finally {
      setApplyingCreditId(null);
    }
  };

  // Manual safety-valve only — recordPayment/applyCredit auto-close the
  // moment balance settles, so this is rarely needed (e.g. writing off a
  // stray ₦0 folio).
  const canCloseFolio = selectedFolio && Number(selectedFolio.balance) <= 0;
  const handleCloseFolio = async () => {
    if (!selectedFolio) return;
    try {
      setClosing(true);
      await closeWalkInFolio(selectedFolio.id);
      setSuccessMessage("Walk-in folio closed.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeFolioDetail();
      loadFolios();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to close walk-in folio.");
    } finally {
      setClosing(false);
    }
  };

  const hasOutstandingBalance = selectedFolio && Number(selectedFolio.balance) > 0;

  if (!canAccess) {
    return (
      <div data-component="AdminWalkInSales" className="px-[4rem] max-sm:px-[1rem] py-[4rem]">
        <p className="text-2xl text-[color:var(--text-color)]/68">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div data-component="AdminWalkInSales" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoCartOutline}>Walk-In Sales</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Record a food/drink order for someone who isn't a hotel guest — name is optional. Payment can be recorded now or later; it closes out automatically once the balance is settled.
      </p>

      {error && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{error}</p>}
      {successMessage && <p className="text-green-700 text-xl bg-green-50 border border-green-200 rounded-lg px-4 py-3 w-full">{successMessage}</p>}

      {/* ==== New folio form ==== */}
      <div className="w-full flex flex-col gap-4 bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6">
        <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">New Walk-In Order</p>
        {createError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{createError}</p>}

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Guest Name (optional)</label>
            <input
              type="text"
              placeholder="Not needed to order — add it if the bill might go unpaid a while"
              value={newFolio.guest_name}
              onChange={(e) => setNewFolio({ ...newFolio, guest_name: e.target.value })}
              className={field.input}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Guest Phone (optional)</label>
            <input
              type="text"
              value={newFolio.guest_phone}
              onChange={(e) => setNewFolio({ ...newFolio, guest_phone: e.target.value })}
              className={field.input}
            />
          </div>
        </div>
        <p className="text-lg text-[color:var(--text-color)]/60">
          Each food item needs its own Bill No, from the F&amp;B docket/bill book — that's how this order is found again later, name or not. Drinks don't have one, same as on a guest folio.
        </p>

        {nameCredits.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 text-blue-700 text-xl">
            {newFolio.guest_name.trim()} has {money(nameCredits.reduce((s, c) => s + Number(c.amount), 0))} in credit from a previous visit — it can be applied once this order is opened.
          </div>
        )}

        {newFolio.rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-4 pb-4 border-b border-[color:var(--text-color)]/10 last:border-0 last:pb-0">
            <div className="flex flex-col gap-2">
              <label className={field.label}>Kind</label>
              <select
                value={row.item_kind}
                onChange={(e) => updateNewFolioRow(index, { item_kind: e.target.value, reference_id: "", bill_no: "", is_complementary: false, is_manager: false })}
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
                onChange={(e) => updateNewFolioRow(index, { reference_id: e.target.value })}
                className={field.select}
              >
                <option value="">Select an item</option>
                {menuFor(row.item_kind).map((i) => <option key={i.id} value={i.id}>{i.name} — {money(i.price)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Quantity</label>
              <input type="number" min="1" value={row.quantity} onChange={(e) => updateNewFolioRow(index, { quantity: e.target.value })} className={field.input} />
            </div>
            {row.item_kind === "food" && (
              <div className="flex flex-col gap-2">
                <label className={field.label}>Bill No *</label>
                <input
                  type="text"
                  placeholder="From the F&B docket/bill book"
                  value={row.bill_no}
                  onChange={(e) => updateNewFolioRow(index, { bill_no: e.target.value })}
                  className={field.input}
                />
              </div>
            )}
            <div className="flex gap-6 flex-wrap items-center">
              <label className="flex items-center gap-2 text-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.is_complementary || row.is_manager}
                  disabled={row.is_manager}
                  onChange={(e) => updateNewFolioRow(index, { is_complementary: e.target.checked })}
                  className="w-5 h-5 cursor-pointer"
                />
                Complementary
              </label>
              <label className="flex items-center gap-2 text-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.is_manager}
                  onChange={(e) => updateNewFolioRow(index, { is_manager: e.target.checked, is_complementary: e.target.checked ? true : row.is_complementary })}
                  className="w-5 h-5 cursor-pointer"
                />
                For Manager
              </label>
            </div>
            {Number(rowServiceCharge(row)) > 0 && (
              <p className="text-lg text-[color:var(--text-color)]/60">Service Charge: {money(rowServiceCharge(row))}</p>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xl font-bold whitespace-nowrap">{money(rowAmount(row) + rowServiceCharge(row))}</span>
              {newFolio.rows.length > 1 && (
                <button type="button" onClick={() => removeNewFolioRow(index)} className={btn.rowDanger}>Remove</button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addNewFolioRow} className={`${btn.rowSecondary} self-start`}>+ Add Item</button>

        <div className="flex justify-between items-center border-t border-[color:var(--text-color)]/10 pt-4">
          <span className="text-xl font-bold uppercase tracking-wide text-[color:var(--text-color)]/68">Total</span>
          <span className="text-2xl font-bold">{money(newFolioTotal)}</span>
        </div>

        <button
          onClick={handleCreateFolio}
          disabled={creating || !newFolioRowsValid}
          className={`${btn.primary} self-start`}
        >
          {creating ? "Opening..." : "Open Folio"}
        </button>
      </div>

      {/* ==== Folio list ==== */}
      <div className="flex gap-3 text-xl flex-wrap items-center w-full">
        {[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "closed", label: "Closed" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setStatusFilter(t.key); setSearchInput(""); setSearchTerm(""); setPage(1); }}
            className={`px-6 py-3 rounded-lg font-bold cursor-pointer transition-all ${!searchTerm && statusFilter === t.key ? "bg-[color:var(--emphasis)] text-white" : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"}`}
          >
            {t.label}
          </button>
        ))}
        <form
          onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); setPage(1); }}
          className="flex gap-2 items-center ml-auto"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by folio #, bill no, or guest name"
            className={`${field.input} w-auto text-xl!`}
          />
          <button type="submit" className={btn.secondary}>Search</button>
          {searchTerm && (
            <button type="button" onClick={() => { setSearchInput(""); setSearchTerm(""); setPage(1); }} className={btn.rowSecondary}>
              Clear
            </button>
          )}
        </form>
      </div>

      <div className={table.card}>
        <div className={table.scroll}>
          <table className={table.el}>
            <thead>
              <tr className={table.headRow}>
                <th className={table.th}>Folio #</th>
                <th className={table.th}>Guest</th>
                <th className={table.th}>Total</th>
                <th className={table.th}>Paid</th>
                <th className={table.th}>Balance</th>
                <th className={`${table.th} hidden md:table-cell`}>Payment Status</th>
                <th className={table.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
              ) : folios.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">{searchTerm ? "No walk-in folios match that search." : "No walk-in folios yet."}</td></tr>
              ) : (
                folios.map((f) => (
                  <tr key={f.id} className={table.row}>
                    <td className={`${table.td} font-medium`}>{f.folio_number}</td>
                    <td className={table.td}>{f.guest_name || <span className="text-[color:var(--text-color)]/40">—</span>}</td>
                    <td className={table.td}>{money(f.total_amount)}</td>
                    <td className={table.td}>{money(f.amount_paid)}</td>
                    <td className={`${table.td} font-bold ${Number(f.balance) > 0 ? "text-red-500" : ""}`}>{money(f.balance)}</td>
                    <td className={`${table.td} hidden md:table-cell`}><StatusBadge status={f.payment_status} /></td>
                    <td className={table.td}>
                      <div className={table.actions}>
                        <button onClick={() => openFolioDetail(f)} className={btn.rowPrimary}>View</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 w-full mt-6">
          <Button variant="emphasis" onClick={() => setPage(page - 1)} disabled={page === 1} className={page === 1 ? "opacity-30 cursor-not-allowed" : ""}>Previous</Button>
          <span className="text-lg font-medium">Page {page} of {totalPages}</span>
          <Button variant="emphasis" onClick={() => setPage(page + 1)} disabled={page === totalPages} className={page === totalPages ? "opacity-30 cursor-not-allowed" : ""}>Next</Button>
        </div>
      )}

      {/* ==== Folio Detail Modal ==== */}
      {(selectedFolio || detailLoading) && (
        <Modal
          onClose={closeFolioDetail}
          loading={detailLoading || !selectedFolio}
          title={selectedFolio?.folio_number || ""}
          subtitle={selectedFolio ? selectedFolio.guest_name : ""}
          badge={selectedFolio && <StatusBadge status={selectedFolio.payment_status} />}
          size="lg"
          footer={selectedFolio && (
            <>
              <button onClick={closeFolioDetail} className={btn.secondary}>Close</button>
              {selectedFolio.status !== "closed" && (
                <button
                  onClick={handleCloseFolio}
                  disabled={!canCloseFolio || closing}
                  className={btn.primary}
                  title={!canCloseFolio ? "Settle the full balance before closing" : ""}
                >
                  {closing ? "Closing..." : "Close Folio"}
                </button>
              )}
            </>
          )}
        >
          {detailLoading || !selectedFolio ? (
            <LoadingSpinner size="lg" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                <SummaryStat label="Total Charged" value={money(selectedFolio.total_amount)} />
                <SummaryStat label="Total Paid" value={money(selectedFolio.amount_paid)} />
                <SummaryStat
                  label="Balance Due"
                  value={hasOutstandingBalance ? money(selectedFolio.balance) : "Settled"}
                  tone={hasOutstandingBalance ? "danger" : "success"}
                />
              </div>

              {/* Guest info — optional, addable/changeable any time (open or
                  closed), typically once it's clear this folio needs to be
                  traced back to a person: an unpaid balance, or a credit
                  from an overpayment. */}
              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Guest Info (optional)</h3>
                {guestInfoError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{guestInfoError}</p>}
                <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Guest Name</label>
                    <input
                      type="text"
                      value={guestInfoForm.guest_name}
                      onChange={(e) => setGuestInfoForm({ ...guestInfoForm, guest_name: e.target.value })}
                      className={field.input}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Guest Phone</label>
                    <input
                      type="text"
                      value={guestInfoForm.guest_phone}
                      onChange={(e) => setGuestInfoForm({ ...guestInfoForm, guest_phone: e.target.value })}
                      className={field.input}
                    />
                  </div>
                </div>
                <button
                  onClick={handleUpdateGuestInfo}
                  disabled={savingGuestInfo || (guestInfoForm.guest_name === (selectedFolio.guest_name || "") && guestInfoForm.guest_phone === (selectedFolio.guest_phone || ""))}
                  className={`${btn.secondary} self-start`}
                >
                  {savingGuestInfo ? "Saving..." : "Save Guest Info"}
                </button>
              </section>

              {/* Charges */}
              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Charges</h3>
                {(!selectedFolio.items || selectedFolio.items.length === 0) ? (
                  <p className="text-xl text-[color:var(--text-color)]/76">No charges yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedFolio.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl">
                        <span className="capitalize min-w-0 break-words">
                          {item.description}
                          {item.bill_no && <span className="text-[color:var(--text-color)]/68 ml-2">· Bill No {item.bill_no}</span>}
                          {Number(item.service_charge) > 0 && <span className="text-[color:var(--text-color)]/68 ml-2">· Service Charge {money(item.service_charge)}</span>}
                          {(item.is_manager || item.is_complementary) && (
                            <span className="ml-2"><StatusBadge status={item.is_manager ? "manager" : "complementary"} /></span>
                          )}
                        </span>
                        <span className="font-bold whitespace-nowrap shrink-0">{money(Number(item.amount) + Number(item.service_charge))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedFolio.status !== "closed" && (
                  <div className="flex flex-col gap-4 mt-2">
                    {itemError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{itemError}</p>}
                    <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Add a charge</p>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Kind</label>
                        <select
                          value={itemForm.item_kind}
                          onChange={(e) => setItemForm({ ...itemForm, item_kind: e.target.value, reference_id: "", bill_no: "", is_complementary: false, is_manager: false })}
                          className={field.select}
                        >
                          <option value="food">Food</option>
                          <option value="drink">Drink</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Item</label>
                        <select value={itemForm.reference_id} onChange={(e) => setItemForm({ ...itemForm, reference_id: e.target.value })} className={field.select}>
                          <option value="">Select an item</option>
                          {menuFor(itemForm.item_kind).map((i) => <option key={i.id} value={i.id}>{i.name} — {money(i.price)}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Quantity</label>
                        <input type="number" min="1" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className={field.input} />
                      </div>
                      {itemForm.item_kind === "food" && (
                        <div className="flex flex-col gap-2">
                          <label className={field.label}>Bill No *</label>
                          <input type="text" value={itemForm.bill_no} onChange={(e) => setItemForm({ ...itemForm, bill_no: e.target.value })} className={field.input} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-6 flex-wrap items-center">
                      <label className="flex items-center gap-2 text-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itemForm.is_complementary || itemForm.is_manager}
                          disabled={itemForm.is_manager}
                          onChange={(e) => setItemForm({ ...itemForm, is_complementary: e.target.checked })}
                          className="w-5 h-5 cursor-pointer"
                        />
                        Complementary
                      </label>
                      <label className="flex items-center gap-2 text-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itemForm.is_manager}
                          onChange={(e) => setItemForm({ ...itemForm, is_manager: e.target.checked, is_complementary: e.target.checked ? true : itemForm.is_complementary })}
                          className="w-5 h-5 cursor-pointer"
                        />
                        For Manager
                      </label>
                    </div>
                    {Number(rowServiceCharge(itemForm)) > 0 && (
                      <p className="text-lg text-[color:var(--text-color)]/60">Service Charge: {money(rowServiceCharge(itemForm))}</p>
                    )}
                    <button onClick={handleAddItem} disabled={addingItem || !itemFormValid} className={`${btn.secondary} self-start`}>
                      {addingItem ? "Adding..." : "Add Charge"}
                    </button>
                  </div>
                )}
              </section>

              {/* Payments */}
              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Payments</h3>
                {(!selectedFolio.payments || selectedFolio.payments.length === 0) ? (
                  <p className="text-xl text-[color:var(--text-color)]/76">No payments recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedFolio.payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl">
                        <div className="min-w-0">
                          <span className="capitalize font-medium">Payment · {p.payment_method}</span>
                          {p.notes && <span className="text-[color:var(--text-color)]/68 ml-2">· {p.notes}</span>}
                          <span className="block text-base text-[color:var(--text-color)]/60">
                            <span className="font-mono">{p.payment_reference}</span>
                            {p.receipt_number && <> · Receipt #{p.receipt_number}</>} · {formatDateTime(p.payment_date)}
                          </span>
                        </div>
                        <span className="font-bold whitespace-nowrap text-green-700">{money(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedFolio.status !== "closed" && (
                  <div className="flex flex-col gap-4 mt-2">
                    {paymentError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{paymentError}</p>}
                    <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">
                      Record a payment{hasOutstandingBalance ? ` — balance due: ${money(selectedFolio.balance)}` : ""}
                    </p>
                    <PaymentSplitRows splits={paymentForm.splits} setSplits={(splits) => setPaymentForm({ ...paymentForm, splits })} />
                    <p className="text-lg text-[color:var(--text-color)]/60">
                      If the guest pays more than the balance and no change is available, enter the full amount received — the excess is automatically kept on file as credit for {selectedFolio.guest_name}.
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Receipt Number</label>
                        <input
                          type="text"
                          value={paymentForm.receipt_number}
                          onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                          className={field.input}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Remarks</label>
                        <AutoGrowTextarea
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          className={field.textarea}
                        />
                      </div>
                    </div>
                    <button onClick={handleRecordPayment} disabled={recordingPayment || !hasValidPaymentSplits} className={`${btn.success} self-start`}>
                      {recordingPayment ? "Recording..." : "Record Payment"}
                    </button>
                  </div>
                )}

                {selectedFolio.status !== "closed" && folioCredits.length > 0 && (
                  <div className="flex flex-col gap-3 mt-2 border-t border-[color:var(--text-color)]/10 pt-6">
                    <p className="text-lg font-semibold uppercase tracking-wide text-blue-700">Credit on File for {selectedFolio.guest_name}</p>
                    {folioCredits.map((c) => (
                      <div key={c.id} className="flex justify-between items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-xl">
                        <span>
                          <span className="font-bold">{money(c.amount)}</span>
                          <span className="text-[color:var(--text-color)]/60 ml-2 font-mono text-base">{c.credit_reference}</span>
                        </span>
                        <button
                          onClick={() => handleApplyCredit(c.id)}
                          disabled={applyingCreditId === c.id}
                          className={btn.rowPrimary}
                        >
                          {applyingCreditId === c.id ? "Applying..." : "Apply Credit"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </Modal>
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

function SummaryStat({ label, value, tone }) {
  const valueColor =
    tone === "danger" ? "text-red-600" : tone === "success" ? "text-green-700" : "text-[color:var(--black)]";
  return (
    <div className="bg-[color:var(--text-color)]/5 border-1 border-gray-200 rounded-lg px-5 py-4">
      <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor} truncate`}>{value}</p>
    </div>
  );
}
