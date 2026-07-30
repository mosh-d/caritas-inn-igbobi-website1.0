import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { IoClose, IoReceiptOutline } from "react-icons/io5";
import Button from "../components/shared/Button";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { btn, field, table } from "../components/shared/ui";
import { useWebSocketContext } from "../context/WebSocketContext";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import CopyIconButton from "../components/shared/CopyIconButton";
import {
  fetchFolios,
  fetchPendingFolios,
  fetchOverdueFolios,
  fetchFolioById,
  addFolioItem,
  closeFolio,
  createFolio,
  recordPayment,
  recordRefund,
} from "../utils/folios-api";

const ITEM_TYPES = ["room_charge", "service", "product", "penalty", "adjustment"];
const PAYMENT_METHODS = ["cash", "card", "transfer", "pos", "online"];

// Both tax and discount can be either a percentage of the charge amount or
// a flat figure, picked via tax_mode/discount_mode.
const emptyItemForm = { description: "", amount: "", tax: "0", tax_mode: "fixed", discount: "0", discount_mode: "percentage", item_type: "service", date: "" };
const emptyCreateForm = { reservation_id: "", guest_id: "", total_amount: "0", amount_paid: "0" };
const emptyPaymentForm = { amount: "", payment_method: "cash", receipt_number: "", notes: "" };
const emptyRefundForm = { amount: "", payment_method: "cash", receipt_number: "", notes: "" };

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminFoliosPage() {
  const [subTab, setSubTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [folios, setFolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [selectedFolio, setSelectedFolio] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Deep-linked from the Audit Trail page's "View folio" link
  // (?highlight_payment_id=) — scrolls the specific payment/refund row into
  // view once the folio modal's payments list exists in the DOM. Same
  // pattern as AdminRooms.jsx's highlightRoomInventoryId.
  const [highlightPaymentId, setHighlightPaymentId] = useState(null);
  const highlightedPaymentRef = useRef(null);
  useEffect(() => {
    if (highlightPaymentId && highlightedPaymentRef.current) {
      highlightedPaymentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightPaymentId, selectedFolio]);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [addingItem, setAddingItem] = useState(false);
  const [closing, setClosing] = useState(false);

  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const [refundForm, setRefundForm] = useState(emptyRefundForm);
  const [recordingRefund, setRecordingRefund] = useState(false);
  const [refundError, setRefundError] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  // Shown right after recording a payment/refund so the reference number is
  // on screen long enough to write down or copy — not an auto-fading toast.
  const [transactionReceipt, setTransactionReceipt] = useState(null);

  // Guards against a slower, stale request (e.g. the initial "all" fetch on
  // mount) resolving *after* a newer one (e.g. the deep-link effect below
  // switching to "pending") and overwriting its correct data — a real race,
  // not just theoretical: a server restart mid-request is exactly the kind
  // of variable latency that makes the older request finish last.
  const loadSeq = useRef(0);
  const loadFolios = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      setLoading(true);
      let nextFolios, nextTotalPages;
      if (searchTerm.trim()) {
        // A search by folio number or payment reference overrides
        // subTab/statusFilter entirely — it's a different question ("where
        // is this specific folio/transaction?") than "what's in this list
        // right now?".
        const result = await fetchFolios({ search: searchTerm.trim(), page, limit });
        nextFolios = result.data || [];
        nextTotalPages = result.totalPages || 1;
      } else if (subTab === "pending") {
        const result = await fetchPendingFolios();
        nextFolios = Array.isArray(result) ? result : [];
        nextTotalPages = 1;
      } else if (subTab === "overdue") {
        const result = await fetchOverdueFolios();
        nextFolios = Array.isArray(result) ? result : [];
        nextTotalPages = 1;
      } else {
        const params = { page, limit };
        if (statusFilter !== "all") params.status = statusFilter;
        const result = await fetchFolios(params);
        nextFolios = result.data || [];
        nextTotalPages = result.totalPages || 1;
      }
      if (seq !== loadSeq.current) return; // a newer request has since started — discard this stale one
      setFolios(nextFolios);
      setTotalPages(nextTotalPages);
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError((err.response?.data?.message || "Failed to load folios.") + " Please refresh the page.");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [subTab, statusFilter, searchTerm, page]);

  useEffect(() => { loadFolios(); }, [loadFolios]);
  useEffect(() => setPage(1), [subTab, statusFilter, searchTerm]);

  // Re-fetch whenever the socket (re)connects — e.g. after a backend
  // restart — so a page left open doesn't keep showing a load failure or
  // stale data once the connection is actually back. Same pattern already
  // used in AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    loadFolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const openFolioDetail = async (folio) => {
    setDetailLoading(true);
    setItemForm(emptyItemForm);
    setPaymentForm(emptyPaymentForm);
    setPaymentError(null);
    setRefundForm(emptyRefundForm);
    setRefundError(null);
    try {
      const full = await fetchFolioById(folio.id);
      setSelectedFolio(full);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load folio.") + " Please refresh the page.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedFolio = async () => {
    if (!selectedFolio) return;
    const full = await fetchFolioById(selectedFolio.id);
    setSelectedFolio(full);
  };

  const closeFolioDetail = () => {
    setSelectedFolio(null);
    setItemForm(emptyItemForm);
    setPaymentForm(emptyPaymentForm);
    setPaymentError(null);
    setRefundForm(emptyRefundForm);
    setRefundError(null);
  };

  // Lets other pages deep-link straight into a filtered view or a specific
  // guest's folio — e.g. the Overview page's "Outstanding" card links to
  // ?tab=pending, checking a guest in redirects to ?reservation_id=123 so a
  // payment can be recorded right away, and the Audit Trail page's "View
  // folio" links use ?folio_id=123 directly (the id is already known there,
  // no need to look it up like the reservation_id case does).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "pending" || tab === "overdue" || tab === "all") {
      setSubTab(tab);
    }
    const reservationId = searchParams.get("reservation_id");
    if (reservationId) {
      fetchFolios({ reservation_id: Number(reservationId) })
        .then((result) => {
          const folio = result?.data?.[0];
          if (folio) openFolioDetail(folio);
        })
        .catch(() => {});
    }
    const folioId = searchParams.get("folio_id");
    if (folioId) {
      openFolioDetail({ id: Number(folioId) });
    }
    const highlightPaymentIdParam = searchParams.get("highlight_payment_id");
    if (highlightPaymentIdParam) {
      setHighlightPaymentId(Number(highlightPaymentIdParam));
    }
    if (tab || reservationId || folioId) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddItem = async () => {
    if (!selectedFolio || !itemForm.description || !itemForm.amount) return;
    try {
      setAddingItem(true);
      const amount = Number(itemForm.amount);
      // Both tax and discount can be entered as either a % of the charge or
      // a flat figure, depending on tax_mode/discount_mode — both get
      // converted to real currency amounts here before hitting the API,
      // which still stores/reports plain amounts (no schema change needed).
      const discountAmount = itemForm.discount_mode === "percentage"
        ? amount * (Number(itemForm.discount || 0) / 100)
        : Number(itemForm.discount || 0);
      const taxAmount = itemForm.tax_mode === "percentage"
        ? amount * (Number(itemForm.tax || 0) / 100)
        : Number(itemForm.tax || 0);
      await addFolioItem(selectedFolio.id, {
        description: itemForm.description,
        amount,
        tax: taxAmount,
        discount: discountAmount,
        item_type: itemForm.item_type,
        date: itemForm.date || undefined,
      });
      setItemForm(emptyItemForm);
      await refreshSelectedFolio();
      loadFolios();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add item.");
    } finally {
      setAddingItem(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedFolio || !paymentForm.amount) return;
    setPaymentError(null);
    try {
      setRecordingPayment(true);
      const result = await recordPayment({
        folio_id: selectedFolio.id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        receipt_number: paymentForm.receipt_number || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentForm(emptyPaymentForm);
      await refreshSelectedFolio();
      loadFolios();
      setSuccessMessage("Payment recorded.");
      setTimeout(() => setSuccessMessage(""), 5000);
      setTransactionReceipt({
        title: "Payment Recorded",
        reference: result.payment.payment_reference,
        amount: money(result.payment.amount),
      });
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleRecordRefund = async () => {
    if (!selectedFolio || !refundForm.amount) return;
    setRefundError(null);
    try {
      setRecordingRefund(true);
      const result = await recordRefund({
        folio_id: selectedFolio.id,
        amount: Number(refundForm.amount),
        payment_method: refundForm.payment_method,
        receipt_number: refundForm.receipt_number || undefined,
        notes: refundForm.notes || undefined,
      });
      setRefundForm(emptyRefundForm);
      await refreshSelectedFolio();
      loadFolios();
      setSuccessMessage("Refund recorded.");
      setTimeout(() => setSuccessMessage(""), 5000);
      setTransactionReceipt({
        title: "Refund Recorded",
        reference: result.refund.payment_reference,
        amount: money(result.refund.amount),
      });
    } catch (err) {
      setRefundError(err.response?.data?.message || "Failed to record refund.");
    } finally {
      setRecordingRefund(false);
    }
  };

  const handleCloseFolio = async () => {
    if (!selectedFolio) return;
    try {
      setClosing(true);
      await closeFolio(selectedFolio.id);
      setSuccessMessage("Folio closed.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeFolioDetail();
      loadFolios();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to close folio.");
    } finally {
      setClosing(false);
    }
  };

  const handleCreateFolio = async () => {
    try {
      setCreating(true);
      await createFolio({
        reservation_id: Number(createForm.reservation_id),
        guest_id: Number(createForm.guest_id),
        total_amount: Number(createForm.total_amount || 0),
        amount_paid: Number(createForm.amount_paid || 0),
      });
      setSuccessMessage("Folio created.");
      setTimeout(() => setSuccessMessage(""), 5000);
      setIsCreateOpen(false);
      setCreateForm(emptyCreateForm);
      loadFolios();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create folio.");
    } finally {
      setCreating(false);
    }
  };

  // Closing is part of finalizing a stay once it's over — a still in-house
  // guest can still incur new charges, so a zero balance alone isn't enough;
  // matches the same precondition the backend's auto-close paths already use.
  // A no-show is the other way a stay definitively ends without an
  // actual_check_out (the guest never arrived at all).
  const canCloseFolio =
    selectedFolio &&
    Number(selectedFolio.balance) <= 0 &&
    (Boolean(selectedFolio.reservation?.actual_check_out) || Boolean(selectedFolio.reservation?.is_no_show));
  const hasOutstandingBalance = selectedFolio && Number(selectedFolio.balance) > 0;
  const hasCreditBalance = selectedFolio && Number(selectedFolio.balance) < 0;
  // A payment-reference search runs through the generic getFolios query, not
  // getOverdueFolios/getPendingFolios — it doesn't fetch actual_check_out, so
  // these columns (which need that data) only make sense when one of those
  // tabs' own query actually ran, not when a search overrides it. Guest
  // Status is useful on both Outstanding Balance and Overdue (has this
  // guest actually left yet?); Check-Out Date only makes sense on Overdue,
  // where it explains *why* a folio counts as overdue in the first place.
  const showGuestStatusColumn = (subTab === "overdue" || subTab === "pending") && !searchTerm;
  const showCheckOutDateColumn = subTab === "overdue" && !searchTerm;
  const extraColumnCount = (showGuestStatusColumn ? 1 : 0) + (showCheckOutDateColumn ? 1 : 0);
  const folioTableColSpan = 7 + extraColumnCount;

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl z-50 flex items-center gap-4 shadow-lg">
          <span className="text-xl font-bold">{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-green-700 hover:text-green-900 cursor-pointer">
            <IoClose size={24} />
          </button>
        </div>
      )}

      <div data-component="AdminFolios" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <PageHeading icon={IoReceiptOutline}>Folios</PageHeading>
          <button onClick={() => setIsCreateOpen(true)} className={`${btn.primary} whitespace-nowrap`}>
            + Create Folio
          </button>
        </div>

        <div className="flex gap-3 text-xl flex-wrap items-center w-full">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Outstanding Balance" },
            { key: "overdue", label: "Overdue" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setSubTab(t.key); setSearchInput(""); setSearchTerm(""); }}
              className={`px-6 py-3 rounded-lg font-bold cursor-pointer transition-all ${!searchTerm && subTab === t.key ? "bg-[color:var(--emphasis)] text-white" : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"}`}
            >
              {t.label}
            </button>
          ))}
          {subTab === "all" && !searchTerm && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${field.select} w-auto text-xl!`}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); setSearchTerm(searchInput); }}
            className="flex gap-2 items-center ml-auto"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by folio # or payment reference (e.g. FOL-D7931B, PAY-3F9A2B)"
              className={`${field.input} w-auto text-xl!`}
            />
            <button type="submit" className={btn.secondary}>Search</button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearchTerm(""); }}
                className={btn.rowSecondary}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        <p className="text-xl text-[color:var(--text-color)]/76">
          {searchTerm
            ? `Folios matching folio # or payment/refund reference "${searchTerm}".`
            : subTab === "all"
            ? "Every folio across all guests, open and closed."
            : subTab === "pending"
            ? "Open folios with a balance still owed."
            : "Guests who are supposed to have checked out but still have a balance owed — only counted from noon on their checkout date onward."}
        </p>

        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Folio #</th>
                  <th className={`${table.th} hidden md:table-cell`}>Guest</th>
                  {showGuestStatusColumn && <th className={table.th}>Guest Status</th>}
                  {showCheckOutDateColumn && <th className={`${table.th} hidden md:table-cell`}>Check-Out Date</th>}
                  <th className={table.th}>Total</th>
                  <th className={table.th}>Paid</th>
                  <th className={table.th}>Balance</th>
                  <th className={`${table.th} hidden md:table-cell`}>Status</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={folioTableColSpan} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : error ? (
                  <tr><td colSpan={folioTableColSpan} className="px-8 py-10 text-center text-red-600 text-xl">{error}</td></tr>
                ) : folios.length === 0 ? (
                  <tr><td colSpan={folioTableColSpan} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">{searchTerm ? "No folios match that folio # or payment reference." : "No folios match filter."}</td></tr>
                ) : (
                  folios.map((f) => (
                    <tr key={f.id} className={table.row}>
                      <td className={`${table.td} font-medium`}>{f.folio_number}</td>
                      <td className={`${table.td} hidden md:table-cell`}>
                        {f.guest ? `${f.guest.first_name} ${f.guest.last_name}` : "N/A"}
                      </td>
                      {showGuestStatusColumn && (
                        <td className={table.td}>
                          {f.reservation?.actual_check_out ? (
                            <span className="text-sm font-bold uppercase tracking-wide text-[color:var(--text-color)]/60 bg-black/5 px-2.5 py-1 rounded-full whitespace-nowrap">
                              Checked Out
                            </span>
                          ) : (
                            <span className="text-sm font-bold uppercase tracking-wide text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                              Still In-House
                            </span>
                          )}
                        </td>
                      )}
                      {showCheckOutDateColumn && (
                        <td className={`${table.td} hidden md:table-cell`}>{formatDate(f.reservation?.check_out)}</td>
                      )}
                      <td className={table.td}>{money(f.total_amount)}</td>
                      <td className={table.td}>{money(f.amount_paid)}</td>
                      <td className={`${table.td} font-bold ${Number(f.balance) > 0 ? "text-red-500" : Number(f.balance) < 0 ? "text-green-600" : ""}`}>
                        {Number(f.balance) < 0 ? `Credit: ${money(Math.abs(Number(f.balance)))}` : money(f.balance)}
                      </td>
                      <td className={`${table.td} hidden md:table-cell`}><StatusBadge status={f.status} /></td>
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

        {subTab === "all" && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 w-full mt-6">
            <Button variant="emphasis" onClick={() => setPage(page - 1)} disabled={page === 1} className={page === 1 ? "opacity-30 cursor-not-allowed" : ""}>Previous</Button>
            <span className="text-lg font-medium">Page {page} of {totalPages}</span>
            <Button variant="emphasis" onClick={() => setPage(page + 1)} disabled={page === totalPages} className={page === totalPages ? "opacity-30 cursor-not-allowed" : ""}>Next</Button>
          </div>
        )}
      </div>

      {/* ==== Folio Detail Modal ==== */}
      {(selectedFolio || detailLoading) && (
        <Modal
          onClose={closeFolioDetail}
          loading={detailLoading || !selectedFolio}
          title={selectedFolio?.folio_number || ""}
          subtitle={selectedFolio ? `Reservation: ${selectedFolio.reservation?.booking_reference || selectedFolio.reservation_id}` : ""}
          badge={selectedFolio && <StatusBadge status={selectedFolio.status} />}
          size="lg"
          footer={selectedFolio && (
            <>
              <button onClick={closeFolioDetail} className={btn.secondary}>Close</button>
              {selectedFolio.status !== "closed" && (
                <button
                  onClick={handleCloseFolio}
                  disabled={!canCloseFolio || closing}
                  className={btn.primary}
                  title={
                    !canCloseFolio
                      ? Number(selectedFolio.balance) > 0
                        ? "Settle full balance before closing folio"
                        : "Guest must check out (or be marked no-show) before the folio can be closed"
                      : ""
                  }
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
              {/* Summary */}
              <div className="grid grid-cols-1 gap-4">
                <SummaryStat label="Guest" value={selectedFolio.guest ? `${selectedFolio.guest.first_name} ${selectedFolio.guest.last_name}` : "N/A"} />
                <SummaryStat label="Total Charged" value={money(selectedFolio.total_amount)} />
                <SummaryStat label="Total Paid" value={money(selectedFolio.amount_paid)} />
                <SummaryStat
                  label="Balance Due"
                  value={hasOutstandingBalance ? money(selectedFolio.balance) : "Settled"}
                  tone={hasOutstandingBalance ? "danger" : "success"}
                />
              </div>
              {hasCreditBalance && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-4 flex items-center justify-between">
                  <span className="text-green-700 font-bold text-xl">Credit Due to Guest:</span>
                  <span className="text-green-700 font-bold text-2xl">{money(Math.abs(Number(selectedFolio.balance)))}</span>
                </div>
              )}

              {/* Charges */}
              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Charges</h3>
                {selectedFolio.reservation?.actual_check_in && Number(selectedFolio.reservation?.total_rate) > 0 && (
                  <div className="bg-[color:var(--text-color)]/3 border border-[color:var(--text-color)]/10 rounded-lg px-5 py-3 text-lg text-[color:var(--text-color)]/76">
                    Original Total Cost of Accommodation: <span className="font-bold text-[color:var(--black)]">{money(selectedFolio.reservation.total_rate)}</span>
                    <span className="block text-base mt-1">
                      Reference only — not part of the balance below. Room charges are billed night by night; use this if you need to compare against a later discount.
                    </span>
                  </div>
                )}
                {(!selectedFolio.items || selectedFolio.items.length === 0) ? (
                  <p className="text-xl text-[color:var(--text-color)]/76">No charges yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedFolio.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl">
                        <span className="capitalize min-w-0 break-words">
                          {item.description}
                          <span className="text-[color:var(--text-color)]/68 ml-2">({item.item_type})</span>
                        </span>
                        <span className="font-bold whitespace-nowrap shrink-0">{money(item.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedFolio.status !== "closed" && (
                  <div className="flex flex-col gap-4 mt-2">
                    <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Add a charge</p>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Description</label>
                        <input type="text" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className={field.input} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Amount (₦)</label>
                        <input type="number" value={itemForm.amount} onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })} className={field.input} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Tax ({itemForm.tax_mode === "percentage" ? "%" : "₦"})</label>
                        <div className="flex flex-col gap-2">
                          <select
                            value={itemForm.tax_mode}
                            onChange={(e) => setItemForm({ ...itemForm, tax_mode: e.target.value })}
                            className={`${field.select} w-auto`}
                          >
                            <option value="fixed">Fixed (₦)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                          <input type="number" value={itemForm.tax} onChange={(e) => setItemForm({ ...itemForm, tax: e.target.value })} className={field.input} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Discount ({itemForm.discount_mode === "percentage" ? "%" : "₦"})</label>
                        <div className="flex flex-col gap-2">
                          <select
                            value={itemForm.discount_mode}
                            onChange={(e) => setItemForm({ ...itemForm, discount_mode: e.target.value })}
                            className={`${field.select} w-auto`}
                          >
                            <option value="fixed">Fixed (₦)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                          <input type="number" value={itemForm.discount} onChange={(e) => setItemForm({ ...itemForm, discount: e.target.value })} className={field.input} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Item Type</label>
                        <select value={itemForm.item_type} onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })} className={field.select}>
                          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    {itemForm.item_type === "adjustment" && (
                      <p className="text-lg text-[color:var(--text-color)]/60 -mt-1">
                        To discount or correct an already-posted charge (e.g. a night-audit room charge), don't edit that
                        line — post a new adjustment here with a <strong>negative amount</strong> instead
                        (e.g. -3000.00). This keeps the original charge visible for audit.
                      </p>
                    )}
                    <button onClick={handleAddItem} disabled={addingItem || !itemForm.description || !itemForm.amount} className={`${btn.primary} self-start`}>
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
                    {selectedFolio.payments.map((p) => {
                      const isRefund = p.status === "refunded";
                      const isHighlighted = p.id === highlightPaymentId;
                      return (
                        <div
                          key={p.id}
                          ref={isHighlighted ? highlightedPaymentRef : null}
                          className={`flex justify-between items-center gap-4 rounded-lg px-5 py-3 text-xl ${
                            isHighlighted
                              ? "bg-[color:var(--emphasis)]/5 ring-1 ring-[color:var(--emphasis)]/50"
                              : "bg-[color:var(--text-color)]/3"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="capitalize font-medium">{isRefund ? "Refund" : "Payment"} · {p.payment_method}</span>
                            {p.notes && <span className="text-[color:var(--text-color)]/68 ml-2">· {p.notes}</span>}
                            <span className="flex items-center gap-1 text-base text-[color:var(--text-color)]/60">
                              <span className="font-mono">{p.payment_reference}</span>
                              <CopyIconButton value={p.payment_reference} />
                              {p.receipt_number && <>· Receipt #{p.receipt_number}</>} · {formatDate(p.payment_date)}
                            </span>
                          </div>
                          <span className={`font-bold whitespace-nowrap ${isRefund ? "text-red-600" : "text-green-700"}`}>
                            {isRefund ? "−" : ""}{money(p.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedFolio.status !== "closed" && (
                  <div className="flex flex-col gap-4 mt-2">
                    {paymentError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{paymentError}</p>}
                    <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Record a payment</p>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Amount (₦) *</label>
                        <input
                          type="number"
                          placeholder={hasOutstandingBalance ? `Balance due: ${money(selectedFolio.balance)}` : hasCreditBalance ? `Credit on account: ${money(Math.abs(Number(selectedFolio.balance)))}` : "0"}
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          className={field.input}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Method *</label>
                        <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className={field.select}>
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Receipt Number</label>
                        <input
                          type="text"
                          placeholder="e.g. from the receipt book"
                          value={paymentForm.receipt_number}
                          onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                          className={field.input}
                        />
                      </div>
                      <div className="col-span-2 max-sm:col-span-1 flex flex-col gap-2">
                        <label className={field.label}>Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. cash received at front desk"
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          className={field.input}
                        />
                      </div>
                    </div>
                    <button onClick={handleRecordPayment} disabled={recordingPayment || !paymentForm.amount} className={`${btn.success} self-start`}>
                      {recordingPayment ? "Recording..." : "Record Payment"}
                    </button>
                  </div>
                )}

                {/* Refunding a credit is allowed even on a closed folio — a folio
                    auto-closes the moment a credit appears, so this is the normal
                    case, not an edge case gated behind "still open". */}
                {hasCreditBalance && (
                  <div className="flex flex-col gap-4 mt-2 border-t border-[color:var(--text-color)]/10 pt-6">
                    {refundError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{refundError}</p>}
                    <p className="text-lg font-semibold uppercase tracking-wide text-red-600">Record a refund to the guest</p>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Amount (₦) *</label>
                        <input
                          type="number"
                          placeholder={`Credit on account: ${money(Math.abs(Number(selectedFolio.balance)))}`}
                          value={refundForm.amount}
                          onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                          className={field.input}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Method *</label>
                        <select value={refundForm.payment_method} onChange={(e) => setRefundForm({ ...refundForm, payment_method: e.target.value })} className={field.select}>
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Receipt Number</label>
                        <input
                          type="text"
                          placeholder="e.g. from the receipt book"
                          value={refundForm.receipt_number}
                          onChange={(e) => setRefundForm({ ...refundForm, receipt_number: e.target.value })}
                          className={field.input}
                        />
                      </div>
                      <div className="col-span-2 max-sm:col-span-1 flex flex-col gap-2">
                        <label className={field.label}>Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. cash refunded to guest at checkout"
                          value={refundForm.notes}
                          onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                          className={field.input}
                        />
                      </div>
                    </div>
                    <button onClick={handleRecordRefund} disabled={recordingRefund || !refundForm.amount} className={`${btn.dangerSolid} self-start`}>
                      {recordingRefund ? "Recording..." : "Record Refund"}
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </Modal>
      )}

      {/* ==== Create Folio Modal ==== */}
      {isCreateOpen && (
        <Modal
          onClose={() => setIsCreateOpen(false)}
          title="Create Folio"
          subtitle="For backfilling a folio onto an existing reservation. New bookings get one automatically on confirmation."
          size="sm"
          footer={
            <>
              <button onClick={() => setIsCreateOpen(false)} className={btn.secondary}>Cancel</button>
              <button onClick={handleCreateFolio} disabled={creating || !createForm.reservation_id || !createForm.guest_id} className={btn.primary}>
                {creating ? "Creating..." : "Create Folio"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div className="flex flex-col gap-2">
              <label className={field.label}>Reservation ID *</label>
              <input type="number" value={createForm.reservation_id} onChange={(e) => setCreateForm({ ...createForm, reservation_id: e.target.value })} className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Guest ID *</label>
              <input type="number" value={createForm.guest_id} onChange={(e) => setCreateForm({ ...createForm, guest_id: e.target.value })} className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Total Amount</label>
              <input type="number" value={createForm.total_amount} onChange={(e) => setCreateForm({ ...createForm, total_amount: e.target.value })} className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Amount Paid</label>
              <input type="number" value={createForm.amount_paid} onChange={(e) => setCreateForm({ ...createForm, amount_paid: e.target.value })} className={field.input} />
            </div>
          </div>
        </Modal>
      )}

      {transactionReceipt && (
        <TransactionReceiptModal
          title={transactionReceipt.title}
          reference={transactionReceipt.reference}
          amount={transactionReceipt.amount}
          onClose={() => setTransactionReceipt(null)}
        />
      )}
    </>
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
