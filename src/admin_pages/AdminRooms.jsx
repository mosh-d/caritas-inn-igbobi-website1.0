import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { IoClose, IoBedOutline } from "react-icons/io5";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { btn, field, table } from "../components/shared/ui";
import { useWebSocketContext } from "../context/WebSocketContext";
import { canManageRoomPrices, getAuthHeaders } from "../utils/auth";
import { SERVER_BASE_URL } from "../utils/server-config";
import RoomStatusTag from "../components/shared/RoomStatusTag";

// ─── API Setup ────────────────────────────────────────────────────────────────

let API_BASE_URL = SERVER_BASE_URL;

// ─── Igbobi branch_id = 3 (Caritas Inn Igbobi) ───────────────────────────────
// Source of truth: auth.js, room-data.js, WebSocketContext.jsx all use BRANCH_ID = 4
const BRANCH_ID = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBaseUrl = () =>
  API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

const formatPrice = (price) =>
  Number(price).toLocaleString("en-NG", { minimumFractionDigits: 0 });

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

// ─── Add Room Modal ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  summary: "",
  amenities: "",
  adult_capacity: "",
  child_capacity: "",
  currency_symbol: "₦",
  base_rate: "",
  breakfast_rate: "0",
  max_capacity: "",
};

function AddRoomModal({ onClose, onSuccess, onError }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Basic validation
    if (
      !form.name ||
      !form.summary ||
      !form.amenities ||
      !form.adult_capacity ||
      !form.child_capacity ||
      !form.base_rate ||
      !form.max_capacity
    ) {
      onError("Please fill in all required fields.");
      return;
    }

    const payload = {
      branch_id: BRANCH_ID,
      name: form.name.trim(),
      summary: form.summary.trim(),
      amenities: form.amenities.trim(),
      adult_capacity: Number(form.adult_capacity),
      child_capacity: Number(form.child_capacity),
      currency_symbol: form.currency_symbol || "₦",
      base_rate: Number(form.base_rate),
      breakfast_rate: Number(form.breakfast_rate || 0),
      max_capacity: Number(form.max_capacity),
    };

    console.log("AdminRooms: Submitting new room type:", payload);
    setSubmitting(true);

    try {
      const res = await axios.post(`${getBaseUrl()}/api/rooms/type`, payload, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      console.log("AdminRooms: Add room response:", res.data);
      onSuccess(res.data?.message || "Room type added successfully!");
      onClose();
    } catch (err) {
      console.error("AdminRooms: Error adding room type:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      onError(
        err.response?.data?.message ||
          "Failed to add room type. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Add New Room Type"
      subtitle="Creates a bookable room category with its own rate and inventory."
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className={btn.primary}>
            {submitting ? "Adding..." : "Add Room"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className={field.label}>Room Type Name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Diplomatic Suite"
            className={field.input}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Summary *</label>
          <textarea
            name="summary"
            value={form.summary}
            onChange={handleChange}
            placeholder="Brief description of the room..."
            rows={3}
            className={field.textarea}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Amenities *</label>
          <input
            type="text"
            name="amenities"
            value={form.amenities}
            onChange={handleChange}
            placeholder="e.g. WiFi, AC, Jacuzzi, Breakfast, Smart TV"
            className={field.input}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Adult Capacity *</label>
            <input
              type="number"
              name="adult_capacity"
              value={form.adult_capacity}
              onChange={handleChange}
              min="1"
              placeholder="e.g. 2"
              className={field.input}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Child Capacity *</label>
            <input
              type="number"
              name="child_capacity"
              value={form.child_capacity}
              onChange={handleChange}
              min="0"
              placeholder="e.g. 2"
              className={field.input}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Currency Symbol</label>
            <input
              type="text"
              name="currency_symbol"
              value={form.currency_symbol}
              onChange={handleChange}
              placeholder="₦"
              className={field.input}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Room Rate/Price *</label>
            <input
              type="number"
              name="base_rate"
              value={form.base_rate}
              onChange={handleChange}
              min="0"
              placeholder="e.g. 85000"
              className={field.input}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Breakfast Price (₦)</label>
          <input
            type="number"
            name="breakfast_rate"
            value={form.breakfast_rate}
            onChange={handleChange}
            min="0"
            placeholder="e.g. 2000"
            className={field.input}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Max Capacity (no. of physical rooms) *</label>
          <input
            type="number"
            name="max_capacity"
            value={form.max_capacity}
            onChange={handleChange}
            min="1"
            placeholder="e.g. 5"
            className={field.input}
          />
        </div>

        {/* Allow Enter key to submit */}
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}

// ─── View / Edit Room Modal ────────────────────────────────────────────────────

function ViewRoomModal({
  room,
  onClose,
  onSuccess,
  onError,
  onRoomDeleted,
  onRefreshRoom,
  canManagePrices,
  initiallyExpandPhysicalRooms,
  highlightRoomInventoryId,
}) {
  const [priceInput, setPriceInput] = useState(String(room.base_rate ?? ""));
  const [breakfastPriceInput, setBreakfastPriceInput] = useState(String(room.breakfast_rate ?? "0"));
  const [capacityInput, setCapacityInput] = useState(
    String(room.max_capacity ?? "")
  );
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Reducing capacity can delete room_inventory rows outright (see
  // updateRoomCapacity on the backend) — confirm before firing, same as the
  // room-status confirmation below.
  const [confirmCapacityDecrease, setConfirmCapacityDecrease] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    summary: room.summary || "",
    amenities: room.amenities || "",
    adult_capacity: String(room.adult_capacity ?? ""),
    child_capacity: String(room.child_capacity ?? ""),
  });
  const [savingDetails, setSavingDetails] = useState(false);

  const [physicalRooms, setPhysicalRooms] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(null); // { roomInventoryId, roomNumber, newStatus }
  // Collapsed by default — a room type with many physical rooms otherwise
  // makes this modal scroll a long way before reaching Delete/Close. Deep
  // links from the Overview page's status banners force it open instead.
  const [physicalRoomsExpanded, setPhysicalRoomsExpanded] = useState(!!initiallyExpandPhysicalRooms);

  // Only shows the spinner on the true first load — a websocket-triggered
  // refresh (below) updates the list silently in the background instead of
  // flashing back to "loading" every time.
  const hasLoadedRoomStatusRef = useRef(false);
  // Scrolls the deep-linked room into view once its row exists in the DOM
  // (Physical Rooms is collapsed by default, so this only ever fires when
  // initiallyExpandPhysicalRooms forced it open).
  const highlightedRoomRef = useRef(null);
  useEffect(() => {
    if (highlightRoomInventoryId && highlightedRoomRef.current) {
      highlightedRoomRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightRoomInventoryId, physicalRooms]);
  const loadRoomStatusList = useCallback(async () => {
    if (!hasLoadedRoomStatusRef.current) setLoadingStatus(true);
    try {
      const res = await axios.get(`${getBaseUrl()}/api/rooms/status`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      const match = (res.data?.room_types || []).find((rt) => rt.room_type_id === room.room_type_id);
      setPhysicalRooms(match?.rooms || []);
      hasLoadedRoomStatusRef.current = true;
    } catch (err) {
      console.error("AdminRooms: Failed to load room status list:", err);
      setPhysicalRooms((prev) => prev ?? []);
    } finally {
      setLoadingStatus(false);
    }
  }, [room.room_type_id]);

  useEffect(() => {
    loadRoomStatusList();
  }, [loadRoomStatusList]);

  // Room numbers/status can arrive or change out from under an already-open
  // modal (another tab assigns a number, capacity changes elsewhere, a
  // reservation checks in) — re-fetch on the same 'rooms_updated' broadcast
  // every other room-aware page already listens for, instead of only ever
  // fetching once when the modal happens to open.
  const { subscribe: subscribeRoomStatus } = useWebSocketContext();
  useEffect(() => subscribeRoomStatus(loadRoomStatusList, "rooms"), [subscribeRoomStatus, loadRoomStatusList]);

  // Safety fetches after data update - ensures consistency
  const runSafetyFetches = async () => {
    console.log(`🔍 [ViewRoomModal] Starting safety fetches for room ${room.room_type_id}...`);

    // Lock UI during entire safety fetch period (6 seconds total)
    setRefreshing(true);
    console.log('🔒 [ViewRoomModal] UI locked - safety fetches in progress');

    // First refresh after 500ms (immediate)
    setTimeout(async () => {
      console.log(`🔄 [ViewRoomModal] First safety fetch for room ${room.room_type_id}...`);
      const freshData = await onRefreshRoom(room.room_type_id);
      if (freshData) {
        console.log(`✅ [ViewRoomModal] First safety fetch complete, updating capacity from ${capacityInput} to ${freshData.max_capacity}`);
        setCapacityInput(String(freshData.max_capacity ?? ""));
        setPriceInput(String(freshData.base_rate ?? ""));
        setBreakfastPriceInput(String(freshData.breakfast_rate ?? "0"));
      }
    }, 500);

    // Second refresh after 3s (ensure consistency)
    setTimeout(async () => {
      console.log(`🔄 [ViewRoomModal] Second safety fetch for room ${room.room_type_id}...`);
      const freshData = await onRefreshRoom(room.room_type_id);
      if (freshData) {
        console.log(`✅ [ViewRoomModal] Second safety fetch complete, updating capacity to ${freshData.max_capacity}`);
        setCapacityInput(String(freshData.max_capacity ?? ""));
        setPriceInput(String(freshData.base_rate ?? ""));
        setBreakfastPriceInput(String(freshData.breakfast_rate ?? "0"));
      }
    }, 3000);

    // Final refresh after 6s (ensure consistency) - then unlock UI
    setTimeout(async () => {
      console.log(`🔄 [ViewRoomModal] Final safety fetch for room ${room.room_type_id}...`);
      const freshData = await onRefreshRoom(room.room_type_id);
      if (freshData) {
        console.log(`✅ [ViewRoomModal] Final safety fetch complete, capacity confirmed as ${freshData.max_capacity}`);
        setCapacityInput(String(freshData.max_capacity ?? ""));
        setPriceInput(String(freshData.base_rate ?? ""));
        setBreakfastPriceInput(String(freshData.breakfast_rate ?? "0"));
      }

      // Unlock UI after all safety fetches complete
      setRefreshing(false);
      console.log('🔓 [ViewRoomModal] UI unlocked - safety fetches complete');
    }, 6000);
  };

  const handleUpdatePrice = async () => {
    if (!canManagePrices) {
      onError("Only managers can update room prices.");
      return;
    }

    const newPrice = Number(priceInput);
    if (isNaN(newPrice) || newPrice <= 0) {
      onError("Please enter a valid price.");
      return;
    }

    const newBreakfastPrice = Number(breakfastPriceInput);
    if (isNaN(newBreakfastPrice) || newBreakfastPrice < 0) {
      onError("Please enter a valid breakfast price.");
      return;
    }

    console.log(
      `AdminRooms: Updating price for room_type_id=${room.room_type_id} to ${newPrice} (breakfast ${newBreakfastPrice})`
    );
    setUpdatingPrice(true);

    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/price`,
        { room_type_id: room.room_type_id, new_price: newPrice, new_breakfast_price: newBreakfastPrice },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      console.log("AdminRooms: Update price response:", res.data);
      onSuccess(res.data?.message || "Price updated successfully!");
      // Run safety fetches to ensure data consistency instead of closing immediately
      runSafetyFetches();
    } catch (err) {
      console.error("AdminRooms: Error updating price:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      onError(
        err.response?.data?.message ||
          "Failed to update price. Please try again."
      );
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleUpdateCapacity = async () => {
    const newCapacity = Number(capacityInput);
    if (isNaN(newCapacity) || newCapacity < 1) {
      onError("Please enter a valid capacity (minimum 1).");
      return;
    }

    if (newCapacity < Number(room.max_capacity) && !confirmCapacityDecrease) {
      setConfirmCapacityDecrease(true);
      return;
    }
    setConfirmCapacityDecrease(false);

    console.log(
      `AdminRooms: Updating capacity for room_type_id=${room.room_type_id} to ${newCapacity}`
    );
    setUpdatingCapacity(true);

    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/capacity`,
        { room_type_id: room.room_type_id, new_capacity: newCapacity },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      console.log("AdminRooms: Update capacity response:", res.data);

      // Check for partial-success capacity warning in message
      const msg = res.data?.message || "";
      const isPartialSuccess =
        msg.toLowerCase().includes("warn") ||
        msg.toLowerCase().includes("flag") ||
        msg.toLowerCase().includes("auto-deletion");

      console.log(
        `AdminRooms: Capacity update result — partial success: ${isPartialSuccess}, message: ${msg}`
      );

      onSuccess(msg || "Capacity updated successfully!");
      // Run safety fetches to ensure data consistency instead of closing immediately
      runSafetyFetches();
    } catch (err) {
      console.error("AdminRooms: Error updating capacity:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      onError(
        err.response?.data?.message ||
          "Failed to update capacity. Please try again."
      );
    } finally {
      setUpdatingCapacity(false);
    }
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/type/${room.room_type_id}`,
        {
          summary: detailsForm.summary,
          amenities: detailsForm.amenities,
          adult_capacity: Number(detailsForm.adult_capacity),
          child_capacity: Number(detailsForm.child_capacity),
        },
        { headers: getAuthHeaders(), withCredentials: true },
      );
      onSuccess("Room details updated.");
      setEditingDetails(false);
      // Formatting happens server-side (lowercase, spaces->underscores) —
      // reflect the actual saved value, not the raw text just typed.
      if (res.data?.amenities !== undefined) {
        setDetailsForm((f) => ({ ...f, amenities: res.data.amenities }));
      }
      runSafetyFetches();
    } catch (err) {
      onError(err.response?.data?.message || "Failed to update room details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSetRoomStatus = async (roomInventoryId, roomNumber, newStatus, currentDisplayStatus) => {
    if (currentDisplayStatus === "occupied" && !confirmStatusChange) {
      setConfirmStatusChange({ roomInventoryId, roomNumber, newStatus });
      return;
    }
    setConfirmStatusChange(null);
    setStatusUpdatingId(roomInventoryId);
    try {
      await axios.patch(
        `${getBaseUrl()}/api/rooms/inventory/${roomInventoryId}/status`,
        { status: newStatus },
        { headers: getAuthHeaders(), withCredentials: true },
      );
      onSuccess(`Room ${roomNumber} marked ${newStatus.replace(/_/g, " ")}.`);
      await loadRoomStatusList();
    } catch (err) {
      onError(err.response?.data?.message || "Failed to update room status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    console.log(
      `AdminRooms: Deleting room type id=${room.room_type_id} (${room.room_type_name})`
    );
    setDeleting(true);

    try {
      const res = await axios.delete(
        `${getBaseUrl()}/api/rooms/type/${room.room_type_id}`,
        { headers: getAuthHeaders(), withCredentials: true }
      );
      console.log("AdminRooms: Delete room response:", res.data);
      onRoomDeleted(
        room.room_type_id,
        res.data?.message || "Room type deleted successfully!"
      );
      onClose();
    } catch (err) {
      console.error("AdminRooms: Error deleting room type:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      onError(
        err.response?.data?.message ||
          "Failed to delete room type. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={room.room_type_name}
      subtitle={`${room.available_rooms ?? "N/A"} room(s) currently available`}
      size="lg"
      footer={
        <>
          <button
            onClick={() => {
              console.log(
                `AdminRooms: Delete Room clicked for room_type_id=${room.room_type_id} (${room.room_type_name}) — showing confirmation dialog`
              );
              setConfirmDelete(true);
            }}
            disabled={deleting}
            className={`${btn.danger} mr-auto`}
          >
            Delete Room
          </button>
          <button onClick={onClose} className={btn.secondary}>Close</button>
        </>
      }
    >
      {/* Available Rooms is always live/computed — Adult/Child capacity, Summary,
          and Amenities are editable via updateRoomTypeDetails (previously
          settable only at creation time). */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Available Rooms" value={room.available_rooms ?? "N/A"} />
        <StatCard label="Adult Capacity" value={editingDetails ? "—" : room.adult_capacity ?? "N/A"} />
        <StatCard label="Child Capacity" value={editingDetails ? "—" : room.child_capacity ?? "N/A"} />
      </div>

      <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-[color:var(--black)]">Summary, Amenities & Capacity</h3>
          {!editingDetails && (
            <button onClick={() => setEditingDetails(true)} className={btn.secondary}>Edit</button>
          )}
        </div>

        {editingDetails ? (
          <>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Summary</label>
              <textarea
                value={detailsForm.summary}
                onChange={(e) => setDetailsForm({ ...detailsForm, summary: e.target.value })}
                className={field.textarea}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={field.label}>Amenities (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Free WiFi, AC, King Size Bed"
                value={detailsForm.amenities}
                onChange={(e) => setDetailsForm({ ...detailsForm, amenities: e.target.value })}
                className={field.input}
              />
              <p className="text-base text-[color:var(--text-color)]/60">
                Auto-formatted to match the public site's icon set — "Free WiFi" is saved as "free_wifi".
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={field.label}>Adult Capacity</label>
                <input
                  type="number"
                  min="0"
                  value={detailsForm.adult_capacity}
                  onChange={(e) => setDetailsForm({ ...detailsForm, adult_capacity: e.target.value })}
                  className={field.input}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={field.label}>Child Capacity</label>
                <input
                  type="number"
                  min="0"
                  value={detailsForm.child_capacity}
                  onChange={(e) => setDetailsForm({ ...detailsForm, child_capacity: e.target.value })}
                  className={field.input}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingDetails(false);
                  setDetailsForm({
                    summary: room.summary || "",
                    amenities: room.amenities || "",
                    adult_capacity: String(room.adult_capacity ?? ""),
                    child_capacity: String(room.child_capacity ?? ""),
                  });
                }}
                className={btn.secondary}
              >
                Cancel
              </button>
              <button onClick={handleSaveDetails} disabled={savingDetails} className={btn.primary}>
                {savingDetails ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
            {room.summary && <p className="text-xl leading-relaxed">{room.summary}</p>}
            {room.amenities ? (
              <div className="flex flex-wrap gap-2">
                {String(room.amenities).split(",").map((a, i) => (
                  <span key={i} className="text-lg bg-[color:var(--text-color)]/5 px-4 py-1.5 rounded-full capitalize">
                    {a.trim().replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xl text-[color:var(--text-color)]/60">No amenities listed yet.</p>
            )}
          </>
        )}
      </section>

      {/* Physical Rooms — persistent status per numbered room. Occupied is
          always live-derived (never a manual flag) so it can't drift from
          reality; Out of Order / Complementary are the manual flags staff
          set here. */}
      <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
        <button
          type="button"
          onClick={() => setPhysicalRoomsExpanded((v) => !v)}
          className="flex items-center justify-between w-full cursor-pointer"
        >
          <h3 className="text-2xl font-bold text-[color:var(--black)]">
            Physical Rooms {physicalRooms && <span className="text-lg font-normal text-[color:var(--text-color)]/60">({physicalRooms.length})</span>}
          </h3>
          <span className="text-lg text-[color:var(--text-color)]/60">{physicalRoomsExpanded ? "Hide ▲" : "Show ▼"}</span>
        </button>
        {physicalRoomsExpanded && (
        loadingStatus ? (
          <LoadingSpinner />
        ) : !physicalRooms || physicalRooms.length === 0 ? (
          <p className="text-xl text-[color:var(--text-color)]/76">No numbered rooms yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {physicalRooms.map((r) => (
              <div
                key={r.room_inventory_id}
                ref={r.room_inventory_id === highlightRoomInventoryId ? highlightedRoomRef : null}
                className={`flex items-center justify-between gap-4 flex-wrap rounded-lg px-5 py-3 ${
                  r.room_inventory_id === highlightRoomInventoryId
                    ? "bg-[color:var(--emphasis)]/5 ring-1 ring-[color:var(--emphasis)]/50"
                    : "bg-[color:var(--text-color)]/3"
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xl font-semibold">{r.room_number}</span>
                  <RoomStatusTag status={r.display_status} />
                  {r.status_changed_at && r.manual_status !== "available" && (
                    <span className="text-base text-[color:var(--text-color)]/60">
                      since {formatDateTime(r.status_changed_at)}
                    </span>
                  )}
                </div>
                <select
                  value={r.manual_status}
                  disabled={statusUpdatingId === r.room_inventory_id}
                  onChange={(e) =>
                    handleSetRoomStatus(r.room_inventory_id, r.room_number, e.target.value, r.display_status)
                  }
                  className={`${field.select} w-auto`}
                >
                  <option value="available">Available</option>
                  <option value="out_of_order">Out of Order</option>
                  <option value="complementary">Complementary</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            ))}
          </div>
        )
        )}
      </section>

      {/* Editable: Base Price + Breakfast Price */}
      <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
        <h3 className="text-2xl font-bold text-[color:var(--black)]">Base Price (₦)</h3>
        {canManagePrices ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 flex-nowrap items-center">
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className={field.input}
                min="0"
              />
              <button
                onClick={handleUpdatePrice}
                disabled={updatingPrice}
                className={`${btn.primary} whitespace-nowrap`}
              >
                {updatingPrice ? "..." : "Update"}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-lg font-semibold text-[color:var(--text-color)]/76">Breakfast Price (₦)</label>
              <input
                type="number"
                value={breakfastPriceInput}
                onChange={(e) => setBreakfastPriceInput(e.target.value)}
                className={field.input}
                min="0"
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold">NGN {formatPrice(room.base_rate ?? 0)}</p>
            <p className="text-lg text-[color:var(--text-color)]/68">Breakfast: NGN {formatPrice(room.breakfast_rate ?? 0)}</p>
          </>
        )}
      </section>

      {/* Editable: Max Capacity (physical rooms) */}
      <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
        <h3 className="text-2xl font-bold text-[color:var(--black)]">Max Capacity (physical rooms)</h3>
        <div className="flex gap-3 flex-nowrap items-center">
          <input
            type="number"
            value={capacityInput}
            onChange={(e) => setCapacityInput(e.target.value)}
            className={`${field.input} ${refreshing ? "opacity-70" : ""}`}
            disabled={refreshing}
            min="1"
          />
          <button
            onClick={handleUpdateCapacity}
            disabled={updatingCapacity || refreshing}
            className={`${btn.primary} whitespace-nowrap`}
          >
            {updatingCapacity ? "..." : refreshing ? "Syncing..." : "Update"}
          </button>
        </div>
      </section>

      {/* ── Capacity Decrease Confirmation ── */}
      {confirmCapacityDecrease && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmCapacityDecrease(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 flex flex-col gap-6 text-center font-primary">
            <div className="text-orange-500 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[color:var(--text-color)] tracking-wide mb-2">Reduce Room Count?</h3>
              <p className="text-xl text-[color:var(--text-color)]/84 leading-relaxed">
                Reducing capacity from <span className="font-bold">{room.max_capacity}</span> to{" "}
                <span className="font-bold">{capacityInput}</span> can permanently delete physical room rows (never
                one a guest is currently in or has booked). This cannot be undone.
              </p>
            </div>
            <div className="flex gap-4 justify-center pt-2">
              <button onClick={() => setConfirmCapacityDecrease(false)} className={btn.secondary}>Cancel</button>
              <button onClick={handleUpdateCapacity} disabled={updatingCapacity} className={btn.dangerSolid}>
                {updatingCapacity ? "Reducing..." : "Yes, Reduce"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Occupied-Room Status-Change Confirmation ── */}
      {confirmStatusChange && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmStatusChange(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 flex flex-col gap-6 text-center font-primary">
            <div className="text-orange-500 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[color:var(--text-color)] tracking-wide mb-2">
                Room {confirmStatusChange.roomNumber} is Occupied
              </h3>
              <p className="text-xl text-[color:var(--text-color)]/84 leading-relaxed">
                {confirmStatusChange.newStatus === "complementary"
                  ? "Marking this room complementary while a guest is staying in it will zero out their room charge on this stay's folio."
                  : confirmStatusChange.newStatus === "reserved"
                  ? "This room currently has a guest checked in. Marking it reserved won't remove them, but flags the room as set aside for a manager once they leave."
                  : "This room currently has a guest checked in. Marking it out of order won't remove them, but flags the room for maintenance once they leave."}
              </p>
            </div>
            <div className="flex gap-4 justify-center pt-2">
              <button onClick={() => setConfirmStatusChange(null)} className={btn.secondary}>Cancel</button>
              <button
                onClick={() =>
                  // confirmStatusChange is already set, so handleSetRoomStatus's
                  // guard is skipped regardless of what's passed here — this call
                  // is the "already confirmed" path.
                  handleSetRoomStatus(
                    confirmStatusChange.roomInventoryId,
                    confirmStatusChange.roomNumber,
                    confirmStatusChange.newStatus,
                    null,
                  )
                }
                disabled={statusUpdatingId === confirmStatusChange.roomInventoryId}
                className={btn.dangerSolid}
              >
                {statusUpdatingId === confirmStatusChange.roomInventoryId ? "Applying..." : "Yes, Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop (darker layer on top of the already-dimmed modal) */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(false)}
          />

          {/* Dialog box */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 flex flex-col gap-6 text-center font-primary">
            {/* Warning icon */}
            <div className="text-red-500 flex justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-16 h-16"
              >
                <path
                  fillRule="evenodd"
                  d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[color:var(--text-color)] tracking-wide mb-2">
                Delete Room Type?
              </h3>
              <p className="text-xl text-[color:var(--text-color)]/84 leading-relaxed">
                You are about to permanently remove{" "}
                <span className="font-bold text-[color:var(--text-color)]">
                  {room.room_type_name}
                </span>{" "}
                from the system. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-2">
              <button
                onClick={() => {
                  console.log("AdminRooms: Delete confirmation cancelled by user");
                  setConfirmDelete(false);
                }}
                disabled={deleting}
                className={btn.secondary}
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className={btn.dangerSolid}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[color:var(--text-color)]/3 rounded-lg px-5 py-4">
      <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">{label}</p>
      <p className="text-2xl font-bold text-[color:var(--black)]">{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRoomsPage() {
  const canManagePrices = canManageRoomPrices();
  const location = useLocation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  // Deep link from the Overview page's out-of-order/complementary/reserved banners
  // (location.state: { openRoomTypeId, expandPhysicalRooms, highlightRoomInventoryId })
  const [modalExpandPhysicalRooms, setModalExpandPhysicalRooms] = useState(false);
  const [modalHighlightRoomInventoryId, setModalHighlightRoomInventoryId] = useState(null);
  const appliedDeepLinkRef = useRef(false);

  // Inline price editing per row (desktop)
  const [inlinePriceEdits, setInlinePriceEdits] = useState({});
  const [inlineBreakfastPriceEdits, setInlineBreakfastPriceEdits] = useState({});
  const [updatingInlinePrice, setUpdatingInlinePrice] = useState(null);

  // WebSocket update lock - prevents editing during safety fetches
  const [webSocketUpdating, setWebSocketUpdating] = useState(false);

  const showSuccess = (msg) => {
    console.log("AdminRooms: ✅ Success:", msg);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 6000);
  };

  const showError = (msg) => {
    console.error("AdminRooms: ❌ Error shown to user:", msg);
    setError(msg);
    setTimeout(() => setError(null), 6000);
  };

  const fetchRooms = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) setLoading(true);

      console.log(
        `AdminRooms: Fetching rooms via POST /api/rooms/details for branch_id=${BRANCH_ID} from: ${getBaseUrl()}`
      );

      // ✅ Correct endpoint — mirrors room-data.js / fetchRoomDetails()
      const res = await axios.post(
        `${getBaseUrl()}/api/rooms/details`,
        { branch_id: BRANCH_ID },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      console.log("AdminRooms: Raw API response:", res.data);

      // Response shape: { room_types: [...], ... } — same as AdminOverview uses
      const roomList = Array.isArray(res.data?.room_types)
        ? res.data.room_types
        : [];

      console.log(`AdminRooms: Extracted ${roomList.length} room type(s):`, roomList);

      setRooms(roomList);
      setError(null);

      // Initialise inline price state from fetched data
      const priceMap = {};
      const breakfastPriceMap = {};
      roomList.forEach((r) => {
        priceMap[r.room_type_id] = String(r.base_rate ?? "");
        breakfastPriceMap[r.room_type_id] = String(r.breakfast_rate ?? "0");
      });
      console.log("AdminRooms: Initialised inline price map:", priceMap);
      setInlinePriceEdits(priceMap);
      setInlineBreakfastPriceEdits(breakfastPriceMap);
    } catch (err) {
      console.error("AdminRooms: Error fetching rooms:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      if (!isBackgroundRefresh) {
        setError("Failed to load rooms. Please refresh the page.");
      }
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  };

  // Fetch single room details by ID (for modal safety fetches)
  const fetchRoomById = async (roomTypeId) => {
    try {
      console.log(
        `AdminRooms: Fetching room details for room_type_id=${roomTypeId} from: ${getBaseUrl()}`
      );

      const res = await axios.post(
        `${getBaseUrl()}/api/rooms/details`,
        { branch_id: BRANCH_ID },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      const roomList = Array.isArray(res.data?.room_types)
        ? res.data.room_types
        : [];

      const updatedRoom = roomList.find((r) => r.room_type_id === roomTypeId);

      if (updatedRoom) {
        console.log(`AdminRooms: Found updated room data:`, updatedRoom);
        return updatedRoom;
      }

      console.log(`AdminRooms: Room ${roomTypeId} not found in response`);
      return null;
    } catch (err) {
      console.error("AdminRooms: Error fetching room by ID:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      return null;
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Consume the Overview page's out-of-order/complementary/reserved banner deep link
  // once rooms have loaded, then clear the state so a later back-navigation
  // to this page doesn't reopen the modal. Applied only once per visit —
  // `rooms` also refreshes on every websocket update, which shouldn't
  // reopen a modal the staff member already closed.
  useEffect(() => {
    if (appliedDeepLinkRef.current || loading || rooms.length === 0) return;
    const targetTypeId = location.state?.openRoomTypeId;
    if (!targetTypeId) return;
    appliedDeepLinkRef.current = true;
    const match = rooms.find((r) => r.room_type_id === targetTypeId);
    if (match) {
      setSelectedRoom(match);
      setModalExpandPhysicalRooms(!!location.state?.expandPhysicalRooms);
      setModalHighlightRoomInventoryId(location.state?.highlightRoomInventoryId ?? null);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [loading, rooms, location, navigate]);

  // WebSocket handler - refetch data when rooms are updated (with multiple safety fetches for reliability)
  const handleRoomsUpdated = useCallback((data) => {
    console.log('📡 [AdminRooms] WebSocket update received at:', new Date().toISOString());
    console.log('📡 [AdminRooms] WebSocket data:', data);

    // Lock editing during WebSocket updates
    setWebSocketUpdating(true);
    console.log('🔒 [AdminRooms] Editing locked - WebSocket update in progress');

    // First fetch after 2 seconds (immediate response)
    setTimeout(() => {
      console.log('🔄 [AdminRooms] Starting first safety fetch...');
      fetchRooms(true);
      console.log('🔄 [AdminRooms] First safety fetch triggered');
    }, 2000);

    // Second verification fetch after 6 seconds (ensure consistency)
    setTimeout(() => {
      console.log('🔄 [AdminRooms] Starting verification fetch...');
      fetchRooms(true);
      console.log('🔄 [AdminRooms] Verification fetch triggered');
    }, 6000);

    // Final verification fetch after 10 seconds (ensure consistency) - then unlock editing
    setTimeout(() => {
      console.log('🔄 [AdminRooms] Starting final safety fetch...');
      fetchRooms(true);
      console.log('🔄 [AdminRooms] Final safety fetch triggered');

      // Unlock editing after all safety fetches complete
      setWebSocketUpdating(false);
      console.log('🔓 [AdminRooms] Editing unlocked - WebSocket update complete');
    }, 10000);
  }, []);

  // Subscribe to WebSocket updates
  const { subscribe, isConnected, disconnectedRefreshTick } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = subscribe(handleRoomsUpdated);
    return unsubscribe;
  }, [handleRoomsUpdated, subscribe]);

  // Re-sync whenever the socket (re)connects — closes the gap where a
  // rooms_updated event broadcast while this client was disconnected
  // (network blip, laptop sleep, a backend redeploy) would otherwise be
  // lost for good, since Socket.IO's default emit has no queue/replay.
  // Replaces the old 60s poll; the subscription above already handles
  // live updates while connected.
  useEffect(() => {
    if (isConnected) fetchRooms(true);
  }, [isConnected]);

  // Fallback: if the socket stays disconnected, keep refreshing via plain
  // HTTP every 30s anyway (see WebSocketContext.jsx) — the websocket and the
  // REST API are separate transports, so this can recover even when the
  // socket itself won't reconnect quickly.
  useEffect(() => {
    if (disconnectedRefreshTick === 0) return;
    fetchRooms(true);
  }, [disconnectedRefreshTick]);

  // Handle inline price update (desktop table)
  const handleInlinePriceUpdate = async (room) => {
    if (!canManagePrices) {
      showError("Only managers can update room prices.");
      return;
    }

    const newPrice = Number(inlinePriceEdits[room.room_type_id]);
    if (isNaN(newPrice) || newPrice <= 0) {
      showError("Please enter a valid price.");
      return;
    }

    const newBreakfastPrice = Number(inlineBreakfastPriceEdits[room.room_type_id]);
    if (isNaN(newBreakfastPrice) || newBreakfastPrice < 0) {
      showError("Please enter a valid breakfast price.");
      return;
    }

    console.log(
      `AdminRooms: [Inline] Updating price for room_type_id=${room.room_type_id} to ${newPrice} (breakfast ${newBreakfastPrice})`
    );
    setUpdatingInlinePrice(room.room_type_id);

    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/price`,
        { room_type_id: room.room_type_id, new_price: newPrice, new_breakfast_price: newBreakfastPrice },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      console.log("AdminRooms: [Inline] Update price response:", res.data);
      showSuccess(res.data?.message || "Price updated successfully!");
      fetchRooms(true);
    } catch (err) {
      console.error("AdminRooms: [Inline] Error updating price:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      showError(
        err.response?.data?.message ||
          "Failed to update price. Please try again."
      );
    } finally {
      setUpdatingInlinePrice(null);
    }
  };

  const handleRoomDeleted = (roomTypeId, msg) => {
    console.log(`AdminRooms: Room type ${roomTypeId} deleted from local state`);
    setRooms((prev) => prev.filter((r) => r.room_type_id !== roomTypeId));
    showSuccess(msg);
  };

  const handleAddSuccess = (msg) => {
    showSuccess(msg);
    fetchRooms();
  };

  return (
    <>
      {/* ── Notifications ── */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl z-50 flex items-center gap-4 max-w-sm shadow-lg">
          <span className="text-xl">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-green-700 hover:text-green-900 flex-shrink-0 cursor-pointer"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl z-50 flex items-center gap-4 max-w-sm shadow-lg">
          <span className="text-xl">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 flex-shrink-0 cursor-pointer"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      {/* ── Page ── */}
      <div
        data-component="AdminRooms"
        className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]"
      >
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <PageHeading icon={IoBedOutline}>Rooms</PageHeading>
          <button
            onClick={() => {
              console.log("AdminRooms: Opening Add Room modal");
              setShowAddModal(true);
            }}
            className={`${btn.primary} whitespace-nowrap`}
          >
            + Add Room
          </button>
        </div>

        {/* ── Table ── */}
        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Room Type</th>
                  <th className={`${table.th} hidden md:table-cell`}>Price (₦)</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td>
                  </tr>
                ) : rooms.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">
                      No rooms found for this branch.
                    </td>
                  </tr>
                ) : (
                  rooms.map((room) => (
                    <tr key={room.room_type_id} className={table.row}>
                      {/* Room Type Name */}
                      <td className={`${table.td} font-medium`}>
                        {room.room_type_name}
                      </td>

                      {/* Desktop: Inline price input + Update button */}
                      <td className={`${table.td} hidden md:table-cell`}>
                        {canManagePrices ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-lg text-[color:var(--text-color)]/68">Base Price</span>
                              <div className="flex items-center gap-2 flex-nowrap">
                                <input
                                  type="number"
                                  value={inlinePriceEdits[room.room_type_id] ?? ""}
                                  onChange={(e) =>
                                    setInlinePriceEdits((prev) => ({
                                      ...prev,
                                      [room.room_type_id]: e.target.value,
                                    }))
                                  }
                                  className={`${field.input} text-xl! w-52! py-2!`}
                                  min="0"
                                  disabled={webSocketUpdating}
                                />
                                <button
                                  onClick={() => handleInlinePriceUpdate(room)}
                                  disabled={updatingInlinePrice === room.room_type_id || webSocketUpdating}
                                  className={btn.rowPrimary}
                                >
                                  {updatingInlinePrice === room.room_type_id
                                    ? "..."
                                    : webSocketUpdating
                                    ? "Syncing..."
                                    : "Update"}
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-lg text-[color:var(--text-color)]/68">Breakfast</span>
                              <input
                                type="number"
                                value={inlineBreakfastPriceEdits[room.room_type_id] ?? ""}
                                onChange={(e) =>
                                  setInlineBreakfastPriceEdits((prev) => ({
                                    ...prev,
                                    [room.room_type_id]: e.target.value,
                                  }))
                                }
                                className={`${field.input} text-xl! w-52! py-2!`}
                                min="0"
                                disabled={webSocketUpdating}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span>NGN {formatPrice(room.base_rate ?? 0)}</span>
                            <span className="text-lg text-[color:var(--text-color)]/68">Breakfast: NGN {formatPrice(room.breakfast_rate ?? 0)}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={table.td}>
                        <div className={table.actions}>
                          <button
                            onClick={() => {
                              console.log(
                                "AdminRooms: Opening view modal for room:",
                                room
                              );
                              setSelectedRoom(room);
                            }}
                            className={btn.rowPrimary}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── View/Edit Room Modal ── */}
      {selectedRoom && (
        <ViewRoomModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onSuccess={showSuccess}
          onError={showError}
          onRoomDeleted={(id, msg) => {
            handleRoomDeleted(id, msg);
            setSelectedRoom(null);
          }}
          onRefreshRoom={fetchRoomById}
          canManagePrices={canManagePrices}
          initiallyExpandPhysicalRooms={modalExpandPhysicalRooms}
          highlightRoomInventoryId={modalHighlightRoomInventoryId}
        />
      )}

      {/* ── Add Room Modal ── */}
      {showAddModal && (
        <AddRoomModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          onError={showError}
        />
      )}
    </>
  );
}
