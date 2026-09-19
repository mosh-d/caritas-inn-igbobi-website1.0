import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoDocumentTextOutline } from "react-icons/io5";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Button from "../components/shared/Button";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import { table, field } from "../components/shared/ui";
import { fetchAuditLogHistory, fetchAuditStaffOptions } from "../utils/audit-log-api";
import { isManager, isAccountant } from "../utils/auth";
import { useWebSocketContext } from "../context/WebSocketContext";

import DateInput from "../components/shared/DateInput";
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
  // The night audit's own entry for a run (the PMS's, 2026-09-18).
  night_audit: () => ({ path: "/admin/night-audit" }),
};

const LINK_LABELS = {
  folio: "View folio →",
  payment: "View folio →",
  reservation: "View reservation →",
  room_type: "View room →",
  room_inventory: "View room →",
  night_audit: "View night audit →",
};

// Every action code any controller currently records — see each
// controller's auditLogsService.record({ action: ... }) call. Kept as one
// list here so the filter dropdown and the table's fallback label always
// agree with what's actually being logged.
const ACTION_LABELS = {
  "reservation.early_checkout": "Early checkout",
  "drink_item.stock_movement": "Stock movement recorded",
  "payment.record": "Payment recorded",
  "payment.refund": "Payment refunded",
  "folio.close": "Folio closed",
  "folio.post_item": "Charge posted",
  "deposit.record": "Deposit recorded",
  "deposit.apply": "Deposit applied",
  "deposit.refund": "Deposit refunded",
  "room.price_update": "Room price updated",
  "room.status_change": "Room status changed",
  "shift.select": "Shift recorded",
  "ota_settlement.record": "OTA payment expected",
  "ota_settlement.paid": "OTA payment received",
  "reservation.confirm": "Reservation confirmed",
  "reservation.cancel": "Reservation cancelled",
  "reservation.checkin": "Check-in",
  "reservation.checkout": "Check-out",
  "reservation.extend": "Stay extended",
  // Written by the PMS itself, not a person (2026-09-18).
  "night_audit.charge": "Night audit charge",
  "night_audit.credit_applied": "Night audit: credit applied (PB)",
  "night_audit.run": "Night audit run",
};

// Every role whose actions can appear in a BRANCH audit trail. accountant
// and waitron were missing, so their entries could never be filtered for
// even though both have been generating them for a while; storekeeper joins
// them now. head_hr/hr are deliberately absent — they are Head Office
// accounts with no branch, so nothing they do lands in a branch's log.
const ROLE_LABELS = {
  manager: "Manager",
  receptionist: "Receptionist",
  accountant: "Accountant",
  waitron: "Waitron",
  storekeeper: "Store Keeper",
  developer: "Developer",
  // The PMS itself - the night audit's charges and the credit it settles
  // (owner, 2026-09-18). Shown as staff "PMS".
  auto: "Auto (PMS)",
};

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
  // Deep links from the reports' Action columns (see AuditLink in
  // reportUi.jsx) carry their filters in the URL. They seed the filters at the
  // very first render, so every effect below sees them from the start —
  // seeding them later, from an effect, let effects that had already captured
  // the empty values fire unfiltered loads over the filtered one.
  const [searchParams] = useSearchParams();
  const [filterStaffId, setFilterStaffId] = useState(() => searchParams.get("staff_id") || "");
  const [filterRole, setFilterRole] = useState("");
  const [filterAction, setFilterAction] = useState(() => searchParams.get("action") || "");
  const [filterFrom, setFilterFrom] = useState(() => searchParams.get("from") || "");
  const [filterTo, setFilterTo] = useState(() => searchParams.get("to") || "");
  const [filterSearch, setFilterSearch] = useState(() => searchParams.get("search") || "");
  const hasFilters = filterStaffId || filterRole || filterAction || filterFrom || filterTo || filterSearch;

  // Only the newest request may write the list. Several loads can be in
  // flight at once (arrival, a socket reconnect, typing), and without this a
  // slower, older response — possibly unfiltered — could land last and win.
  const latestRequest = useRef(0);

  const load = useCallback(async (p = 1, filters = {}) => {
    const requestId = ++latestRequest.current;
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
        search: filters.search || undefined,
      });
      if (requestId !== latestRequest.current) return;
      setEntries(data.data || []);
      setTotal(data.total || 0);
      setPage(p);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError((err.response?.data?.message || "Failed to load the audit trail.") + " Please refresh the page.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  // Load on arrival with the URL's filters, and again whenever the URL itself
  // changes — back/forward between two deep links keeps this page mounted.
  // The page's own controls do not write to the URL, so this never fights
  // them.
  const urlKey = searchParams.toString();
  useEffect(() => {
    if (!canView) return;
    const fromUrl = {
      staffId: searchParams.get("staff_id") || "",
      role: "",
      action: searchParams.get("action") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      search: searchParams.get("search") || "",
    };
    setFilterStaffId(fromUrl.staffId);
    setFilterAction(fromUrl.action);
    setFilterFrom(fromUrl.from);
    setFilterTo(fromUrl.to);
    setFilterSearch(fromUrl.search);
    load(1, fromUrl);
    fetchAuditStaffOptions().then(setStaffOptions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, urlKey]);

  // Re-fetch whenever the socket (re)connects, same pattern as
  // AdminNightAudit.jsx/AdminOverview.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!canView || !isConnected) return;
    load(1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo, search: filterSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, canView]);

  // Debounced — unlike the dropdown/date filters below (which fire
  // immediately since each change is one discrete action), reloading on
  // every keystroke here would mean one request per character typed.
  // Skips its mount run: the arrival load above already covered it, and this
  // one's job is only to follow typing.
  const searchTyped = useRef(false);
  useEffect(() => {
    if (!canView) return;
    if (!searchTyped.current) {
      searchTyped.current = true;
      return;
    }
    const timer = setTimeout(() => {
      load(1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo, search: filterSearch });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSearch]);

  const applyFilters = (next) => {
    const merged = {
      staffId: filterStaffId,
      role: filterRole,
      action: filterAction,
      from: filterFrom,
      to: filterTo,
      search: filterSearch,
      ...next,
    };
    setFilterStaffId(merged.staffId);
    setFilterRole(merged.role);
    setFilterAction(merged.action);
    setFilterFrom(merged.from);
    setFilterTo(merged.to);
    setFilterSearch(merged.search);
    load(1, merged);
  };

  const clearFilters = () => {
    setFilterStaffId("");
    setFilterRole("");
    setFilterAction("");
    setFilterFrom("");
    setFilterTo("");
    setFilterSearch("");
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
        <div className="flex flex-col gap-2 flex-1 min-w-64">
          <label className={field.label}>Search</label>
          <input
            type="text"
            placeholder="Guest name, staff, action…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className={field.input}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>Staff</label>
          <select
            value={filterStaffId}
            onChange={(e) => applyFilters({ staffId: e.target.value })}
            className={field.select}
          >
            <option value="">All staff</option>
            {/* The PMS has no staff account; its empty value would read as
                "All staff". The Role filter's "Auto (PMS)" singles it out. */}
            {staffOptions.filter((s) => s.staff_account_id).map((s) => (
              <option key={s.staff_account_id} value={s.staff_account_id}>{s.username}</option>
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
          <DateInput
            value={filterFrom}
            onChange={(e) => applyFilters({ from: e.target.value })}
            className={field.input}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={field.label}>To</label>
          <DateInput
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
                      <th className={`${table.th} ${table.stickyTh}`}>Staff</th>
                      <th className={table.th}>When</th>
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
                          <td className="px-8 py-4 font-semibold sticky left-0 z-10 bg-white group-hover:bg-[color-mix(in_srgb,black_2%,white)] [box-shadow:inset_-1px_0_0_color-mix(in_srgb,var(--text-color)_12%,transparent)]">{entry.username}</td>
                          <td className="px-8 py-4 text-xl whitespace-nowrap text-[color:var(--text-color)]/84">{formatWhen(entry.created_at)}</td>
                          <td className="px-8 py-4 hidden md:table-cell">
                            <StatusBadge status={entry.role} />
                          </td>
                          <td className="px-8 py-4 text-xl min-w-[32rem]">
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
                  onClick={() => load(page - 1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo, search: filterSearch })}
                  disabled={page === 1}
                  className={page === 1 ? "opacity-30 cursor-not-allowed" : ""}
                >
                  Previous
                </Button>
                <span className="text-lg font-medium">Page {page} of {pages}</span>
                <Button
                  variant="emphasis"
                  onClick={() => load(page + 1, { staffId: filterStaffId, role: filterRole, action: filterAction, from: filterFrom, to: filterTo, search: filterSearch })}
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
