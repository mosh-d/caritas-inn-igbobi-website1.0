import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { IoClose } from "react-icons/io5";
import Button from "../components/shared/Button";
import { useWebSocketContext } from "../context/WebSocketContext";

// ─── API Setup ────────────────────────────────────────────────────────────────

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";

let API_BASE_URL = import.meta.env.VITE_BACKEND_URL || PRODUCTION_URL;

// ─── Igbobi branch_id = 3 (Caritas Inn Igbobi) ───────────────────────────────
// Source of truth: auth.js, room-data.js, WebSocketContext.jsx all use BRANCH_ID = 3
const BRANCH_ID = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBaseUrl = () =>
  API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

const formatPrice = (price) =>
  Number(price).toLocaleString("en-NG", { minimumFractionDigits: 0 });

// ─── Add Room Modal ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  summary: "",
  amenities: "",
  adult_capacity: "",
  child_capacity: "",
  currency_symbol: "₦",
  base_rate: "",
  max_capacity: "",
};

function AddRoomModal({ onClose, onSuccess, onError }) {
  const modalRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      max_capacity: Number(form.max_capacity),
    };

    console.log("AdminRooms: Submitting new room type:", payload);
    setSubmitting(true);

    try {
      const res = await axios.post(`${getBaseUrl()}/api/rooms/type`, payload, {
        headers: { "Content-Type": "application/json" },
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

  const inputClass =
    "w-full border-b border-[color:var(--text-color)]/40 bg-transparent py-2 text-[color:var(--text-color)] text-2xl outline-none focus:border-[color:var(--emphasis)] transition-colors placeholder:text-white/25";

  const labelClass =
    "block text-xl font-primary font-semibold uppercase tracking-widest text-[color:var(--emphasis)] mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white shadow-2xl flex flex-col font-secondary rounded-lg overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-8 text-center bg-[var(--white)] relative">
          <h2 className="font-bold text-3xl tracking-[0.2em] font-primary text-[var(--text-color)]">
            ADD NEW ROOM TYPE
          </h2>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[color:var(--text-color)]/50 hover:text-[color:var(--emphasis)] transition-colors"
            aria-label="Close modal"
          >
            <IoClose size={28} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--text-color)] text-[var(--white)] p-8 flex flex-col gap-6 tracking-[0.05em] font-primary"
        >
          {/* Room Name */}
          <div>
            <label className={labelClass}>Room Type Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Diplomatic Suite"
              className={inputClass}
              style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
            />
          </div>

          {/* Summary */}
          <div>
            <label className={labelClass}>Summary *</label>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              placeholder="Brief description of the room..."
              rows={3}
              className={`${inputClass} resize-none`}
              style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
            />
          </div>

          {/* Amenities */}
          <div>
            <label className={labelClass}>Amenities *</label>
            <input
              type="text"
              name="amenities"
              value={form.amenities}
              onChange={handleChange}
              placeholder="e.g. WiFi, AC, Jacuzzi, Breakfast, Smart TV"
              className={inputClass}
              style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
            />
          </div>

          {/* Capacities row */}
          <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
            <div>
              <label className={labelClass}>Adult Capacity *</label>
              <input
                type="number"
                name="adult_capacity"
                value={form.adult_capacity}
                onChange={handleChange}
                min="1"
                placeholder="e.g. 2"
                className={inputClass}
                style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
              />
            </div>
            <div>
              <label className={labelClass}>Child Capacity *</label>
              <input
                type="number"
                name="child_capacity"
                value={form.child_capacity}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 2"
                className={inputClass}
                style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
              />
            </div>
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
            <div>
              <label className={labelClass}>Currency Symbol</label>
              <input
                type="text"
                name="currency_symbol"
                value={form.currency_symbol}
                onChange={handleChange}
                placeholder="₦"
                className={inputClass}
                style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
              />
            </div>
            <div>
              <label className={labelClass}>Room Rate/Price *</label>
              <input
                type="number"
                name="base_rate"
                value={form.base_rate}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 85000"
                className={inputClass}
                style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
              />
            </div>
          </div>

          {/* Max Capacity (physical rooms) */}
          <div>
            <label className={labelClass}>
              Max Capacity (no. of physical rooms) *
            </label>
            <input
              type="number"
              name="max_capacity"
              value={form.max_capacity}
              onChange={handleChange}
              min="1"
              placeholder="e.g. 5"
              className={inputClass}
              style={{ color: "var(--white)", borderColor: "rgba(255,255,255,0.3)" }}
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-center gap-4 pt-4">
            <Button type="button" onClick={onClose} variant="white">
              <p className="font-primary text-xl">Cancel</p>
            </Button>
            <Button
              type="submit"
              variant="emphasis"
              disabled={submitting}
              className={submitting ? "opacity-60 cursor-not-allowed" : ""}
            >
              <p className="font-primary text-xl">
                {submitting ? "Adding..." : "Add Room"}
              </p>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View / Edit Room Modal ────────────────────────────────────────────────────

function ViewRoomModal({ room, onClose, onSuccess, onError, onRoomDeleted, onRefreshRoom }) {
  const modalRef = useRef(null);

  const [priceInput, setPriceInput] = useState(String(room.base_rate ?? ""));
  const [capacityInput, setCapacityInput] = useState(
    String(room.max_capacity ?? "")
  );
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      }
      
      // Unlock UI after all safety fetches complete
      setRefreshing(false);
      console.log('🔓 [ViewRoomModal] UI unlocked - safety fetches complete');
    }, 6000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      // If the confirmation dialog is showing, let it handle its own clicks
      if (confirmDelete) return;

      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, confirmDelete]);

  const handleUpdatePrice = async () => {
    const newPrice = Number(priceInput);
    if (isNaN(newPrice) || newPrice <= 0) {
      onError("Please enter a valid price.");
      return;
    }

    console.log(
      `AdminRooms: Updating price for room_type_id=${room.room_type_id} to ${newPrice}`
    );
    setUpdatingPrice(true);

    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/price`,
        { room_type_id: room.room_type_id, new_price: newPrice },
        {
          headers: { "Content-Type": "application/json" },
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

    console.log(
      `AdminRooms: Updating capacity for room_type_id=${room.room_type_id} to ${newCapacity}`
    );
    setUpdatingCapacity(true);

    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/capacity`,
        { room_type_id: room.room_type_id, new_capacity: newCapacity },
        {
          headers: { "Content-Type": "application/json" },
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
        { withCredentials: true }
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

  const fieldClass =
    "flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-3 gap-4";
  const labelClass =
    "font-semibold uppercase text-xl text-[var(--emphasis)] min-w-[12rem]";
  const valueClass = "text-2xl text-right";

  const editableInputClass =
    "bg-transparent border border-[var(--emphasis)]/50 text-[var(--white)] text-2xl px-3 py-1 w-[14rem] max-sm:w-[10rem] outline-none focus:border-[var(--emphasis)] transition-colors rounded-sm";

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white shadow-2xl flex flex-col font-secondary rounded-lg overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-8 text-center bg-[var(--white)] relative">
          <h2 className="font-bold text-3xl tracking-[0.2em] font-primary text-[var(--text-color)]">
            {room.room_type_name}
          </h2>
          {/* <p className="text-xl text-[color:var(--text-color)]/60 font-primary mt-1">
            Room Type ID: {room.room_type_id}
          </p> */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[color:var(--text-color)]/50 hover:text-[color:var(--emphasis)] transition-colors"
            aria-label="Close modal"
          >
            <IoClose size={28} />
          </button>
        </div>

        {/* Body */}
        <div className="bg-[var(--text-color)] text-[var(--white)] p-8 flex flex-col gap-5 tracking-[0.1em] text-sm font-primary">
          {/* Read-only fields */}
          <div className={fieldClass}>
            <span className={labelClass}>Available Rooms</span>
            <span className={valueClass}>{room.available_rooms ?? "N/A"}</span>
          </div>

          {room.summary && (
            <div className="border-b border-[var(--emphasis)]/30 pb-3">
              <span className={labelClass}>Summary</span>
              <p className="text-xl mt-2 leading-relaxed">{room.summary}</p>
            </div>
          )}

          {room.amenities && (
            <div className="border-b border-[var(--emphasis)]/30 pb-3">
              <span className={labelClass}>Amenities</span>
              <p className="text-xl mt-2 leading-relaxed">{room.amenities}</p>
            </div>
          )}

          <div className={fieldClass}>
            <span className={labelClass}>Adult Capacity</span>
            <span className={valueClass}>{room.adult_capacity ?? "N/A"}</span>
          </div>

          <div className={fieldClass}>
            <span className={labelClass}>Child Capacity</span>
            <span className={valueClass}>{room.child_capacity ?? "N/A"}</span>
          </div>

          {/* Editable: Base Price */}
          <div className={fieldClass}>
            <span className={labelClass}>Base Price (₦)</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className={editableInputClass}
                min="0"
              />
              <Button
                onClick={handleUpdatePrice}
                variant="emphasis"
                disabled={updatingPrice}
                className={`text-xl pt-2 pb-0.5 px-4 ${updatingPrice ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {updatingPrice ? "..." : "UPDATE"}
              </Button>
            </div>
          </div>

          {/* Editable: Max Capacity (physical rooms) */}
          <div className={fieldClass}>
            <span className={labelClass}>Max Capacity</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                className={`${editableInputClass} ${refreshing ? "opacity-70" : ""}`}
                disabled={refreshing}
                min="1"
              />
              <Button
                onClick={handleUpdateCapacity}
                variant="emphasis"
                disabled={updatingCapacity || refreshing}
                className={`text-xl pt-2 pb-0.5 px-4 ${updatingCapacity || refreshing ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {updatingCapacity ? "..." : refreshing ? "Syncing..." : "UPDATE"}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[var(--text-color)] p-6 flex justify-between items-center gap-4 flex-wrap">
          <button
            onClick={() => {
              console.log(
                `AdminRooms: Delete Room clicked for room_type_id=${room.room_type_id} (${room.room_type_name}) — showing confirmation dialog`
              );
              setConfirmDelete(true);
            }}
            disabled={deleting}
            className="font-primary text-xl tracking-widest px-6 py-3 border border-red-400/50 text-red-300/70 hover:border-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            Delete Room
          </button>

          <Button onClick={onClose} variant="white">
            <p className="font-primary text-xl">Close</p>
          </Button>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop (darker layer on top of the already-dimmed modal) */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(false)}
          />

          {/* Dialog box */}
          <div className="relative z-10 bg-white rounded-lg shadow-2xl max-w-md w-full p-10 flex flex-col gap-6 text-center font-primary">
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
              <p className="text-xl text-[color:var(--text-color)]/70 leading-relaxed">
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
                className="font-primary text-xl tracking-widest px-8 py-4 border border-[color:var(--text-color)]/30 text-[color:var(--text-color)]/70 hover:bg-gray-100 transition-all cursor-pointer rounded-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`font-primary text-xl tracking-widest px-8 py-4 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all rounded-sm ${
                  deleting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Inline price editing per row (desktop)
  const [inlinePriceEdits, setInlinePriceEdits] = useState({});
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
      roomList.forEach((r) => {
        priceMap[r.room_type_id] = String(r.base_rate ?? "");
      });
      console.log("AdminRooms: Initialised inline price map:", priceMap);
      setInlinePriceEdits(priceMap);
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
    const interval = setInterval(() => fetchRooms(true), 60000);
    return () => clearInterval(interval);
  }, []);

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
  const { subscribe } = useWebSocketContext();
  
  useEffect(() => {
    const unsubscribe = subscribe(handleRoomsUpdated);
    return unsubscribe;
  }, [handleRoomsUpdated, subscribe]);

  // Handle inline price update (desktop table)
  const handleInlinePriceUpdate = async (room) => {
    const newPrice = Number(inlinePriceEdits[room.room_type_id]);
    if (isNaN(newPrice) || newPrice <= 0) {
      showError("Please enter a valid price.");
      return;
    }

    console.log(
      `AdminRooms: [Inline] Updating price for room_type_id=${room.room_type_id} to ${newPrice}`
    );
    setUpdatingInlinePrice(room.room_type_id);

    try {
      const res = await axios.patch(
        `${getBaseUrl()}/api/rooms/price`,
        { room_type_id: room.room_type_id, new_price: newPrice },
        {
          headers: { "Content-Type": "application/json" },
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
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded z-50 flex items-center gap-4 max-w-sm shadow-lg">
          <span className="text-xl">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-green-700 hover:text-green-900 flex-shrink-0"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded z-50 flex items-center gap-4 max-w-sm shadow-lg">
          <span className="text-xl">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 flex-shrink-0"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      {/* ── Page ── */}
      <div
        data-component="AdminRooms"
        className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[4rem]"
      >
        <div className="w-full flex justify-between items-center">
          <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)]">
            Rooms
          </h1>
        </div>

        {/* ── Table ── */}
        <div className="w-full overflow-x-auto">
          <table className="min-w-full border-collapse text-2xl">
            <thead>
              <tr className="border-b border-[color:var(--text-color)]/50">
                {/* Always visible */}
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Room Type
                </th>

                {/* Desktop only: price as editable cell */}
                <th className="px-8 py-4 text-left whitespace-nowrap hidden md:table-cell">
                  Price (₦)
                </th>

                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-8 py-8 text-center">
                    Loading rooms...
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-8 py-8 text-center">
                    No rooms found for this branch.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr
                    key={room.room_type_id}
                    className="border-b border-[color:var(--text-color)]/50"
                  >
                    {/* Room Type Name */}
                    <td className="px-8 py-4 text-left font-medium">
                      {room.room_type_name}
                    </td>

                    {/* Desktop: Inline price input + UPDATE button */}
                    <td className="px-8 py-4 text-left hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={inlinePriceEdits[room.room_type_id] ?? ""}
                          onChange={(e) =>
                            setInlinePriceEdits((prev) => ({
                              ...prev,
                              [room.room_type_id]: e.target.value,
                            }))
                          }
                          className="border border-[color:var(--text-color)]/30 bg-transparent text-[color:var(--text-color)] text-2xl px-3 py-1 w-[13rem] outline-none focus:border-[color:var(--emphasis)] transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          min="0"
                          disabled={webSocketUpdating}
                        />
                        <Button
                          onClick={() => handleInlinePriceUpdate(room)}
                          variant="emphasis"
                          disabled={updatingInlinePrice === room.room_type_id || webSocketUpdating}
                          className={`text-xl pt-2 pb-0.5 px-4 ${
                            updatingInlinePrice === room.room_type_id || webSocketUpdating
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {updatingInlinePrice === room.room_type_id
                            ? "..."
                            : webSocketUpdating
                            ? "Syncing..."
                            : "UPDATE"}
                        </Button>
                      </div>
                    </td>

                    {/* Action: View (+ mobile delete) */}
                    <td className="px-8 py-4 text-left">
                      <div className="flex items-center gap-4 flex-wrap">
                        <Button
                          onClick={() => {
                            console.log(
                              "AdminRooms: Opening view modal for room:",
                              room
                            );
                            setSelectedRoom(room);
                          }}
                          variant="emphasis"
                        >
                          View
                        </Button>

                        {/* Mobile only: delete button */}
                        {/* <button
                          onClick={() => {
                            console.log(
                              "AdminRooms: Quick-delete clicked for room_type_id:",
                              room.room_type_id
                            );
                            setSelectedRoom(room);
                          }}
                          className="md:hidden text-xl font-primary tracking-widest text-red-500 border border-red-300 px-4 py-3 outline hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Add Room Button ── */}
        <div className="w-full flex justify-end">
          <Button
            onClick={() => {
              console.log("AdminRooms: Opening Add Room modal");
              setShowAddModal(true);
            }}
            variant="emphasis"
          >
            <p className="text-2xl font-primary">Add Room</p>
          </Button>
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
