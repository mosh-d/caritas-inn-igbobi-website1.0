import { useState, useEffect } from "react";
import { field, btn } from "./ui";
import { fetchAvailableRoomsForReservation } from "../../utils/reservations-pms-api";

// Editable set of room-number dropdowns for a reservation, up to `roomsBooked`
// slots — one dropdown per physical room the reservation needs. Each slot's
// options exclude rooms already picked in a sibling slot (no double-booking
// the same room to one reservation) but always keep its own current value
// selectable. Falls back to free text if the room type has no numbered
// inventory yet, matching the Check-In picker's behavior.
//
// Two usage modes:
// - Self-contained (default): renders its own "Save Room Assignments"
//   button, calls `onSave(validSlots)` when clicked (existing behavior,
//   used by AdminInHouse.jsx/AdminReservations.jsx's Room Assignments
//   section, a standalone action separate from any other button nearby).
// - `hideSaveButton`: no internal button — instead calls `onSlotsChange`
//   live as the user edits, so a parent with its OWN single action button
//   (e.g. Check-In's "Confirm Check In") can assign rooms and check in
//   together in one click, without a second, redundant save step.
export default function RoomAssignmentPicker({ reservationId, roomsBooked, initialRoomNumbers, onSave, saving, hideSaveButton = false, onSlotsChange }) {
  const [availableRooms, setAvailableRooms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState(initialRoomNumbers.length > 0 ? initialRoomNumbers : [""]);

  useEffect(() => {
    setSlots(initialRoomNumbers.length > 0 ? initialRoomNumbers : [""]);
    let cancelled = false;
    setLoading(true);
    fetchAvailableRoomsForReservation(reservationId)
      .then((data) => { if (!cancelled) setAvailableRooms(data); })
      .catch(() => { if (!cancelled) setAvailableRooms({ available: [], unlabeled_rooms: 0 }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  useEffect(() => {
    onSlotsChange?.(slots.map((s) => s.trim()).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const updateSlot = (index, value) => setSlots((prev) => prev.map((v, i) => (i === index ? value : v)));
  const removeSlot = (index) => setSlots((prev) => prev.filter((_, i) => i !== index));
  const addSlot = () => setSlots((prev) => [...prev, ""]);

  const hasNumberedInventory = !(availableRooms && availableRooms.unlabeled_rooms > 0);
  const noRoomsFree = hasNumberedInventory && availableRooms && availableRooms.available.length === 0;
  const canAddMore = !roomsBooked || slots.length < roomsBooked;
  const validSlots = slots.map((s) => s.trim()).filter(Boolean);
  const unchanged =
    validSlots.length === initialRoomNumbers.length && validSlots.every((v, i) => v === initialRoomNumbers[i]);

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <p className="text-lg text-[color:var(--text-color)]/68">Loading available rooms…</p>
      ) : noRoomsFree && slots.every((s) => !s) ? (
        <p className="text-lg text-red-600">No rooms of this type are currently free.</p>
      ) : (
        slots.map((value, index) => {
          const options = hasNumberedInventory && availableRooms
            ? availableRooms.available.filter((r) => r.room_number === value || !slots.includes(r.room_number))
            : [];
          return (
            <div key={index} className="flex gap-3 flex-nowrap items-center">
              {hasNumberedInventory ? (
                <select value={value} onChange={(e) => updateSlot(index, e.target.value)} className={field.select}>
                  <option value="">-- Select a room --</option>
                  {options.map((r) => (
                    <option key={r.id} value={r.room_number}>{r.room_number}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Room number"
                  value={value}
                  onChange={(e) => updateSlot(index, e.target.value)}
                  className={field.input}
                />
              )}
              {slots.length > 1 && (
                <button type="button" onClick={() => removeSlot(index)} className={btn.rowSecondary}>Remove</button>
              )}
            </div>
          );
        })
      )}
      <div className="flex gap-3 items-center flex-wrap">
        {canAddMore && (
          <button type="button" onClick={addSlot} className={btn.rowSecondary}>+ Add Room</button>
        )}
        {!hideSaveButton && (
          <button
            type="button"
            onClick={() => onSave(validSlots)}
            disabled={saving || unchanged}
            className={`${btn.primary} whitespace-nowrap`}
          >
            {saving ? "Saving..." : "Save Room Assignments"}
          </button>
        )}
      </div>
      {roomsBooked > 1 && (
        <p className="text-lg text-[color:var(--text-color)]/60">{validSlots.length} of {roomsBooked} room(s) assigned</p>
      )}
    </div>
  );
}
