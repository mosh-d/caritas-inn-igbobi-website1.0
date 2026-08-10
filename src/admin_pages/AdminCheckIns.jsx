import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoClose, IoLogInOutline } from "react-icons/io5";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { btn, field, table } from "../components/shared/ui";
import { fetchCheckInList } from "../utils/front-office-api";
import { checkGuestBlacklist } from "../utils/guests-api";
import { localTodayISO } from "../utils/date-utils";
import { useWebSocketContext } from "../context/WebSocketContext";
import RoomAssignmentPicker from "../components/shared/RoomAssignmentPicker";
import RoomStatusTag from "../components/shared/RoomStatusTag";
import PaymentSplitRows from "../components/shared/PaymentSplitRows";
import TransactionReceiptModal from "../components/shared/TransactionReceiptModal";
import {
  checkInReservation,
  assignRoom,
  checkAvailability,
  createAdminReservation,
  confirmReservationById,
  fetchAvailableRoomNumbers,
} from "../utils/reservations-pms-api";
import { fetchFolios, recordPayment } from "../utils/folios-api";

const BRANCH_ID = 3;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";
const todayISO = () => localTodayISO();
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtCurrency = (amount, symbol = "₦") => `${symbol}${Number(amount || 0).toLocaleString()}`;

const EMPTY_WALK_IN = {
  checkOut: "", roomsBooked: 1, roomTypeId: "", guestFirstName: "", guestLastName: "", phone: "", email: "",
  roomNumbers: [], roomRate: "", discountMode: "percentage", discount: "", withoutBreakfast: false,
  paymentSplits: [{ amount: "", payment_method: "cash" }], paymentReceiptNumber: "", paymentNotes: "",
};

export default function AdminCheckInsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("arrivals");

  // --- Arrivals tab ---
  const [date, setDate] = useState(todayISO());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [roomNumbers, setRoomNumbers] = useState([]);
  const [processing, setProcessing] = useState(false);

  // --- Walk-in tab ---
  const [walkIn, setWalkIn] = useState(EMPTY_WALK_IN);
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [walkInProcessing, setWalkInProcessing] = useState(false);
  const [walkInSuccess, setWalkInSuccess] = useState(null);
  const [walkInError, setWalkInError] = useState(null);
  const [walkInAvailableRooms, setWalkInAvailableRooms] = useState(null);
  const [walkInRoomsLoading, setWalkInRoomsLoading] = useState(false);
  const [walkInBlacklisted, setWalkInBlacklisted] = useState(false);
  const [walkInKnownNames, setWalkInKnownNames] = useState([]);
  const [walkInReceipt, setWalkInReceipt] = useState(null);
  const [walkInPaymentWarning, setWalkInPaymentWarning] = useState(null);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchCheckInList(date);
      setReservations(Array.isArray(result) ? result : []);
      setError(null);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load check-in list.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadList(); }, [loadList]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const openCheckIn = (reservation) => {
    setSelected(reservation);
    setRoomNumbers((reservation.room_assignments || []).map((ra) => ra.room_number));
  };

  // Same lookup for the walk-in flow, before a reservation exists — needs a
  // room type and check-out date chosen first.
  useEffect(() => {
    if (!walkIn.roomTypeId || !walkIn.checkOut) {
      setWalkInAvailableRooms(null);
      return;
    }
    let cancelled = false;
    setWalkInRoomsLoading(true);
    fetchAvailableRoomNumbers({
      roomTypeId: Number(walkIn.roomTypeId),
      checkIn: todayISO(),
      checkOut: walkIn.checkOut,
    })
      .then((data) => { if (!cancelled) setWalkInAvailableRooms(data); })
      .catch(() => { if (!cancelled) setWalkInAvailableRooms({ available: [], unlabeled_rooms: 0 }); })
      .finally(() => { if (!cancelled) setWalkInRoomsLoading(false); });
    return () => { cancelled = true; };
  }, [walkIn.roomTypeId, walkIn.checkOut]);

  // Live blacklist check as the receptionist types the phone number —
  // there's no reservation (or guest_id link) yet at this point, so this has
  // to match by phone directly rather than relying on the usual guest
  // association. Phone (not email) since that's the identity key guests are
  // actually matched on at confirmation — see confirmReservation. Debounced
  // so it's not firing on every keystroke, and gated on a minimum length
  // rather than a "looks like a phone number" check since formats vary.
  // Also surfaces the account's known names (if any), for the "someone
  // booking on someone else's behalf using their own phone" case — same
  // response payload AdminGuests.jsx's edit-modal dropdown reads.
  useEffect(() => {
    const phone = walkIn.phone.trim();
    if (phone.length < 7) {
      setWalkInBlacklisted(false);
      setWalkInKnownNames([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      checkGuestBlacklist({ phone })
        .then((data) => {
          if (cancelled) return;
          setWalkInBlacklisted(Boolean(data?.is_blacklisted));
          setWalkInKnownNames(
            (data?.alternate_names || "").split(",").map((n) => n.trim()).filter(Boolean),
          );
        })
        .catch(() => { if (!cancelled) { setWalkInBlacklisted(false); setWalkInKnownNames([]); } });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [walkIn.phone]);

  const handleCheckIn = async () => {
    if (!selected) return;
    try {
      setProcessing(true);
      // The Confirm Check In button is disabled until every booked room has
      // a number assigned (see roomNumbers.length check on the footer
      // button above), so this is always non-empty by the time we get here.
      await assignRoom(selected.id, roomNumbers);
      const checkedInId = selected.id;
      await checkInReservation(checkedInId);
      setSelected(null);
      setRoomNumbers([]);
      // Straight to the folio so staff can record payment right away —
      // covers a hold that was paid but never recorded, or a guest paying
      // now at the front desk.
      navigate(`/admin/folios?reservation_id=${checkedInId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to check in.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!walkIn.checkOut) return;
    setAvailLoading(true);
    setAvailability(null);
    setWalkInError(null);
    try {
      const result = await checkAvailability(BRANCH_ID, todayISO(), walkIn.checkOut);
      setAvailability(result);
    } catch (err) {
      setWalkInError(err.response?.data?.message || "Could not load availability.");
    } finally {
      setAvailLoading(false);
    }
  };

  const handleWalkIn = async (e) => {
    e.preventDefault();
    if (!walkIn.roomTypeId || !walkIn.guestFirstName.trim() || !walkIn.phone.trim() || !walkIn.checkOut) {
      setWalkInError("Guest name, phone, room type, and check-out date are required.");
      return;
    }
    const validRoomNumbers = walkIn.roomNumbers.map((r) => r.trim()).filter(Boolean);
    if (validRoomNumbers.length < Number(walkIn.roomsBooked || 1)) {
      setWalkInError("Assign a room number to every room before checking in.");
      return;
    }
    setWalkInProcessing(true);
    setWalkInError(null);
    // Concatenated into one string only at submit time, same as the public
    // booking site's own form (separate fields, joined for the backend's
    // single guest_name column) — see BookingConfirmation.jsx.
    const guestFullName = `${walkIn.guestFirstName} ${walkIn.guestLastName}`.trim();
    try {
      const hold = await createAdminReservation({
        branch_id: BRANCH_ID,
        room_type_id: Number(walkIn.roomTypeId),
        guest_name: guestFullName,
        phone_number: walkIn.phone.trim(),
        guest_email: walkIn.email.trim(),
        check_in: todayISO(),
        check_out: walkIn.checkOut,
        rooms_booked: Number(walkIn.roomsBooked),
        source: "walk_in",
        booking_channel: "direct",
        // A walk-in goes straight from creation to Confirmed (see below) with
        // no separate Hold-stage review step to adjust the rate afterward
        // (unlike an online booking) — so the rate has to be sent here.
        // walkInTotal already folds in the (possibly overridden) per-night
        // rate × rooms booked × nights, matching how the backend would
        // otherwise compute it from the room type's own base_rate.
        total_rate: walkInTotal,
        without_breakfast: walkIn.withoutBreakfast,
      });

      const internalId = hold.internal_id;
      const bookingRef = hold.reservation_id;

      // Rooms must be assigned BEFORE confirming — confirmReservation and
      // checkIn both now require every booked room to already have a room
      // number (see reservations.service.ts), so this has to run first.
      await assignRoom(internalId, validRoomNumbers);
      await confirmReservationById(internalId);
      await checkInReservation(internalId);

      // Payment is optional — only attempted if the receptionist actually
      // entered an amount. Failing this must never undo or hide the
      // check-in that already succeeded; it's reported as a separate
      // warning, directing staff to record it from the folio instead.
      const validPaymentSplits = walkIn.paymentSplits.filter((s) => Number(s.amount) > 0);
      if (validPaymentSplits.length > 0) {
        try {
          const folios = await fetchFolios({ reservation_id: internalId });
          const folioId = folios?.data?.[0]?.id;
          if (!folioId) throw new Error("Folio not found");
          const result = await recordPayment({
            folio_id: folioId,
            payments: validPaymentSplits.map((s) => ({ amount: Number(s.amount), payment_method: s.payment_method })),
            receipt_number: walkIn.paymentReceiptNumber || undefined,
            notes: walkIn.paymentNotes || undefined,
          });
          setWalkInReceipt({
            title: "Payment Recorded",
            items: result.payments.map((p) => ({ reference: p.payment_reference, amount: fmtCurrency(p.amount), method: p.payment_method })),
          });
        } catch (payErr) {
          setWalkInPaymentWarning(
            (payErr.response?.data?.message || "Failed to record the payment") +
              " — the guest is checked in; record the payment from their folio instead.",
          );
        }
      }

      setWalkInSuccess({ bookingRef, guestName: guestFullName });
      setWalkIn(EMPTY_WALK_IN);
      setAvailability(null);
    } catch (err) {
      setWalkInError(err.response?.data?.message || "Walk-in check-in failed. Please try again.");
    } finally {
      setWalkInProcessing(false);
    }
  };

  const resetWalkIn = () => {
    setWalkInSuccess(null);
    setWalkInError(null);
    setWalkIn(EMPTY_WALK_IN);
    setAvailability(null);
    setWalkInReceipt(null);
    setWalkInPaymentWarning(null);
  };

  const availableTypes = availability
    ? availability.room_types.filter((rt) => rt.available_rooms >= Number(walkIn.roomsBooked))
    : [];

  const selectedWalkInRoomType = availableTypes.find((rt) => String(rt.room_type_id) === walkIn.roomTypeId);
  const walkInNights = walkIn.checkOut
    ? Math.max(1, Math.ceil((new Date(walkIn.checkOut) - new Date(todayISO())) / (1000 * 60 * 60 * 24)))
    : 1;
  // The field holds a per-night rate, pre-filled with the room type's own
  // base rate (not the total) — staff think in "rate per night", and the
  // label alongside shows the resulting total live as they override it.
  const walkInRoomRate = walkIn.roomRate !== "" ? Number(walkIn.roomRate) : Number(selectedWalkInRoomType?.base_rate || 0);
  const walkInTotal = walkInRoomRate * Number(walkIn.roomsBooked || 1) * walkInNights;
  const walkInValidRoomNumbers = walkIn.roomNumbers.map((r) => r.trim()).filter(Boolean);
  const walkInBaseRate = Number(selectedWalkInRoomType?.base_rate || 0);

  // A complementary room's own charge is already excluded at check-in time
  // (see postStayChargesForDay's billableRooms) — this just makes that fact
  // visible *before* check-in, so staff don't assign one without realizing.
  const walkInComplementaryRoomNumbers = walkInValidRoomNumbers.filter(
    (num) => walkInAvailableRooms?.available?.find((r) => r.room_number === num)?.status === "complementary",
  );
  const walkInAllSelectedComplementary =
    walkInValidRoomNumbers.length > 0 && walkInComplementaryRoomNumbers.length === walkInValidRoomNumbers.length;

  // Discount is a one-shot calculator, not a persisted field — touching it
  // recomputes the per-night Room Rate from the room type's own base rate
  // every time, same pattern as the Hold reservation modal's discount field.
  const handleWalkInDiscountChange = (patch) => {
    setWalkIn((p) => {
      const next = { ...p, ...patch };
      const value = Number(next.discount || 0);
      const discountAmount = next.discountMode === "percentage" ? walkInBaseRate * (value / 100) : value;
      next.roomRate = String(Math.max(walkInBaseRate - discountAmount, 0));
      return next;
    });
  };

  // Free-text fallback only when this room type has no numbered inventory at
  // all — same convention as RoomAssignmentPicker elsewhere in the app.
  const hasNumberedWalkInInventory = !(walkInAvailableRooms && walkInAvailableRooms.unlabeled_rooms > 0);
  const noWalkInRoomsFree = hasNumberedWalkInInventory && walkInAvailableRooms && walkInAvailableRooms.available.length === 0;

  const updateWalkInRoomNumber = (index, value) => {
    setWalkIn((p) => {
      const next = [...p.roomNumbers];
      next[index] = value;
      return { ...p, roomNumbers: next };
    });
  };

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

      <div data-component="AdminCheckIns" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
        <PageHeading icon={IoLogInOutline}>Check-Ins</PageHeading>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[color:var(--text-color)]/20 w-full">
          {[
            { key: "arrivals", label: "Expected Arrivals" },
            { key: "walkin", label: "Walk-In" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-8 py-3 text-xl font-bold transition-colors border-b-2 -mb-px cursor-pointer ${
                tab === key
                  ? "border-[color:var(--emphasis)] text-[color:var(--emphasis)]"
                  : "border-transparent text-[color:var(--text-color)]/76 hover:text-[color:var(--text-color)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xl text-[color:var(--text-color)]/76">
          {tab === "arrivals"
            ? "Confirmed (paid) reservations expected to check in on the selected date."
            : "Register a guest who arrives without an existing reservation."}
        </p>

        {/* EXPECTED ARRIVALS */}
        {tab === "arrivals" && (
          <>
            <div className="w-auto flex justify-end">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${field.input} w-auto text-xl!`}
              />
            </div>
            <div className={table.card}>
              <div className={table.scroll}>
                <table className={table.el}>
                  <thead>
                    <tr className={table.headRow}>
                      <th className={table.th}>Guest</th>
                      <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                      <th className={`${table.th} hidden md:table-cell`}>Check-Out</th>
                      <th className={table.th}>Status</th>
                      <th className={table.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                    ) : error ? (
                      <tr><td colSpan="5" className="px-8 py-10 text-center text-red-600 text-xl">{error}</td></tr>
                    ) : reservations.length === 0 ? (
                      <tr><td colSpan="5" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No expected arrivals for this date.</td></tr>
                    ) : (
                      reservations.map((r) => (
                        <tr key={r.id} className={table.row}>
                          <td className={`${table.td} font-medium`}>{r.guest_name}</td>
                          <td className={`${table.td} hidden md:table-cell`}>{r.room_type?.name || "N/A"}</td>
                          <td className={`${table.td} hidden md:table-cell`}>{formatDate(r.check_out)}</td>
                          <td className={table.td}><StatusBadge status={r.status} /></td>
                          <td className={table.td}>
                            <div className={table.actions}>
                              <button
                                onClick={() => r.status === "confirmed" && openCheckIn(r)}
                                disabled={r.status !== "confirmed"}
                                title={r.status === "hold" ? "Awaiting payment — confirm reservation first" : ""}
                                className={btn.rowPrimary}
                              >
                                Check In
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
          </>
        )}

        {/* WALK-IN */}
        {tab === "walkin" && (
          <div className="w-full max-w-3xl">
            {walkInSuccess ? (
              <div className="flex flex-col items-center gap-6 py-16 text-center bg-white rounded-xl border border-[color:var(--text-color)]/10 w-full">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-5xl font-bold">✓</div>
                <h2 className="text-4xl font-secondary font-bold text-[color:var(--black)]">{walkInSuccess.guestName}</h2>
                <p className="text-2xl text-[color:var(--text-color)]/84">
                  Checked in · Booking Ref: <strong className="text-[color:var(--black)]">{walkInSuccess.bookingRef}</strong>
                </p>
                <p className="text-xl text-[color:var(--text-color)]/68">Guest profile and folio have been created.</p>
                {walkInPaymentWarning && (
                  <p className="text-orange-700 text-xl bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 max-w-lg">{walkInPaymentWarning}</p>
                )}
                <button onClick={resetWalkIn} className={`${btn.primary} mt-4`}>New Walk-In</button>
              </div>
            ) : (
              <form onSubmit={handleWalkIn} className="flex flex-col gap-8 bg-white rounded-xl border border-[color:var(--text-color)]/10 p-8">
                {walkInError && (
                  <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{walkInError}</p>
                )}

                {/* Date + rooms row */}
                <div className="flex gap-4 flex-wrap items-end">
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>
                      Check-Out Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={tomorrowISO()}
                      value={walkIn.checkOut}
                      onChange={(e) => {
                        setWalkIn((p) => ({ ...p, checkOut: e.target.value, roomTypeId: "", roomNumbers: [] }));
                        setAvailability(null);
                      }}
                      className={field.input}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Rooms</label>
                    <input
                      type="number"
                      min="1"
                      value={walkIn.roomsBooked}
                      onChange={(e) => {
                        setWalkIn((p) => ({ ...p, roomsBooked: e.target.value, roomTypeId: "", roomNumbers: [] }));
                        setAvailability(null);
                      }}
                      className={`${field.input} w-28`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckAvailability}
                    disabled={!walkIn.checkOut || availLoading}
                    className={btn.primary}
                  >
                    {availLoading ? "Checking..." : "Check Availability"}
                  </button>
                </div>

                {/* Room type selection */}
                {availability && (
                  <div className="flex flex-col gap-3">
                    <label className={field.label}>
                      Room Type <span className="text-red-500">*</span>
                    </label>
                    {availableTypes.length === 0 ? (
                      <p className="text-red-600 text-xl">
                        No rooms available for {walkIn.roomsBooked} room(s) on those dates.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {availableTypes.map((rt) => (
                          <label
                            key={rt.room_type_id}
                            className={`flex items-center justify-between border rounded-xl px-6 py-4 cursor-pointer transition-colors ${
                              walkIn.roomTypeId === String(rt.room_type_id)
                                ? "border-[color:var(--emphasis)] bg-[color:var(--emphasis)]/5 ring-1 ring-[color:var(--emphasis)]"
                                : "border-[color:var(--text-color)]/20 hover:border-[color:var(--emphasis)]/40"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <input
                                type="radio"
                                name="roomType"
                                value={rt.room_type_id}
                                checked={walkIn.roomTypeId === String(rt.room_type_id)}
                                onChange={(e) => setWalkIn((p) => ({ ...p, roomTypeId: e.target.value, roomNumbers: [], roomRate: "", discount: "" }))}
                                className="accent-[color:var(--emphasis)] w-5 h-5"
                              />
                              <span className="text-xl font-medium">{rt.room_type_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-[color:var(--emphasis)]">
                                {fmtCurrency(rt.base_rate, rt.currency_symbol)} / night
                              </span>
                              <span className="block text-lg text-[color:var(--text-color)]/68">
                                {rt.available_rooms} available
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Room rate override — a walk-in goes straight to Confirmed
                    with no separate Hold-stage review step, so this is the
                    only chance to adjust it before the folio is created.
                    Pre-filled with the room type's own rate (editable from
                    there); the label alongside always shows the resulting
                    total for the whole stay, updating live as it's overridden. */}
                {walkIn.roomTypeId && (
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Room Rate (₦/night)</label>
                    <div className="flex items-center gap-4 flex-wrap">
                      <input
                        type="number"
                        value={walkIn.roomRate !== "" ? walkIn.roomRate : String(selectedWalkInRoomType?.base_rate ?? "")}
                        onChange={(e) => setWalkIn((p) => ({ ...p, roomRate: e.target.value }))}
                        className={`${field.input} max-w-xs`}
                      />
                      <span className="text-xl text-[color:var(--text-color)]/76 whitespace-nowrap flex items-center gap-2 flex-wrap">
                        {walkInNights} night{walkInNights > 1 ? "s" : ""}
                        {Number(walkIn.roomsBooked) > 1 ? ` × ${walkIn.roomsBooked} rooms` : ""}
                        {" × "}{fmtCurrency(walkInRoomRate)} ={" "}
                        {walkInAllSelectedComplementary ? (
                          <s className="text-[color:var(--text-color)]/50">{fmtCurrency(walkInTotal)}</s>
                        ) : (
                          <strong className="text-[color:var(--black)]">{fmtCurrency(walkInTotal)}</strong>
                        )}
                        {walkInAllSelectedComplementary && (
                          <span className="flex items-center gap-2">
                            <RoomStatusTag status="complementary" />
                            <span className="text-lg text-[color:var(--text-color)]/68">no charge at check-in</span>
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Mixed multi-room case: some but not all selected rooms
                        are complementary — no single strike-through total
                        would read correctly, so name them instead. */}
                    {walkInComplementaryRoomNumbers.length > 0 && !walkInAllSelectedComplementary && (
                      <p className="text-lg text-purple-700">
                        Room{walkInComplementaryRoomNumbers.length > 1 ? "s" : ""} {walkInComplementaryRoomNumbers.join(", ")} {walkInComplementaryRoomNumbers.length > 1 ? "are" : "is"} complementary — no room charge will post for {walkInComplementaryRoomNumbers.length > 1 ? "them" : "it"} at check-in.
                      </p>
                    )}
                  </div>
                )}

                {/* Discount — applies against the room type's own base rate
                    (not whatever's currently typed in Room Rate above), and
                    writes the result straight into Room Rate so the total
                    updates live the same way overriding it directly would. */}
                {walkIn.roomTypeId && (
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>Discount ({walkIn.discountMode === "percentage" ? "%" : "₦/night"})</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <select
                        value={walkIn.discountMode}
                        onChange={(e) => handleWalkInDiscountChange({ discountMode: e.target.value })}
                        className={`${field.select} w-auto`}
                      >
                        <option value="fixed">Fixed (₦/night)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                      <input
                        type="number"
                        value={walkIn.discount}
                        onChange={(e) => handleWalkInDiscountChange({ discount: e.target.value })}
                        className={`${field.input} max-w-xs`}
                      />
                    </div>
                  </div>
                )}

                {/* Without Breakfast — a manual opt-out from the room type's
                    breakfast_rate, applied to every night of the stay. */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="walkin-without-breakfast"
                    checked={walkIn.withoutBreakfast}
                    onChange={(e) => setWalkIn((p) => ({ ...p, withoutBreakfast: e.target.checked }))}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="walkin-without-breakfast" className={`${field.label} cursor-pointer`}>
                    Without Breakfast
                  </label>
                </div>

                {/* Guest details */}
                <div className="flex flex-col gap-6">
                  {walkInKnownNames.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className={field.label}>Known Names</label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const [first, ...rest] = e.target.value.trim().split(/\s+/);
                          setWalkIn((p) => ({ ...p, guestFirstName: first, guestLastName: rest.join(" ") || "" }));
                        }}
                        className={field.select}
                      >
                        <option value="">Select a known name to prefill…</option>
                        {walkInKnownNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex flex-col gap-2 flex-1 min-w-48">
                      <label className={field.label}>
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="First name"
                        value={walkIn.guestFirstName}
                        onChange={(e) => setWalkIn((p) => ({ ...p, guestFirstName: e.target.value }))}
                        className={field.input}
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-48">
                      <label className={field.label}>Last Name</label>
                      <input
                        type="text"
                        placeholder="Last name"
                        value={walkIn.guestLastName}
                        onChange={(e) => setWalkIn((p) => ({ ...p, guestLastName: e.target.value }))}
                        className={field.input}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex flex-col gap-2 flex-1 min-w-48">
                      <label className={field.label}>
                        Phone <span className="text-red-500">*</span>
                        {walkInBlacklisted && (
                          <span className="ml-3 text-sm font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">Blacklisted</span>
                        )}
                      </label>
                      <input
                        type="tel"
                        placeholder="+234..."
                        value={walkIn.phone}
                        onChange={(e) => setWalkIn((p) => ({ ...p, phone: e.target.value }))}
                        className={field.input}
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-48">
                      <label className={field.label}>
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="guest@example.com"
                        value={walkIn.email}
                        onChange={(e) => setWalkIn((p) => ({ ...p, email: e.target.value }))}
                        className={field.input}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={field.label}>
                      Room Number{Number(walkIn.roomsBooked) > 1 ? "s" : ""}
                    </label>
                    {!walkIn.roomTypeId ? (
                      <p className="text-lg text-[color:var(--text-color)]/60">Select a room type first.</p>
                    ) : walkInRoomsLoading ? (
                      <p className="text-lg text-[color:var(--text-color)]/68">Loading available rooms…</p>
                    ) : noWalkInRoomsFree ? (
                      <p className="text-lg text-red-600">No rooms of this type are currently free.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: Number(walkIn.roomsBooked) || 1 }).map((_, index) => {
                          const value = walkIn.roomNumbers[index] || "";
                          const options = hasNumberedWalkInInventory && walkInAvailableRooms
                            ? walkInAvailableRooms.available.filter(
                                (r) => r.room_number === value || !walkIn.roomNumbers.includes(r.room_number),
                              )
                            : [];
                          return hasNumberedWalkInInventory ? (
                            <select
                              key={index}
                              value={value}
                              onChange={(e) => updateWalkInRoomNumber(index, e.target.value)}
                              className={`${field.select} w-44`}
                            >
                              <option value="">-- Select a room --</option>
                              {options.map((r) => (
                                <option key={r.id} value={r.room_number}>
                                  {r.room_number}{r.status === "complementary" ? " (Complementary)" : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              key={index}
                              type="text"
                              placeholder="e.g. 205"
                              value={value}
                              onChange={(e) => updateWalkInRoomNumber(index, e.target.value)}
                              className={`${field.input} w-44`}
                            />
                          );
                        })}
                        {walkInValidRoomNumbers.length < Number(walkIn.roomsBooked || 1) && (
                          <p className="text-lg text-orange-600">
                            {walkInValidRoomNumbers.length} of {walkIn.roomsBooked} room(s) assigned — a room number is required for every room before check-in.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment (optional) — a walk-in commonly pays at the desk
                    right away; recording it here saves the trip to the
                    folio afterward. Left blank, nothing is charged and the
                    folio opens exactly as it would without this section. */}
                <div className="flex flex-col gap-4 border-t border-[color:var(--text-color)]/10 pt-6">
                  <div>
                    <label className={field.label}>Payment (optional)</label>
                    <p className="text-lg text-[color:var(--text-color)]/68 mt-1">
                      If the guest is paying now, record it here — leave the amount blank to skip and record it later from the folio.
                    </p>
                  </div>
                  <PaymentSplitRows
                    splits={walkIn.paymentSplits}
                    setSplits={(splits) => setWalkIn((p) => ({ ...p, paymentSplits: splits }))}
                  />
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex flex-col gap-2 flex-1 min-w-48">
                      <label className={field.label}>Receipt Number</label>
                      <input
                        type="text"
                        placeholder="e.g. from the receipt book"
                        value={walkIn.paymentReceiptNumber}
                        onChange={(e) => setWalkIn((p) => ({ ...p, paymentReceiptNumber: e.target.value }))}
                        className={field.input}
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-48">
                      <label className={field.label}>Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. cash received at check-in"
                        value={walkIn.paymentNotes}
                        onChange={(e) => setWalkIn((p) => ({ ...p, paymentNotes: e.target.value }))}
                        className={field.input}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    walkInProcessing ||
                    !walkIn.roomTypeId ||
                    !walkIn.guestFirstName.trim() ||
                    !walkIn.phone.trim() ||
                    walkInValidRoomNumbers.length < Number(walkIn.roomsBooked || 1)
                  }
                  className={`${btn.primary} self-start px-12! py-4!`}
                >
                  {walkInProcessing ? "Processing..." : "Check In Guest"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {walkInReceipt && (
        <TransactionReceiptModal
          title={walkInReceipt.title}
          items={walkInReceipt.items}
          onClose={() => setWalkInReceipt(null)}
        />
      )}

      {/* ==== Check-in modal for expected arrivals ==== */}
      {selected && (
        <Modal
          onClose={() => setSelected(null)}
          title={selected.guest_name}
          subtitle="Confirm arrival details before checking the guest in."
          size="sm"
          footer={
            <>
              <button onClick={() => setSelected(null)} className={btn.secondary}>Cancel</button>
              <button onClick={() => navigate(`/admin/folios?reservation_id=${selected.id}`)} className={btn.secondary}>
                Go to Folio
              </button>
              <button
                onClick={handleCheckIn}
                disabled={processing || roomNumbers.length < (selected.rooms_booked || 1)}
                className={btn.success}
                title={roomNumbers.length < (selected.rooms_booked || 1) ? "Assign a room number to every room before checking in" : undefined}
              >
                {processing ? "Checking In..." : "Confirm Check In"}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[color:var(--text-color)]/3 rounded-lg px-5 py-4">
              <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">Room Type</p>
              <p className="text-2xl font-bold text-[color:var(--black)]">{selected.room_type?.name || "N/A"}</p>
            </div>
            <div className="bg-[color:var(--text-color)]/3 rounded-lg px-5 py-4">
              <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68 mb-1">Rooms Booked</p>
              <p className="text-2xl font-bold text-[color:var(--black)]">{selected.rooms_booked}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Room{selected.rooms_booked > 1 ? "s" : ""}</label>
            <RoomAssignmentPicker
              reservationId={selected.id}
              roomsBooked={selected.rooms_booked}
              initialRoomNumbers={roomNumbers}
              onSlotsChange={setRoomNumbers}
              hideSaveButton
            />
            {roomNumbers.length < (selected.rooms_booked || 1) && (
              <p className="text-lg text-orange-600">
                {roomNumbers.length} of {selected.rooms_booked} room(s) assigned — a room number is required for every room before check-in.
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
