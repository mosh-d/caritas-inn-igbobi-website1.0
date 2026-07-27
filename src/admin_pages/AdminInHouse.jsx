import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoClose, IoHomeOutline } from "react-icons/io5";
import Modal from "../components/shared/Modal";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import RoomAssignmentPicker from "../components/shared/RoomAssignmentPicker";
import ContactRow from "../components/shared/ContactRow";
import { btn, field, table } from "../components/shared/ui";
import { fetchInHouse, fetchInHouseById } from "../utils/front-office-api";
import {
  checkOutReservation,
  extendStay,
  assignRoom,
  fetchRoomStatusList,
  fetchReservationNotes,
  addReservationNote,
  deleteReservationNote,
} from "../utils/reservations-pms-api";
import { fetchFolios } from "../utils/folios-api";
import { useWebSocketContext } from "../context/WebSocketContext";
import { hasPassedNoonCutoff } from "../utils/date-utils";
import RoomStatusTag from "../components/shared/RoomStatusTag";

const roomStatusKey = (roomTypeId, roomNumber) => `${roomTypeId}::${roomNumber}`;

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A");
const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const isOverdue = (checkOut) => checkOut && hasPassedNoonCutoff(checkOut);

export default function AdminInHousePage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [assigningRoom, setAssigningRoom] = useState(false);
  const [modalError, setModalError] = useState("");
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [folio, setFolio] = useState(null);
  const [folioLoading, setFolioLoading] = useState(false);
  const [roomStatusMap, setRoomStatusMap] = useState(new Map());
  const [reservationNotes, setReservationNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [notesError, setNotesError] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");

  const loadRoomStatus = useCallback(async () => {
    try {
      const data = await fetchRoomStatusList();
      const map = new Map();
      for (const rt of data.room_types || []) {
        for (const r of rt.rooms) {
          map.set(roomStatusKey(rt.room_type_id, r.room_number), r.display_status);
        }
      }
      setRoomStatusMap(map);
    } catch {
      // Non-critical — the tag just won't show if this fails.
    }
  }, []);

  useEffect(() => { loadRoomStatus(); }, [loadRoomStatus]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchInHouse();
      setReservations(Array.isArray(result) ? result : []);
      setError(null);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load in-house guest list.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    loadList();
    loadRoomStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const openDetail = async (reservation) => {
    setDetailLoading(true);
    setFolio(null);
    setFolioLoading(true);
    setModalError("");
    try {
      const [full, folioResult] = await Promise.all([
        fetchInHouseById(reservation.id),
        fetchFolios({ reservation_id: reservation.id }).catch(() => null),
      ]);
      setSelected(full);
      setFolio((folioResult?.data && folioResult.data[0]) || null);
      setNewCheckOutDate("");
      setReservationNotes([]);
      setNewNoteText("");
      setNotesError("");
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load guest detail.") + " Please refresh the page.");
    } finally {
      setDetailLoading(false);
      setFolioLoading(false);
    }
    try {
      const notes = await fetchReservationNotes(reservation.id);
      setReservationNotes(Array.isArray(notes) ? notes : []);
    } catch {
      setReservationNotes([]);
    }
  };

  // Lets other pages (Room Chart) deep-link straight to one guest's detail
  // view, e.g. /admin/in-house?reservation_id=123 — clicking an "active"
  // bar there routes here.
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
    setSelected(null);
    setFolio(null);
    setModalError("");
    setReservationNotes([]);
    setNewNoteText("");
    setNotesError("");
  };
  const balanceDue = folio && Number(folio.balance) > 0;

  const handleCheckOut = async () => {
    if (!selected) return;
    try {
      setProcessing(true);
      await checkOutReservation(selected.id);
      setSuccessMessage(`${selected.guest_name} checked out.`);
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadList();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to check out.");
    } finally {
      setProcessing(false);
    }
  };

  const handleExtendStay = async () => {
    if (!selected || !newCheckOutDate) return;
    try {
      setProcessing(true);
      await extendStay(selected.id, newCheckOutDate);
      setSuccessMessage("Stay extended.");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeDetail();
      loadList();
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to extend stay.");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (!selected || !newNoteText.trim()) return;
    try {
      setAddingNote(true);
      setNotesError("");
      const note = await addReservationNote(selected.id, newNoteText.trim());
      setReservationNotes((prev) => [note, ...prev]);
      setNewNoteText("");
    } catch (err) {
      setNotesError(err.response?.data?.message || "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!selected) return;
    try {
      setDeletingNoteId(noteId);
      setNotesError("");
      await deleteReservationNote(selected.id, noteId);
      setReservationNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setNotesError(err.response?.data?.message || "Failed to delete note.");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleAssignRoom = async (roomNumbers) => {
    if (!selected) return;
    try {
      setAssigningRoom(true);
      await assignRoom(selected.id, roomNumbers);
      const full = await fetchInHouseById(selected.id);
      setSelected(full);
      loadList();
      setSuccessMessage("Room assignments saved.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to assign room.");
    } finally {
      setAssigningRoom(false);
    }
  };

  const roomTypeOptions = useMemo(() => {
    const seen = new Map();
    for (const r of reservations) {
      if (r.room_type?.id && !seen.has(r.room_type.id)) seen.set(r.room_type.id, r.room_type.name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    if (roomTypeFilter === "all") return reservations;
    return reservations.filter((r) => String(r.room_type?.id) === roomTypeFilter);
  }, [reservations, roomTypeFilter]);

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

      <div data-component="AdminInHouse" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <PageHeading icon={IoHomeOutline}>In-House Guests</PageHeading>
          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className={`${field.select} w-auto text-xl!`}
          >
            <option value="all">All Room Categories</option>
            {roomTypeOptions.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
        </div>

        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Guest</th>
                  <th className={`${table.th} hidden md:table-cell`}>Room(s)</th>
                  <th className={`${table.th} hidden md:table-cell`}>Checked In</th>
                  <th className={table.th}>Expected Check-Out</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
                ) : error ? (
                  <tr><td colSpan="5" className="px-8 py-10 text-center text-red-600 text-xl">{error}</td></tr>
                ) : filteredReservations.length === 0 ? (
                  <tr><td colSpan="5" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">
                    {reservations.length === 0 ? "No guests currently in-house." : "No guests in-house match this room category."}
                  </td></tr>
                ) : (
                  filteredReservations.map((r) => (
                    <tr key={r.id} className={table.row}>
                      <td className={`${table.td} align-top font-medium`}>{r.guest_name}</td>
                      <td className={`${table.td} align-top hidden md:table-cell`}>
                        {(r.room_assignments || []).length === 0 ? (
                          "Unassigned"
                        ) : (
                          <div className="flex flex-col flex-wrap gap-1.5">
                            {r.room_assignments.map((ra) => (
                              <span key={ra.id} className="flex items-center gap-1.5 whitespace-nowrap">
                                {ra.room_number}
                                <RoomStatusTag status={roomStatusMap.get(roomStatusKey(ra.room_type_id, ra.room_number))} />
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`${table.td} align-top hidden md:table-cell`}>{formatDate(r.actual_check_in)}</td>
                      <td className={`${table.td} align-top`}>
                        <div className="flex items-center gap-3">
                          {formatDate(r.check_out)}
                          {isOverdue(r.check_out) && (
                            <span className="text-sm font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">Overdue</span>
                          )}
                        </div>
                      </td>
                      <td className={`${table.td} align-top`}>
                        <div className={table.actions}>
                          <button onClick={() => openDetail(r)} className={btn.rowPrimary}>View</button>
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

      {/* ==== In-house guest detail modal ==== */}
      {(selected || detailLoading) && (
        <Modal
          onClose={closeDetail}
          loading={detailLoading || !selected}
          title={selected?.guest_name || ""}
          subtitle={selected ? `${selected.room_type?.name || "N/A"} · Checked in ${formatDate(selected.actual_check_in)}` : ""}
          badge={selected && isOverdue(selected.check_out) && (
            <span className="inline-block px-3 py-1 rounded-full text-lg font-bold leading-tight whitespace-nowrap bg-red-100 text-red-700">Overdue</span>
          )}
          size="md"
          footer={selected && (
            <>
              <button onClick={closeDetail} className={btn.secondary}>Close</button>
              <button
                onClick={() => navigate(`/admin/folios?reservation_id=${selected.id}`)}
                disabled={!folio}
                className={btn.secondary}
                title={!folio ? "No folio linked to this reservation yet" : undefined}
              >
                Go to Folio
              </button>
              <button onClick={handleCheckOut} disabled={processing} className={btn.success}>
                {processing ? "Processing..." : "Check Out"}
              </button>
            </>
          )}
        >
          {detailLoading || !selected ? (
            <LoadingSpinner size="lg" />
          ) : (
            <>
              {modalError && (
                <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{modalError}</p>
              )}

              <div className="grid grid-cols-1 gap-4">
                <ContactRow type="email" value={selected.guest_email} />
                <ContactRow type="phone" value={selected.phone_number} />
                <DetailRow label="Checked In" value={formatDate(selected.actual_check_in)} />
                <DetailRow label="Expected Check-Out" value={formatDate(selected.check_out)} />
              </div>

              {folioLoading ? (
                <div className="flex justify-center"><LoadingSpinner /></div>
              ) : folio ? (
                <div className={`flex justify-between items-center text-xl px-5 py-4 rounded-lg border ${balanceDue ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                  <span className="font-bold">Folio Balance</span>
                  <span className="font-bold text-2xl">{money(folio.balance)}</span>
                </div>
              ) : (
                <p className="text-xl text-[color:var(--text-color)]/76">No folio found for this reservation.</p>
              )}
              {balanceDue && (
                <p className="text-xl text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-5 py-4">
                  ⚠ Outstanding balance — consider settling payment before checkout.
                </p>
              )}

              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Notes</h3>
                <p className="text-lg text-[color:var(--text-color)]/60 -mt-2">
                  Notes for this stay (e.g. "Arriving late") — shows up in the Manifest report. Separate from Special Requests on the Reservations page.
                </p>
                {notesError && (
                  <p className="text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{notesError}</p>
                )}
                {reservationNotes.length === 0 ? (
                  <p className="text-xl text-[color:var(--text-color)]/76">No notes yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {reservationNotes.map((n) => (
                      <div key={n.id} className="flex justify-between items-center gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl">
                        <span className="break-words">{n.note}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          disabled={deletingNoteId === n.id}
                          className="p-1 text-[color:var(--text-color)]/50 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                          aria-label="Delete note"
                        >
                          <IoClose size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 items-center flex-wrap">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNote(); } }}
                    placeholder="e.g. Arriving late"
                    className={`${field.input} w-auto flex-1 min-w-[16rem]`}
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNoteText.trim()}
                    className={btn.secondary}
                  >
                    {addingNote ? "Adding..." : "+ Add Note"}
                  </button>
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Room Assignments</h3>
                <RoomAssignmentPicker
                  reservationId={selected.id}
                  roomsBooked={selected.rooms_booked}
                  initialRoomNumbers={(selected.room_assignments || []).map((ra) => ra.room_number)}
                  onSave={handleAssignRoom}
                  saving={assigningRoom}
                />
              </section>

              <section className="flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6">
                <h3 className="text-2xl font-bold text-[color:var(--black)]">Extend Stay</h3>
                <div className="flex gap-3 flex-nowrap items-center">
                  <input
                    type="date"
                    value={newCheckOutDate}
                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                    className={field.input}
                  />
                  <button
                    onClick={handleExtendStay}
                    disabled={processing || !newCheckOutDate || balanceDue}
                    className={`${btn.primary} whitespace-nowrap`}
                    title={balanceDue ? "Settle the outstanding balance before extending the stay" : undefined}
                  >
                    Extend
                  </button>
                </div>
                {balanceDue && (
                  <p className="text-lg text-orange-600">Settle the outstanding balance before extending this stay.</p>
                )}
              </section>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl w-full">
      <span className="block font-semibold text-[color:var(--text-color)]/68 uppercase tracking-wide text-lg">{label}</span>
      <span className="block font-medium break-words">{value}</span>
    </div>
  );
}
