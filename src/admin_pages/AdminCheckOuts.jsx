import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoClose, IoLogOutOutline } from "react-icons/io5";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { btn, table } from "../components/shared/ui";
import { fetchCheckOutList } from "../utils/front-office-api";
import { checkOutReservation, shortenStayToDeparture } from "../utils/reservations-pms-api";
import { fetchFolios } from "../utils/folios-api";
import { adminTodayISO, hasPassedNoonCutoff } from "../utils/date-utils";
import { useWebSocketContext } from "../context/WebSocketContext";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }) : "N/A");
const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const todayISO = () => adminTodayISO();
// Whether this reservation's scheduled checkout has actually become due
// (noon Lagos on check_out) — the date picker above can be browsed to a
// future date, so a listed reservation isn't necessarily due yet. Labels the
// row button only; what the modal actually offers is decided by
// departsEarly below, which is the one that has billing consequences.
const isCheckoutDue = (checkOut) => checkOut && hasPassedNoonCutoff(checkOut);
// Whether the booked check_out is still ahead of today — i.e. the guest is
// leaving early and the reservation still says otherwise.
//
// This matters for money, not tidiness: checkOut()'s safety-net charge
// targets the BOOKED last night, so leaving it wrong either bills a night
// the guest never reached or, before 6am, bills that phantom night while the
// night they did sleep is skipped by the night audit's "still present at 6am"
// rule and never billed at all. Correcting the date first makes an ordinary
// checkout bill exactly what was slept.
const departsEarly = (checkOut, today) => Boolean(checkOut) && String(checkOut).slice(0, 10) > today;

export default function AdminCheckOutsPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [selected, setSelected] = useState(null);
  const [folio, setFolio] = useState(null);
  const [folioLoading, setFolioLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adjustingDate, setAdjustingDate] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchCheckOutList(date);
      setReservations(Array.isArray(result) ? result : []);
      setError(null);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load check-out list.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const openCheckOut = async (reservation) => {
    setSelected(reservation);
    setFolio(null);
    setFolioLoading(true);
    try {
      const result = await fetchFolios({ reservation_id: reservation.id });
      setFolio((result.data && result.data[0]) || null);
    } catch {
      setFolio(null);
    } finally {
      setFolioLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selected) return;
    try {
      setProcessing(true);
      await checkOutReservation(selected.id);
      setSuccessMessage(`${selected.guest_name} checked out.`);
      setTimeout(() => setSuccessMessage(""), 5000);
      setSelected(null);
      loadList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to check out.");
    } finally {
      setProcessing(false);
    }
  };

  // Corrects check_out to the night the guest is actually leaving on, so the
  // normal checkout below bills the right night. The date is computed
  // server-side; nothing here does business-day arithmetic.
  const handleAdjustDate = async () => {
    if (!selected) return;
    try {
      setAdjustingDate(true);
      const updated = await shortenStayToDeparture(selected.id);
      setSelected((p) => ({ ...p, check_out: updated.check_out, total_rate: updated.total_rate }));
      setSuccessMessage("Checkout date corrected to today — the stay now bills only the nights actually slept.");
      setTimeout(() => setSuccessMessage(""), 5000);
      loadList();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to adjust the checkout date.");
    } finally {
      setAdjustingDate(false);
    }
  };

  const balanceDue = folio && Number(folio.balance) > 0;
  // Blocks Check Out until the date is corrected — see departsEarly.
  const selectedDepartsEarly = selected && departsEarly(selected.check_out, todayISO());

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

      <div data-component="AdminCheckOuts" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
        <div className="flex flex-col justify-between items-start gap-4">
          <PageHeading icon={IoLogOutOutline}>Check-Out List</PageHeading>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 bg-white text-[color:var(--text-color)] placeholder:text-[color:var(--text-color)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)] focus:border-transparent transition-shadow text-xl!`}
          />
        </div>

        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Guest</th>
                  <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                  <th className={`${table.th} hidden md:table-cell`}>Checked In</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : error ? (
                  <tr><td colSpan="4" className="px-8 py-10 text-center text-red-600 text-xl">{error}</td></tr>
                ) : reservations.length === 0 ? (
                  <tr><td colSpan="4" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No expected check-outs for this date.</td></tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.id} className={table.row}>
                      <td className={`${table.td} font-medium`}>{r.guest_name}</td>
                      <td className={`${table.td} hidden md:table-cell`}>{r.room_type?.name || "N/A"}</td>
                      <td className={`${table.td} hidden md:table-cell`}>{formatDate(r.actual_check_in)}</td>
                      <td className={table.td}>
                        <div className={table.actions}>
                          <button onClick={() => openCheckOut(r)} className={isCheckoutDue(r.check_out) ? btn.rowPrimary : btn.rowDanger}>
                            {isCheckoutDue(r.check_out) ? "Check Out" : "Early Departure"}
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

      {/* ==== Check-out confirmation modal ==== */}
      {selected && (
        <Modal
          onClose={() => setSelected(null)}
          title={selectedDepartsEarly ? `Early Departure — ${selected.guest_name}` : selected.guest_name}
          subtitle={selectedDepartsEarly
            ? "Their booked check-out is still ahead — correct the date first so the bill matches the nights actually slept."
            : "Review the folio balance before completing check-out."}
          size="sm"
          footer={
            <>
              <button onClick={() => setSelected(null)} className={btn.secondary}>Cancel</button>
              {selectedDepartsEarly ? (
                <button onClick={handleAdjustDate} disabled={adjustingDate || processing} className={btn.primary}>
                  {adjustingDate ? "Adjusting..." : "Set Checkout Date to Today"}
                </button>
              ) : (
                <button onClick={handleCheckOut} disabled={processing} className={btn.success}>
                  {processing ? "Checking Out..." : "Confirm Check Out"}
                </button>
              )}
            </>
          }
        >
          {selectedDepartsEarly && (
            <div className="text-xl text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex flex-col gap-2">
              <p>
                Booked to leave <strong>{formatDate(selected.check_out)}</strong>, but leaving now. Checking out
                against the booked date would bill a night they never stayed — and before 6am it would also leave
                last night unbilled.
              </p>
              <p>
                Setting the date to today re-prices the stay to the nights actually slept, and unlocks Check Out.
              </p>
            </div>
          )}
          {folioLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : folio ? (
            <div className={`flex justify-between items-center text-xl px-5 py-4 rounded-lg border ${balanceDue ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
              <span className="font-bold">Folio Balance</span>
              <span className="font-bold text-2xl">{money(folio.balance)}</span>
            </div>
          ) : (
            <p className="text-xl text-[color:var(--text-color)]/76">No folio found for this reservation.</p>
          )}
          {balanceDue && (
            <div className="flex flex-col gap-3">
              <p className="text-xl text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-5 py-4">
                ⚠ Outstanding balance — consider settling payment before checkout.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/admin/folios?reservation_id=${selected.id}`)}
                className={`${btn.secondary} self-start`}
              >
                Go to Folio to Record Payment
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
