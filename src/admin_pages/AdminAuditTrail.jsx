import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoDocumentTextOutline } from "react-icons/io5";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Button from "../components/shared/Button";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import { table, field } from "../components/shared/ui";
import { fetchAuditLogHistory, fetchAuditStaffOptions } from "../utils/audit-log-api";
import { isManager, isAccountant } from "../utils/auth";
import { useWebSocketContext } from "../context/WebSocketContext";

// Maps a Phase-2 rich entry's entity_type to the deep link that opens it.
// Two different existing conventions get reused here, each already built
// for a different page: AdminFolios.jsx/AdminReservations.jsx read ?id=
// query params (same as ?tab=, ?reservation_id= elsewhere), while
// AdminRooms.jsx reads React Router `location.state` (same as the
// Overview page's out-of-order/complementary/reserved banners already use).
const ENTITY_LINKS = {
  folio: (entry) => ({ path: `/admin/folios?folio_id=${entry.entity_id}` }),
  payment: (entry) => ({ path: `/admin/folios?folio_id=${entry.parent_entity_id}&highlight_payment_id=${entry.entity_id}` }),
  reservation: (entry) => ({ path: `/admin/reservations?reservation_id=${entry.entity_id}` }),
  room_type: (entry) => ({ path: "/admin/rooms", state: { openRoomTypeId: entry.entity_id } }),
  room_inventory: (entry) => ({
    path: "/admin/rooms",
    state: { openRoomTypeId: entry.parent_entity_id, expandPhysicalRooms: true, highlightRoomInventoryId: entry.entity_id },
  }),
};

const LINK_LABELS = {
  folio: "View folio →",
  payment: "View folio →",
  reservation: "View reservation →",
  room_type: "View room →",
  room_inventory: "View room →",
};

// Every action code any controller currently records — see each
// controller's auditLogsService.record({ action: ... }) call. Kept as one
// list here so the filter dropdown and the table's fallback label always
// agree with what's actually being logged.
const ACTION_LABELS = {
  "payment.record": "Payment recorded",
  "payment.refund": "Payment refunded",
  "folio.close": "Folio closed",
  "folio.post_item": "Charge posted",
  "deposit.record": "Deposit recorded",
  "deposit.apply": "Deposit applied",
  "deposit.refund": "Deposit refunded",
  "room.price_update": "Room price updated",
  "room.status_change": "Room status changed",
  "reservation.confirm": "Reservation confirmed",
  "reservation.cancel": "Reservation cancelled",
  "reservation.checkin": "Check-in",
  "reservation.checkout": "Check-out",
  "reservation.extend": "Stay extended",
};

const ROLE_LABELS = { manager: "Manager", receptionist: "Receptionist", developer: "Developer" };

// Explicit timeZone so this always shows the hotel's own local time
// (Africa/Lagos) — without it, toLocaleString renders in whatever timezone
// the VIEWING device happens to be set to, which silently drifts from the
// branch's real wall-clock time if that's ever different (e.g. a device
// set to UTC shows every timestamp an hour behind actual WAT).
const formatWhen = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const PAGE_SIZE = 20;

export default function AdminAuditTrail() {
  // Manager and accountant both get full read access here — an accountant
  // reviewing the books needs the same trace-back-to-who-did-what visibility
  // a manager has, just never the ability to act on any of it (this page is
  // already read-only for everyone).
  const canView = isManager() || isAccountant();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [staffOptions, setStaffOptions] = useState([]);
  const [filterStaffId, setFilterStaffId] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const hasFilters = filterStaffId || filterRole || filterAction || filterFrom || filterTo;

  const load = useCallback(async (p = 1, filters = {}) => {
    try {
      setLoading(true);
      const data = await fetchAuditLogHistory({
        page: p,
        limit: PAGE_SIZE,
        staff_account_id: filters.staffId || undefined,
        role: filters.role || undefined,
        action: filters.action || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setEntries(data.data || []);
      setTotal(data.total || 0);
      setPage(p);
      setError(null);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load the audit trail.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    load(1);
    fetchAuditStaffOptions().then(setStaffOptions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  // Re-fetch whenever the socket (re)connects, same pattern as
  // AdminNightAudit.jsx/AdminOverview.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!canView || !isConnected) return;
    load(1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, canView]);

  const applyFilters = (next) => {
    const merged = {
      staffId: filterStaffId,
      role: filterRole,
      action: filterAction,
      from: filterFrom,
      to: filterTo,
      ...next,
    };
    setFilterStaffId(merged.staffId);
    setFilterRole(merged.role);
    setFilterAction(merged.action);
    setFilterFrom(merged.from);
    setFilterTo(merged.to);
    load(1, merged);
  };

  const clearFilters = () => {
    setFilterStaffId("");
    setFilterRole("");
    setFilterAction("");
    setFilterFrom("");
    setFilterTo("");
    load(1, {});
  };

  if (!canView) {
    return (
      <div data-component="AdminAuditTrail" className="px-[4rem] max-sm:px-[1rem] py-[4rem]">
        <p className="text-2xl text-[color:var(--text-color)]/68">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div data-component="AdminAuditTrail" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <div>
        <PageHeading icon={IoDocumentTextOutline}>Audit Trail</PageHeading>
        <p className="text-2xl text-[color:var(--text-color)]/76 mt-2">
          A record of actions taken by staff on this branch's account. Manager and developer visibility only.
        </p>
      </div>

      <div className="w-full flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <label className={field.label}>Staff</label>
          <select
            value={filterStaffId}
            onChange={(e) => applyFilters({ staffId: e.target.value })}
            className={field.select}
          >
            <option value="">All staff</option>
            {staffOptions.map((s) => (
              <option key={s.staff_account_id} value={s.staff_account_id}>{s.display_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Role</label>
          <select
            value={filterRole}
            onChange={(e) => applyFilters({ role: e.target.value })}
            className={field.select}
          >
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Action</label>
          <select
            value={filterAction}
            onChange={(e) => applyFilters({ action: e.target.value })}
            className={field.select}
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => applyFilters({ from: e.target.value })}
            className={field.input}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>To</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => applyFilters({ to: e.target.value })}
            className={field.input}
          />
        </div>

        {hasFilters && (
          <Button variant="light-gray" onClick={clearFilters}>Clear filters</Button>
        )}
      </div>

      <div className="w-full flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <p className="text-red-600 text-xl">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-2xl text-[color:var(--text-color)]/68">
            {hasFilters ? "No actions match these filters." : "No actions have been recorded yet."}
          </p>
        ) : (
          <>
            <div className={table.card}>
              <div className={table.scroll}>
                <table className={table.el}>
                  <thead>
                    <tr className={table.headRow}>
                      <th className={table.th}>When</th>
                      <th className={table.th}>Staff</th>
                      <th className={`${table.th} hidden md:table-cell`}>Role</th>
                      <th className={table.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const link = entry.entity_type && ENTITY_LINKS[entry.entity_type]
                        ? ENTITY_LINKS[entry.entity_type](entry)
                        : null;
                      return (
                        <tr key={entry.id} className={table.row}>
                          <td className="px-8 py-4 text-xl text-[color:var(--text-color)]/84">{formatWhen(entry.created_at)}</td>
                          <td className="px-8 py-4 font-semibold">{entry.display_name}</td>
                          <td className="px-8 py-4 hidden md:table-cell">
                            <StatusBadge status={entry.role} />
                          </td>
                          <td className="px-8 py-4 text-xl">
                            {entry.label ? (
                              <span className="flex flex-wrap items-center gap-3">
                                {entry.label}
                                {link && (
                                  <button
                                    onClick={() => navigate(link.path, { state: link.state })}
                                    className="text-lg font-semibold text-[color:var(--emphasis)] hover:underline cursor-pointer whitespace-nowrap"
                                  >
                                    {LINK_LABELS[entry.entity_type] || "View →"}
                                  </button>
                                )}
                              </span>
                            ) : (
                              <>
                                <span className="font-mono text-[color:var(--text-color)]/76">{entry.method}</span>{" "}
                                {entry.route}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {pages > 1 && (
              <div className="flex justify-center items-center gap-4 w-full mt-6">
                <Button
                  variant="emphasis"
                  onClick={() => load(page - 1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo })}
                  disabled={page === 1}
                  className={page === 1 ? "opacity-30 cursor-not-allowed" : ""}
                >
                  Previous
                </Button>
                <span className="text-lg font-medium">Page {page} of {pages}</span>
                <Button
                  variant="emphasis"
                  onClick={() => load(page + 1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo })}
                  disabled={page === pages}
                  className={page === pages ? "opacity-30 cursor-not-allowed" : ""}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
