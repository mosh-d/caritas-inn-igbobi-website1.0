import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoClose, IoFilter, IoCalendarOutline } from "react-icons/io5";
import Button from "../components/shared/Button";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import RoomAssignmentPicker from "../components/shared/RoomAssignmentPicker";
import ContactRow from "../components/shared/ContactRow";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import { btn, field, table } from "../components/shared/ui";
import { useWebSocketContext } from "../context/WebSocketContext";
import {
  fetchReservations,
  fetchReservationById,
  updateReservation,
  cancelReservationById,
  markNoShow,
  undoNoShow,
  undoExpiredHold,
  confirmReservationById,
  emergencyCheckout,
  buildReservationsExportUrl,
  checkInReservation,
  assignRoom,
  checkOutReservation,
  extendStay,
} from "../utils/reservations-pms-api";
import { fetchFolios, createFolio, fetchDeposits, recordDeposit, applyDeposit, refundDeposit } from "../utils/folios-api";

const STATUSES = ["hold", "confirmed", "active", "completed", "cancelled"];
const BRANCH_ID = 3; // Caritas Inn Igbobi branch ID
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A");
const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function AdminReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noShowOnly, setNoShowOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reservationFolio, setReservationFolio] = useState(null);
  const [editFields, setEditFields] = useState({ special_requests: "", total_rate: "", discount_mode: "percentage", discount: "" });
  // Tracks which reservation the Discount field's value currently applies
  // to, so a not-yet-saved discount survives closing and reopening the SAME
  // reservation (e.g. flicking over to Folios and back) without leaking
  // into a DIFFERENT reservation opened afterward.
  const lastEditedReservationIdRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [creatingFolio, setCreatingFolio] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportStatuses, setExportStatuses] = useState({ active: true, confirmed: true });

  const [assigningRoom, setAssigningRoom] = useState(false);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [extending, setExtending] = useState(false);
  // Live-tracks the Room Assignments picker's current (possibly-unsaved)
  // slots — reported up via onSlotsChange so Confirm can tell whether
  // "Save Room Assignments" still needs to be clicked first.
  const [pendingRoomSlots, setPendingRoomSlots] = useState([]);

  const EMPTY_DEPOSIT_FORM = { amount: "", payment_method: "cash", receipt_number: "", notes: "" };
  const [deposits, setDeposits] = useState([]);
  const [depositForm, setDepositForm] = useState(EMPTY_DEPOSIT_FORM);
  const [recordingDeposit, setRecordingDeposit] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositActionLoading, setDepositActionLoading] = useState(null);

  // Shown right after recording a deposit so the reference number is on
  // screen long enough to write down or copy — not an auto-fading toast.
  const [transactionReceipt, setTransactionReceipt] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmError, setConfirmError] = useState("");
  const [modalError, setModalError] = useState("");
  const [showEarlyCheckoutConfirm, setShowEarlyCheckoutConfirm] = useState(false);
  const [earlyCheckoutError, setEarlyCheckoutError] = useState("");

  const loadReservations = useCallback(async () => {
    // TEMP DIAGNOSTIC — remove once the "reloads every few seconds" report is
    // root-caused. Prints exactly what called this, so if it's firing on a
    // timer we can see it's not from anywhere in this file/its websocket sub.
    console.trace('[AdminReservations] loadReservations() called');
    try {
      setLoading(true);
      const params = { page, limit };
      if (statusFilter !== "all") params.status = statusFilter;
      if (sourceFilter.trim()) params.source = sourceFilter.trim();
      if (channelFilter.trim()) params.booking_channel = channelFilter.trim();
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      if (noShowOnly) params.is_no_show = true;

      const result = await fetchReservations(params);
      setReservations(result.data || []);
      setTotalPages(result.totalPages || 1);
      setError(null);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load reservations.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sourceFilter, channelFilter, startDate, endDate, noShowOnly]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => setPage(1), [statusFilter, sourceFilter, channelFilter, startDate, endDate, noShowOnly]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { subscribe, isConnected } = useWebSocketContext();
  useEffect(() => subscribe(loadReservations, "reservations"), [subscribe, loadReservations]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart) so a page left open recovers instead of sitting on a load
  // failure or stale data. Same pattern as AdminOverview.jsx/AdminRooms.jsx.
  useEffect(() => {
    if (!isConnected) return;
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const openDetail = async (reservation) => {
    setDetailLoading(true);
    setReservationFolio(null);
    setDeposits([]);
    setDepositForm(EMPTY_DEPOSIT_FORM);
    setDepositError("");
    setModalError("");
    try {
      const [full, folioResult, depositsResult] = await Promise.all([
        fetchReservationById(reservation.id),
        fetchFolios({ reservation_id: reservation.id }),
        fetchDeposits({ reservation_id: reservation.id }),
      ]);
      setSelectedReservation(full);

      const folio = (folioResult.data && folioResult.data[0]) || null;
      // Discount is a one-shot calculator, not a persisted field — normally
      // starts blank/0% so it doesn't imply a discount is already applied.
      // Exception: reopening the SAME reservation (without a folio yet)
      // keeps whatever was there, re-derived against the freshly-loaded
      // base rate rather than the stale total_rate, so the two fields never
      // show something inconsistent with each other.
      setEditFields((prev) => {
        const keepDiscount =
          lastEditedReservationIdRef.current === full.id && !folio && Number(prev.discount || 0) > 0;

        if (!keepDiscount) {
          return {
            special_requests: full.special_requests || "",
            total_rate: full.total_rate ?? "",
            check_in: full.check_in ? new Date(full.check_in).toISOString().split("T")[0] : "",
            discount_mode: "percentage",
            discount: "",
          };
        }

        const nights = Math.max(1, Math.ceil((new Date(full.check_out) - new Date(full.check_in)) / (1000 * 60 * 60 * 24)));
        const baseTotal = Number(full.room_type?.base_rate || 0) * Number(full.rooms_booked || 1) * nights;
        const discountValue = Number(prev.discount || 0);
        const discountAmount = prev.discount_mode === "percentage" ? baseTotal * (discountValue / 100) : discountValue;

        return {
          special_requests: full.special_requests || "",
          total_rate: Math.max(baseTotal - discountAmount, 0),
          check_in: full.check_in ? new Date(full.check_in).toISOString().split("T")[0] : "",
          discount_mode: prev.discount_mode,
          discount: prev.discount,
        };
      });
      lastEditedReservationIdRef.current = full.id;

      setReservationFolio(folio);
      setDeposits(Array.isArray(depositsResult) ? depositsResult : []);
      setPendingRoomSlots((full.room_assignments || []).map((ra) => ra.room_number));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load reservation.") + " Please refresh the page.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Lets other pages (Room Chart) deep-link straight to one reservation's
  // detail view, e.g. /admin/reservations?reservation_id=123 — clicking a
  // "hold" bar there routes here since Confirm is what a receptionist
  // usually needs to do next, and it's right there in this modal's footer.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("reservation_id");
    if (id) {
      openDetail({ id: Number(id) });
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeDetail = () => {
    setSelectedReservation(null);
    setReservationFolio(null);
    setDeposits([]);
    setDepositForm(EMPTY_DEPOSIT_FORM);
    setDepositError("");
    setModalError("");
    setShowEarlyCheckoutConfirm(false);
    setEarlyCheckoutError("");
    setPendingRoomSlots([]);
  };

  const openCancelModal = (reservation) => {
    setCancelTarget(reservation);
    setCancelReason("");
    setCancelError("");
    setIsCancelOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelOpen(false);
    setCancelTarget(null);
    setCancelReason("");
    setCancelError("");
  };

  const openConfirmModal = (reservation) => {
    setConfirmTarget(reservation);
    setConfirmError("");
  };

  const closeConfirmModal = () => {
    setConfirmTarget(null);
    setConfirmError("");
  };

  // Shared by handleSaveEdit and handleQuickConfirm — Confirm used to only
  // ever send the reservation ID, never these in-progress field values, so
  // editing Total Rate and then clicking Confirm (instead of Save Changes
  // first) silently discarded the edit. Both actions now build the same
  // payload so Confirm can persist a pending edit before it disappears.
  const buildReservationUpdatePayload = () => {
    const updatePayload = {
      special_requests: editFields.special_requests,
    };
    // Total Rate is read-only once a folio exists (see the field below) —
    // don't send it in that case, since it no longer reflects anything
    // that's actually still editable from here.
    if (!reservationFolio) {
      updatePayload.total_rate = editFields.total_rate === "" ? null : Number(editFields.total_rate);
    }
    if (editFields.check_in && !selectedReservation?.actual_check_in) {
      updatePayload.check_in = editFields.check_in;
    }
    return updatePayload;
  };

  const handleSaveEdit = async () => {
    if (!selectedReservation) return;
    try {
      setSaving(true);
      await updateReservation(selectedReservation.id, buildReservationUpdatePayload());
      setSuccessMessage("Reservation updated.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadReservations();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to update reservation.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      setActionLoading(true);
      await cancelReservationById(cancelTarget.id, cancelReason);
      setSuccessMessage("Reservation cancelled.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeCancelModal();
      if (selectedReservation?.id === cancelTarget.id) closeDetail();
      loadReservations();
    } catch (err) {
      setCancelError(err.response?.data?.message || "Failed to cancel reservation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickConfirm = async () => {
    if (!confirmTarget) return;
    try {
      setConfirmingId(confirmTarget.id);
      // If Confirm was opened from the currently-open detail modal, there
      // may be an unsaved Total Rate / Special Requests edit sitting in
      // editFields — persist it first so it's never silently lost.
      if (selectedReservation?.id === confirmTarget.id) {
        await updateReservation(confirmTarget.id, buildReservationUpdatePayload());
      }
      await confirmReservationById(confirmTarget.id);
      setSuccessMessage("Reservation confirmed.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeConfirmModal();
      if (selectedReservation?.id === confirmTarget.id) closeDetail();
      loadReservations();
    } catch (err) {
      setConfirmError(err.response?.data?.message || "Failed to confirm reservation.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleToggleNoShow = async () => {
    if (!selectedReservation) return;
    try {
      setActionLoading(true);
      if (selectedReservation.is_no_show) {
        await undoNoShow(selectedReservation.id);
      } else {
        await markNoShow(selectedReservation.id);
      }
      setSuccessMessage("Reservation updated.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadReservations();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to update no-show status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReclaimExpiredHold = async () => {
    if (!selectedReservation) return;
    try {
      setActionLoading(true);
      await undoExpiredHold(selectedReservation.id);
      setSuccessMessage("Hold reclaimed — room re-reserved for this guest.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadReservations();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to reclaim hold.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFolio = async () => {
    if (!selectedReservation) return;
    try {
      setCreatingFolio(true);
      await createFolio({
        reservation_id: selectedReservation.id,
        guest_id: selectedReservation.guest_id || selectedReservation.guest?.id,
      });
      const folioResult = await fetchFolios({ reservation_id: selectedReservation.id });
      setReservationFolio((folioResult.data && folioResult.data[0]) || null);
      setSuccessMessage("Folio created.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to create folio.");
    } finally {
      setCreatingFolio(false);
    }
  };

  const handleRecordDeposit = async () => {
    if (!selectedReservation) return;
    setDepositError("");
    const amount = Number(depositForm.amount);
    if (!amount || amount <= 0) { setDepositError("Enter a valid amount."); return; }
    try {
      setRecordingDeposit(true);
      const result = await recordDeposit({ reservation_id: selectedReservation.id, amount, payment_method: depositForm.payment_method, receipt_number: depositForm.receipt_number || null, notes: depositForm.notes || null });
      const [deps, folioResult] = await Promise.all([
        fetchDeposits({ reservation_id: selectedReservation.id }),
        fetchFolios({ reservation_id: selectedReservation.id }),
      ]);
      setDeposits(Array.isArray(deps) ? deps : []);
      setReservationFolio((folioResult.data && folioResult.data[0]) || null);
      setDepositForm(EMPTY_DEPOSIT_FORM);
      setTransactionReceipt({
        title: "Deposit Recorded",
        reference: result.deposit_reference,
        amount: money(result.amount),
      });
    } catch (err) {
      setDepositError(err.response?.data?.message || "Failed to record deposit.");
    } finally {
      setRecordingDeposit(false);
    }
  };

  const handleApplyDeposit = async (depositId) => {
    try {
      setDepositActionLoading(depositId);
      await applyDeposit(depositId);
      const [deps, folioResult] = await Promise.all([
        fetchDeposits({ reservation_id: selectedReservation.id }),
        fetchFolios({ reservation_id: selectedReservation.id }),
      ]);
      setDeposits(Array.isArray(deps) ? deps : []);
      setReservationFolio((folioResult.data && folioResult.data[0]) || null);
    } catch (err) {
      setDepositError(err.response?.data?.message || "Failed to apply deposit.");
    } finally {
      setDepositActionLoading(null);
    }
  };

  const handleRefundDeposit = async (depositId) => {
    try {
      setDepositActionLoading(depositId);
      await refundDeposit(depositId);
      const deps = await fetchDeposits({ reservation_id: selectedReservation.id });
      setDeposits(Array.isArray(deps) ? deps : []);
    } catch (err) {
      setDepositError(err.response?.data?.message || "Failed to refund deposit.");
    } finally {
      setDepositActionLoading(null);
    }
  };

  const handleEarlyCheckout = async () => {
    if (!selectedReservation) return;
    try {
      setActionLoading(true);
      setEarlyCheckoutError("");
      await emergencyCheckout(selectedReservation.id);
      setSuccessMessage("Early checkout processed. Room released back to availability.");
      setTimeout(() => setSuccessMessage(""), 5000);
      setShowEarlyCheckoutConfirm(false);
      closeDetail();
      loadReservations();
    } catch (err) {
      setEarlyCheckoutError(err.response?.data?.message || "Failed to process early checkout.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedReservation) return;
    try {
      setActionLoading(true);
      const checkedInId = selectedReservation.id;
      await checkInReservation(checkedInId);
      closeDetail();
      loadReservations();
      // Straight to the folio so staff can record payment right away —
      // covers a hold that was paid but never recorded, or a guest paying
      // now at the front desk.
      navigate(`/admin/folios?reservation_id=${checkedInId}`);
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to check in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedReservation) return;
    try {
      setActionLoading(true);
      await checkOutReservation(selectedReservation.id);
      setSuccessMessage("Guest checked out.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadReservations();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to check out.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRoom = async (roomNumbers) => {
    if (!selectedReservation) return;
    try {
      setAssigningRoom(true);
      await assignRoom(selectedReservation.id, roomNumbers);
      const full = await fetchReservationById(selectedReservation.id);
      setSelectedReservation(full);
      loadReservations();
      setSuccessMessage("Room assignments saved.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to assign room.");
    } finally {
      setAssigningRoom(false);
    }
  };

  const handleExtendStay = async () => {
    if (!selectedReservation || !newCheckOutDate) return;
    try {
      setExtending(true);
      await extendStay(selectedReservation.id, newCheckOutDate);
      setSuccessMessage("Stay extended.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadReservations();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to extend stay.");
    } finally {
      setExtending(false);
    }
  };

  const handleExport = () => {
    const statuses = Object.keys(exportStatuses).filter((s) => exportStatuses[s]);
    const url = buildReservationsExportUrl({
      branchId: BRANCH_ID,
      statuses,
      startDate: exportStartDate,
      endDate: exportEndDate,
    });
    window.location.href = url;
    setIsExportOpen(false);
  };

  const res = selectedReservation;
  const canModify = res && res.status !== "cancelled" && res.status !== "completed";
  // Same rule the backend now enforces on extendStay — don't let a stay that
  // already owes money get pushed further out before it's settled.
  const hasOutstandingBalance = Boolean(reservationFolio) && Number(reservationFolio.balance) > 0;
  // Read-only display for the Details section — sourced from the Deposits
  // ledger below rather than the free-editable field it used to be, since
  // that let staff overwrite the running total the ledger maintains
  // (recordDeposit adds to reservation.deposit_amount server-side; a manual
  // edit here would silently corrupt that running total instead of
  // replacing it). Refunded deposits no longer count as held.
  const depositsTotal = deposits
    .filter((d) => d.status !== "refunded")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // Base total the Discount field below is calculated against — the same
  // base_rate × rooms × nights formula the backend falls back to when no
  // override is set. Only relevant pre-folio, same as Total Rate itself.
  const discountNights = res
    ? Math.max(1, Math.ceil((new Date(res.check_out) - new Date(editFields.check_in || res.check_in)) / (1000 * 60 * 60 * 24)))
    : 1;
  const discountBaseTotal = res
    ? Number(res.room_type?.base_rate || 0) * Number(res.rooms_booked || 1) * discountNights
    : 0;

  // Discount is a one-shot calculator, not a persisted field — touching it
  // recomputes Total Rate from the base total every time, so it always
  // reflects "base minus this discount" rather than compounding on top of
  // whatever was already typed there.
  const handleDiscountChange = (patch) => {
    const nextFields = { ...editFields, ...patch };
    const value = Number(nextFields.discount || 0);
    const discountAmount = nextFields.discount_mode === "percentage" ? discountBaseTotal * (value / 100) : value;
    nextFields.total_rate = Math.max(discountBaseTotal - discountAmount, 0);
    setEditFields(nextFields);
  };

  // Confirm used to only ever send the reservation ID — an amount typed
  // into the deposit form without clicking "Record Deposit", or a room
  // number typed into the picker without clicking "Save Room Assignments",
  // would just be silently lost the moment Confirm ran. Both are now
  // required to be resolved (recorded/saved, or cleared) before Confirm is
  // clickable at all. Rooms must also actually be assigned (not just have
  // no dangling unsaved edit) — now that room numbers are the real source
  // of truth for occupancy, a confirmed reservation with no room assigned
  // is exactly the gap that used to let a reservation slip through to
  // check-in with no room number at all.
  const hasUnsavedDeposit = Boolean(depositForm.amount);
  const savedRoomNumbers = (res?.room_assignments || []).map((ra) => ra.room_number);
  const roomsBookedCount = Number(res?.rooms_booked || 1);
  const hasUnsavedRoomAssignment =
    pendingRoomSlots.length !== savedRoomNumbers.length ||
    pendingRoomSlots.some((v, i) => v !== savedRoomNumbers[i]);
  const roomAssignmentIncomplete = savedRoomNumbers.length < roomsBookedCount;
  const confirmBlockedReason = res?.is_no_show
    ? "This reservation is marked as no-show — undo the no-show first if the guest still needs this booking honored."
    : res?.is_expired_hold
    ? "This hold expired and its room was released — reclaim the hold first if the guest still wants this booking."
    : hasUnsavedDeposit
      ? "Record the deposit (or clear the amount field) before confirming."
      : hasUnsavedRoomAssignment
        ? "Save the room assignment changes (or revert them) before confirming."
        : roomAssignmentIncomplete
          ? `Assign a room number to all ${roomsBookedCount} room(s) before confirming.`
          : null;

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

      <div data-component="AdminReservations" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <PageHeading icon={IoCalendarOutline}>Reservations</PageHeading>

          <div className="flex items-center gap-3">
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`bg-white border-1 border-gray-300 rounded-3xl py-2.5 px-6 flex items-center gap-2`}
                title="Filter"
              >
                <IoFilter size={22} /> Filters
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-[28rem] bg-white border border-[color:var(--text-color)]/15 rounded-xl shadow-xl z-20 text-xl overflow-hidden font-primary p-6 flex flex-col gap-5">
                  <div>
                    <p className="text-lg font-bold text-[color:var(--text-color)]/84 uppercase tracking-widest mb-3">Status</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["all", ...STATUSES].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`py-2 rounded-lg text-lg capitalize cursor-pointer transition-all ${statusFilter === s ? "bg-[color:var(--emphasis)] text-white font-bold" : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={field.input} />
                    <input type="text" placeholder="Booking Channel" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className={field.input} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field.input} />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field.input} />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer text-lg">
                    <input type="checkbox" checked={noShowOnly} onChange={(e) => setNoShowOnly(e.target.checked)} className="w-5 h-5 accent-[var(--emphasis)] cursor-pointer" />
                    No-shows only
                  </label>
                </div>
              )}
            </div>
            <button onClick={() => setIsExportOpen(true)} className={btn.primary}>Export</button>
          </div>
        </div>

        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Guest</th>
                  <th className={`${table.th} hidden md:table-cell`}>Check-In</th>
                  <th className={`${table.th} hidden md:table-cell`}>Check-Out</th>
                  <th className={table.th}>Status</th>
                  <th className={`${table.th} hidden md:table-cell`}>Source</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : error ? (
                  <tr><td colSpan="6" className="px-8 py-10 text-center text-red-600 text-xl">{error}</td></tr>
                ) : reservations.length === 0 ? (
                  <tr><td colSpan="6" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No reservations match filter.</td></tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.id} className={table.row}>
                      <td className={`${table.td} font-medium`}>
                        <div className="flex items-center gap-3">
                          {r.guest_name}
                          {r.is_no_show && (
                            <span className="text-sm font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">No-Show</span>
                          )}
                          {r.is_expired_hold && (
                            <span className="text-sm font-bold uppercase tracking-wide text-orange-700 bg-orange-100 px-2 py-1 rounded-full whitespace-nowrap">Hold Expired</span>
                          )}
                          {r.guest?.is_blacklisted && (
                            <span className="text-sm font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">Blacklisted</span>
                          )}
                        </div>
                        <div className="text-base text-[color:var(--text-color)]/68">{r.booking_reference}</div>
                      </td>
                      <td className={`${table.td} hidden md:table-cell`}>{formatDate(r.check_in)}</td>
                      <td className={`${table.td} hidden md:table-cell`}>{formatDate(r.check_out)}</td>
                      <td className={table.td}><StatusBadge status={r.status} /></td>
                      <td className={`${table.td} hidden md:table-cell capitalize`}>{r.source || "N/A"}</td>
                      <td className={table.td}>
                        <div className={table.actions}>
                          {/* No row-level quick-confirm anymore — confirming
                              now requires rooms to already be assigned (see
                              confirmReservation's mandate), and this list has
                              no room picker to fix that from. "View" opens
                              the detail modal, which has both the Room
                              Assignments picker and its own gated Confirm. */}
                          <button onClick={() => openDetail(r)} className={btn.rowPrimary}>View</button>
                          {(r.status === "hold" || r.status === "confirmed") && (
                            <button onClick={() => openCancelModal(r)} className={btn.rowDanger}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 w-full mt-6">
          {totalPages > 1 && (
            <>
              <Button variant="emphasis" onClick={() => setPage(page - 1)} disabled={page === 1} className={page === 1 ? "opacity-30 cursor-not-allowed" : ""}>Previous</Button>
              <span className="text-lg font-medium">Page {page} of {totalPages}</span>
              <Button variant="emphasis" onClick={() => setPage(page + 1)} disabled={page === totalPages} className={page === totalPages ? "opacity-30 cursor-not-allowed" : ""}>Next</Button>
            </>
          )}
        </div>
      </div>

      {/* ==== Reservation Detail Modal ==== */}
      {(res || detailLoading) && (
        <Modal
          onClose={closeDetail}
          loading={detailLoading || !res}
          title={res?.guest_name || ""}
          subtitle={res ? `Booking Ref: ${res.booking_reference || res.id}` : ""}
          badge={res && (
            <span className="flex items-center gap-2">
              <StatusBadge status={res.status} />
              {res.is_no_show && (
                <span className="inline-block px-3 py-1 rounded-full text-lg font-bold leading-tight whitespace-nowrap bg-red-100 text-red-700">No-Show</span>
              )}
              {res.is_expired_hold && (
                <span className="inline-block px-3 py-1 rounded-full text-lg font-bold leading-tight whitespace-nowrap bg-orange-100 text-orange-700">Hold Expired</span>
              )}
            </span>
          )}
          size="lg"
          footer={res && (
            <>
              <button onClick={closeDetail} className={btn.secondary}>Close</button>
              <button
                onClick={() => navigate(`/admin/folios?reservation_id=${res.id}`)}
                disabled={!reservationFolio}
                className={btn.secondary}
                title={!reservationFolio ? "No folio linked to this reservation yet" : undefined}
              >
                Go to Folio
              </button>
              {res.status === "hold" && (
                <button
                  onClick={() => openConfirmModal(res)}
                  disabled={confirmingId === res.id || Boolean(confirmBlockedReason)}
                  title={confirmBlockedReason || undefined}
                  className={btn.success}
                >
                  {confirmingId === res.id ? "Confirming..." : "Confirm"}
                </button>
              )}
              {(res.status === "hold" || res.status === "confirmed") && (
                <button onClick={() => openCancelModal(res)} className={btn.danger}>Cancel</button>
              )}
              {canModify && (
                <button onClick={handleToggleNoShow} disabled={actionLoading} className={btn.secondary}>
                  {res.is_no_show ? "Undo No-Show" : "Mark No-Show"}
                </button>
              )}
              {canModify && res.is_expired_hold && (
                <button onClick={handleReclaimExpiredHold} disabled={actionLoading} className={btn.secondary}>
                  Reclaim Hold
                </button>
              )}
              {canModify && (
                <button onClick={() => setShowEarlyCheckoutConfirm(true)} disabled={actionLoading} className={btn.danger}>Early Checkout</button>
              )}
              {!res.actual_check_in && canModify && (
                res.status === "confirmed" && !res.is_no_show ? (
                  <button onClick={handleCheckIn} disabled={actionLoading} className={btn.success}>Check In</button>
                ) : (
                  <button
                    disabled
                    title={res.is_no_show ? "Marked as no-show — undo the no-show first if the guest is actually here" : "Awaiting payment — confirm reservation first"}
                    className={btn.success}
                  >
                    Check In
                  </button>
                )
              )}
              {res.actual_check_in && !res.actual_check_out && (
                <button onClick={handleCheckOut} disabled={actionLoading} className={btn.success}>Check Out</button>
              )}
              <button onClick={handleSaveEdit} disabled={saving} className={btn.primary}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        >
          {detailLoading || !res ? (
            <LoadingSpinner size="lg" />
          ) : (
            <>
              {modalError && (
                <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{modalError}</p>
              )}

              {/* Stay summary */}
              <div className="grid grid-cols-1 gap-4">
                <InfoCard label="Check-In" value={formatDate(res.check_in)} />
                <InfoCard label="Check-Out" value={formatDate(res.check_out)} />
                <InfoCard label="Rooms" value={res.rooms_booked} />
                <InfoCard label="Source" value={res.source || "N/A"} capitalize />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 gap-4">
                <ContactRow type="email" value={res.guest_email} />
                <ContactRow type="phone" value={res.phone_number} />
              </div>

              {/* Editable fields */}
              <section className="flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Details</h3>
                <div className="flex flex-col gap-2">
                  <label className={field.label}>Special Requests</label>
                  <textarea
                    value={editFields.special_requests}
                    onChange={(e) => setEditFields({ ...editFields, special_requests: e.target.value })}
                    className={field.textarea}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Total Rate (₦)</label>
                    {reservationFolio ? (
                      // Once a folio exists, the accommodation charge it was
                      // seeded with at confirmation time is already posted —
                      // editing this field wouldn't retroactively adjust that
                      // charge, so showing it as editable here would be
                      // misleading. Use Folios (add a charge/adjustment) to
                      // correct an already-posted amount instead.
                      <div className={`${field.input} bg-[color:var(--text-color)]/3 flex items-center`} title="A folio already exists — this no longer changes the posted accommodation charge. Adjust it from Folios instead.">
                        {money(editFields.total_rate)}
                      </div>
                    ) : (
                      <>
                        <input type="number" value={editFields.total_rate} onChange={(e) => setEditFields({ ...editFields, total_rate: e.target.value })} className={field.input} />
                        {Number(editFields.discount || 0) > 0 && (
                          <p className="text-base text-[color:var(--text-color)]/60">
                            Base {money(discountBaseTotal)} − {editFields.discount_mode === "percentage" ? `${editFields.discount}%` : money(editFields.discount)} discount
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Total Deposited (₦)</label>
                    <div className={`${field.input} bg-[color:var(--text-color)]/3 flex items-center`} title="Set automatically from the Deposits ledger below — record an actual deposit there, not here.">
                      {money(depositsTotal)}
                    </div>
                  </div>
                  {!reservationFolio && (
                    <div className="flex flex-col gap-2">
                      <label className={field.label}>Discount ({editFields.discount_mode === "percentage" ? "%" : "₦"})</label>
                      <div className="flex flex-col gap-2">
                        <select
                          value={editFields.discount_mode}
                          onChange={(e) => handleDiscountChange({ discount_mode: e.target.value })}
                          className={`${field.select} w-auto`}
                        >
                          <option value="fixed">Fixed (₦)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                        <input
                          type="number"
                          value={editFields.discount}
                          onChange={(e) => handleDiscountChange({ discount: e.target.value })}
                          className={field.input}
                        />
                      </div>
                    </div>
                  )}
                  {!res.actual_check_in && (
                    <div className="flex flex-col gap-2">
                      <label className={field.label}>Check-In Date</label>
                      <input
                        type="date"
                        value={editFields.check_in}
                        onChange={(e) => setEditFields({ ...editFields, check_in: e.target.value })}
                        className={field.input}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Folio */}
              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Folio</h3>
                {reservationFolio ? (
                  <div className="flex justify-between items-center bg-[color:var(--text-color)]/3 border-1 border-gray-200 rounded-lg px-5 py-4 text-xl">
                    <span className="font-medium">
                      {reservationFolio.folio_number}
                      <span className="text-[color:var(--text-color)]/68 ml-3">Balance: {money(reservationFolio.balance)}</span>
                    </span>
                    <StatusBadge status={reservationFolio.status} />
                  </div>
                ) : (
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <p className="text-xl text-[color:var(--text-color)]/76">No folio linked to this reservation.</p>
                    <button onClick={handleCreateFolio} disabled={creatingFolio} className={btn.rowPrimary}>
                      {creatingFolio ? "Creating..." : "Create Folio"}
                    </button>
                  </div>
                )}
              </section>

              {/* Deposits */}
              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Deposits</h3>
                {deposits.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {deposits.map((dep) => (
                      <div key={dep.id} className="flex items-center justify-between bg-[color:var(--text-color)]/3 rounded-lg px-5 py-4 gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-base text-[color:var(--text-color)]/68 font-mono">
                            {dep.deposit_reference}{dep.receipt_number && <> · Receipt #{dep.receipt_number}</>} · {formatDate(dep.deposit_date)}
                          </span>
                          <span className="text-xl font-medium">
                            {money(dep.amount)} · <span className="capitalize">{dep.payment_method}</span>
                            {dep.notes && <span className="text-[color:var(--text-color)]/68 ml-2">— {dep.notes}</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-nowrap">
                          <StatusBadge status={dep.status} />
                          {dep.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApplyDeposit(dep.id)}
                                disabled={depositActionLoading === dep.id || !reservationFolio}
                                className={btn.rowSuccess}
                                title={!reservationFolio ? "No folio linked — confirm reservation first" : "Apply to folio"}
                              >
                                {depositActionLoading === dep.id ? "..." : "Apply"}
                              </button>
                              <button
                                onClick={() => handleRefundDeposit(dep.id)}
                                disabled={depositActionLoading === dep.id}
                                className={btn.rowDanger}
                              >
                                {depositActionLoading === dep.id ? "..." : "Refund"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {depositError && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{depositError}</p>}
                {canModify && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>New Deposit Amount (₦)</label>
                        <input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} className={field.input} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Method</label>
                        <select value={depositForm.payment_method} onChange={(e) => setDepositForm({ ...depositForm, payment_method: e.target.value })} className={field.select}>
                          {["cash", "card", "transfer", "pos", "online"].map((m) => (
                            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className={field.label}>Receipt Number</label>
                        <input type="text" placeholder="e.g. from the receipt book" value={depositForm.receipt_number} onChange={(e) => setDepositForm({ ...depositForm, receipt_number: e.target.value })} className={field.input} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={field.label}>Notes (optional)</label>
                      <input type="text" value={depositForm.notes} onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })} className={field.input} />
                    </div>
                    <button onClick={handleRecordDeposit} disabled={recordingDeposit || !depositForm.amount} className={`${btn.primary} self-start`}>
                      {recordingDeposit ? "Recording..." : "Record Deposit"}
                    </button>
                  </div>
                )}
              </section>

              {/* Room Assignments */}
              {canModify && (
                <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                  <h3 className="text-2xl font-bold text-[color:var(--black)]">Room Assignments</h3>
                  <RoomAssignmentPicker
                    reservationId={res.id}
                    roomsBooked={res.rooms_booked}
                    initialRoomNumbers={(res.room_assignments || []).map((ra) => ra.room_number)}
                    onSave={handleAssignRoom}
                    saving={assigningRoom}
                    onSlotsChange={setPendingRoomSlots}
                  />
                </section>
              )}

              {/* Extend Stay */}
              {res.actual_check_in && !res.actual_check_out && (
                <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                  <h3 className="text-2xl font-bold text-[color:var(--black)]">Extend Stay</h3>
                  <div className="flex gap-3 flex-nowrap items-center">
                    <input type="date" value={newCheckOutDate} onChange={(e) => setNewCheckOutDate(e.target.value)} className={field.input} />
                    <button
                      onClick={handleExtendStay}
                      disabled={extending || !newCheckOutDate || hasOutstandingBalance}
                      className={`${btn.primary} whitespace-nowrap`}
                      title={hasOutstandingBalance ? "Settle the outstanding balance before extending the stay" : undefined}
                    >
                      {extending ? "Extending..." : "Extend"}
                    </button>
                    {hasOutstandingBalance && (
                      <span className="text-lg text-orange-600">Settle the outstanding balance before extending this stay.</span>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ==== Cancel Confirmation Modal ==== */}
      {isCancelOpen && (
        <Modal
          onClose={closeCancelModal}
          title={`Cancel ${cancelTarget?.guest_name || "Reservation"}?`}
          subtitle="This releases the held room back to availability."
          size="sm"
          zIndex={1100}
          footer={
            <>
              <button onClick={closeCancelModal} disabled={actionLoading} className={btn.secondary}>Back</button>
              <button onClick={handleCancel} disabled={actionLoading} className={btn.dangerSolid}>
                {actionLoading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </>
          }
        >
          {cancelError && (
            <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{cancelError}</p>
          )}
          <p className="text-xl text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            Are you sure you want to cancel this guest's reservation? Make sure to alert them about the cancellation if you think they might proceed to make payment.
          </p>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Reason (optional)</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={field.textarea} />
          </div>
        </Modal>
      )}

      {/* ==== Confirm Reservation Warning Modal ==== */}
      {confirmTarget && (
        <Modal
          onClose={closeConfirmModal}
          title={`Confirm ${confirmTarget.guest_name || "Reservation"}?`}
          subtitle="This creates the guest's folio and moves the reservation into Confirmed status."
          size="sm"
          zIndex={1100}
          footer={
            <>
              <button onClick={closeConfirmModal} disabled={confirmingId === confirmTarget.id} className={btn.secondary}>Back</button>
              <button onClick={handleQuickConfirm} disabled={confirmingId === confirmTarget.id} className={btn.success}>
                {confirmingId === confirmTarget.id ? "Confirming..." : "Yes, Confirm"}
              </button>
            </>
          }
        >
          {confirmError && (
            <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{confirmError}</p>
          )}
          <p className="text-xl text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            Have you confirmed the guest has made payment? The guest must pay before you can confirm their reservation.
          </p>
        </Modal>
      )}

      {/* ==== Early Checkout Warning Modal ==== */}
      {showEarlyCheckoutConfirm && res && (
        <Modal
          onClose={() => setShowEarlyCheckoutConfirm(false)}
          title={`Early Checkout — ${res.guest_name || "Reservation"}?`}
          subtitle="Immediately releases the room back to availability."
          size="sm"
          zIndex={1200}
          footer={
            <>
              <button onClick={() => setShowEarlyCheckoutConfirm(false)} disabled={actionLoading} className={btn.secondary}>Back</button>
              <button onClick={handleEarlyCheckout} disabled={actionLoading} className={btn.dangerSolid}>
                {actionLoading ? "Processing..." : "Yes, Check Out Early"}
              </button>
            </>
          }
        >
          {earlyCheckoutError && (
            <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{earlyCheckoutError}</p>
          )}
          <p className="text-xl text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            Are you sure you want to check this guest out early? This releases their room back to availability right away, even though their scheduled check-out date hasn't arrived yet — use this only for guests who are actually leaving now.
          </p>
        </Modal>
      )}

      {/* ==== Export Modal ==== */}
      {isExportOpen && (
        <Modal
          onClose={() => setIsExportOpen(false)}
          title="Export Reservations"
          subtitle="Download a CSV of reservations in the selected window."
          size="sm"
          zIndex={1100}
          footer={
            <>
              <button onClick={() => setIsExportOpen(false)} className={btn.secondary}>Cancel</button>
              <button onClick={handleExport} className={btn.primary}>Export CSV</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div className="flex flex-col gap-2">
              <label className={field.label}>Start Date</label>
              <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>End Date</label>
              <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className={field.input} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className={field.label}>Reservation Status</label>
            <div className="flex gap-8">
              {["active", "confirmed"].map((s) => (
                <label key={s} className="flex items-center gap-3 cursor-pointer text-xl capitalize">
                  <input
                    type="checkbox"
                    checked={exportStatuses[s]}
                    onChange={(e) => setExportStatuses({ ...exportStatuses, [s]: e.target.checked })}
                    className="w-6 h-6 accent-[var(--emphasis)] cursor-pointer"
                  />
                  {s}
                </label>
              ))}
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

function InfoCard({ label, value, capitalize }) {
  return (
    <div className="bg-[color:var(--text-color)]/5 border-1 border-gray-200 rounded-lg px-5 py-4">
      <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">{label}</p>
      <p className={`text-2xl font-bold text-[color:var(--black)] ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

