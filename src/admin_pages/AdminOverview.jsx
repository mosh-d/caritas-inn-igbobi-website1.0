import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMaintenanceMode } from "../utils/room-data";
import { useWebSocketContext } from "../context/WebSocketContext";
import {
  IoGridOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoHomeOutline,
  IoBedOutline,
  IoCashOutline,
  IoWalletOutline,
  IoMoonOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoConstructOutline,
  IoGiftOutline,
  IoBriefcaseOutline,
} from "react-icons/io5";

import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import { table } from "../components/shared/ui";
import { fetchCheckInList, fetchCheckOutList, fetchInHouse } from "../utils/front-office-api";
import { fetchRoomStatusList, fetchHouseStatus } from "../utils/reservations-pms-api";
import { fetchAlerts } from "../utils/alerts-api";
import { fetchReportsDashboard } from "../utils/reports-api";
import { fetchNightAuditHistory } from "../utils/night-audit-api";
import { fetchReservations } from "../utils/reservations-pms-api";
import { adminTodayISO } from "../utils/date-utils";

// Local-getter based, not toISOString() — toISOString() always converts to
// UTC first, which for Lagos (WAT, UTC+1) silently reports the wrong
// calendar date. monthStartISO in particular built a local-midnight Date
// for the 1st of the month and always shifted it back to the last day of
// the *previous* month once converted — a permanent off-by-one in the
// "month to date" report range, not just a midnight edge case.
const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayISO = () => adminTodayISO();
const monthStartISO = () => {
  const now = new Date();
  return toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1));
};
const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalISO(d);
};
const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric" }) : "N/A";

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // ── Dashboard data (composed from existing endpoints, all JWT branch-scoped) ──
  const [glance, setGlance] = useState({ arrivals: null, departures: null, inHouse: null });
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [lastAudit, setLastAudit] = useState(undefined); // undefined = loading, null = none yet
  const [recentBookings, setRecentBookings] = useState([]);
  const [roomStatusCounts, setRoomStatusCounts] = useState({
    outOfOrder: 0,
    complementary: 0,
    reserved: 0,
    outOfOrderFirst: null, // { roomTypeId, roomInventoryId } — for the "take me there" deep link
    complementaryFirst: null,
    reservedFirst: null,
    reservedRoomNumbers: [], // shown inline on the banner — a manager reservation is worth naming, unlike a generic maintenance flag
  });

  const loadRoomData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await fetchHouseStatus();
      setRoomTypes(data.room_types || []);
    } catch (error) {
      console.error("Error loading room data:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    const today = todayISO();
    const [arrivals, departures, inHouse, alerts, report, audits, bookings] =
      await Promise.allSettled([
        fetchCheckInList(today),
        fetchCheckOutList(today),
        fetchInHouse(),
        fetchAlerts(),
        fetchReportsDashboard(monthStartISO(), today),
        fetchNightAuditHistory({ page: 1, limit: 1 }),
        fetchReservations({ page: 1, limit: 5 }),
      ]);

    setGlance({
      arrivals: arrivals.status === "fulfilled" && Array.isArray(arrivals.value) ? arrivals.value.length : null,
      departures: departures.status === "fulfilled" && Array.isArray(departures.value) ? departures.value.length : null,
      inHouse: inHouse.status === "fulfilled" && Array.isArray(inHouse.value) ? inHouse.value.length : null,
    });
    if (alerts.status === "fulfilled") setAlertsSummary(alerts.value);
    if (report.status === "fulfilled") setReportSummary(report.value);
    if (audits.status === "fulfilled") setLastAudit((audits.value.data && audits.value.data[0]) || null);
    if (bookings.status === "fulfilled") setRecentBookings(bookings.value.data || []);
  }, []);

  // Counts of physical rooms manually flagged out-of-order/complementary
  // (see RoomInventory.status) — separate from loadDashboard since the only
  // thing that changes it is a 'rooms' websocket event (setRoomStatus),
  // not the reservation/alert events that drive the rest of the dashboard.
  const loadRoomStatusCounts = useCallback(async () => {
    try {
      const data = await fetchRoomStatusList();
      let outOfOrder = 0;
      let complementary = 0;
      let reserved = 0;
      let outOfOrderFirst = null;
      let complementaryFirst = null;
      let reservedFirst = null;
      const reservedRoomNumbers = [];
      for (const rt of data.room_types || []) {
        for (const room of rt.rooms || []) {
          if (room.display_status === "out_of_order") {
            outOfOrder++;
            if (!outOfOrderFirst) outOfOrderFirst = { roomTypeId: rt.room_type_id, roomInventoryId: room.room_inventory_id };
          } else if (room.display_status === "complementary") {
            complementary++;
            if (!complementaryFirst) complementaryFirst = { roomTypeId: rt.room_type_id, roomInventoryId: room.room_inventory_id };
          } else if (room.display_status === "reserved") {
            reserved++;
            if (!reservedFirst) reservedFirst = { roomTypeId: rt.room_type_id, roomInventoryId: room.room_inventory_id };
            reservedRoomNumbers.push(room.room_number);
          }
        }
      }
      setRoomStatusCounts({ outOfOrder, complementary, reserved, outOfOrderFirst, complementaryFirst, reservedFirst, reservedRoomNumbers });
    } catch (error) {
      console.error("Error loading room status counts:", error);
    }
  }, []);

  const checkMaintenanceMode = useCallback(async () => {
    try {
      const data = await fetchMaintenanceMode();
      if (data.maintenance_mode !== undefined) {
        setMaintenanceMode(data.maintenance_mode === 1);
      }
    } catch (error) {
      console.error("Error checking maintenance mode:", error);
    }
  }, []);

  const handleRoomsUpdated = useCallback((data) => {
    console.log('📡 [AdminOverview] WebSocket update received:', data);
    loadRoomData(false);
    loadRoomStatusCounts();
  }, [loadRoomData, loadRoomStatusCounts]);

  const { subscribe, isConnected, disconnectedRefreshTick } = useWebSocketContext();

  useEffect(() => {
    loadRoomData(true);
    loadDashboard();
    loadRoomStatusCounts();
    checkMaintenanceMode();
    const unsubscribeRooms = subscribe(handleRoomsUpdated, 'rooms');
    // Live refresh of the dashboard when bookings or alerts change
    const unsubscribeReservations = subscribe(loadDashboard, 'reservations');
    const unsubscribeAlerts = subscribe(loadDashboard, 'alerts');
    // Dashboard still gets a slow clock-driven refresh independent of any
    // data change — e.g. "Arrivals Today" rolls over at midnight with no
    // underlying mutation to trigger a websocket event. Room data and
    // maintenance mode don't have that problem (see the isConnected effect
    // below), so they no longer poll.
    const dashboardInterval = setInterval(() => {
      loadDashboard();
      loadRoomStatusCounts();
    }, 60000);
    return () => {
      if (unsubscribeRooms) unsubscribeRooms();
      if (unsubscribeReservations) unsubscribeReservations();
      if (unsubscribeAlerts) unsubscribeAlerts();
      clearInterval(dashboardInterval);
    };
  }, [loadRoomData, loadDashboard, loadRoomStatusCounts, checkMaintenanceMode, handleRoomsUpdated, subscribe]);

  // Re-sync room data + maintenance mode whenever the socket (re)connects.
  // Socket.IO's default emit has no queue/replay — an event broadcast while
  // this client is disconnected (network blip, laptop sleep, a backend
  // redeploy) is gone for good, and the 'connect' handler in
  // WebSocketContext doesn't refetch anything on its own. This closes that
  // gap without a fixed-interval poll: it only runs on an actual
  // connection-state change, which is rare, not every few seconds.
  useEffect(() => {
    if (!isConnected) return;
    loadRoomData(false);
    checkMaintenanceMode();
  }, [isConnected, loadRoomData, checkMaintenanceMode]);

  // Fallback: if the socket stays disconnected, keep refreshing via plain
  // HTTP every 30s anyway (see WebSocketContext.jsx). disconnectedRefreshTick
  // only ever changes while genuinely disconnected, so no isConnected guard
  // is needed here — unlike the effect above, this one intentionally does
  // NOT fire on the initial connect (tick starts at 0 and stays there until
  // a real outage happens).
  useEffect(() => {
    if (disconnectedRefreshTick === 0) return;
    loadRoomData(false);
    checkMaintenanceMode();
  }, [disconnectedRefreshTick, loadRoomData, checkMaintenanceMode]);

  // ── Derived dashboard values ──
  // occupied/held only ever reflect real guest activity (a checked-in guest,
  // or a hold/confirmed reservation for tonight not yet checked in) — never
  // out-of-order or manager-reserved rooms, which are a maintenance/admin
  // block with no guest attached (see RoomsService.getHouseStatusSummary).
  const totalRooms = roomTypes.reduce((s, rt) => s + (rt.total_rooms || 0), 0);
  const totalOccupiedOrHeld = roomTypes.reduce((s, rt) => s + (rt.occupied || 0) + (rt.held || 0), 0);
  const totalAvailable = roomTypes.reduce((s, rt) => s + (rt.available || 0), 0);
  const occupancyPct = totalRooms > 0 ? Math.round((totalOccupiedOrHeld / totalRooms) * 100) : 0;

  const alertTotal = alertsSummary?.total ?? 0;
  const alertParts = alertsSummary
    ? [
        { count: alertsSummary.missed_check_ins?.length ?? 0, label: "missed check-in" },
        { count: alertsSummary.overdue_checkouts?.length ?? 0, label: "overdue checkout" },
        { count: alertsSummary.overdue_balances?.length ?? 0, label: "unpaid balance" },
      ].filter((p) => p.count > 0)
    : [];

  const reportTotals = reportSummary?.summary || {};
  const paymentsCollectedMTD = (reportSummary?.paymentMethods || []).reduce((s, m) => s + (m.total || 0), 0);

  // Audit is "current" if the latest run covers yesterday's business date (or later)
  const auditCurrent = lastAudit && String(lastAudit.audit_date).slice(0, 10) >= yesterdayISO();

  return (
    <>
      <div
        data-component="AdminOverview"
        className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[4.5rem]"
      >
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <PageHeading icon={IoGridOutline}>Overview</PageHeading>

          {/* Night audit status chip */}
          {lastAudit !== undefined && (
            <button
              onClick={() => navigate("/admin/night-audit")}
              className={`flex items-start gap-3 px-5 pt-[0.8rem] pb-[0.4rem] rounded-full text-xl font-semibold cursor-pointer transition-colors ${
                auditCurrent
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
              title="Go to Night Audit"
            >
              <IoMoonOutline size={18} className="-mt-1" />
              {lastAudit === null
                ? "No night audit run yet"
                : auditCurrent
                ? `Night audit up to date (${formatDate(lastAudit.audit_date)})`
                : `Night audit overdue — last run ${formatDate(lastAudit.audit_date)}`}
            </button>
          )}
        </div>

        {/* ── Alerts strip ── */}
        {alertsSummary && (
          alertTotal > 0 ? (
            <button
              onClick={() => navigate("/admin/alerts")}
              className="w-full flex items-center justify-between gap-12 bg-orange-50 border border-orange-200 rounded-xl px-6 py-4 cursor-pointer hover:bg-orange-100 transition-colors text-left"
            >
              <span className="flex items-center gap-4 text-xl text-orange-800">
                <IoWarningOutline size={24} className="shrink-0 text-orange-600" />
                <span>
                  <strong className="font-bold">{alertTotal} alert{alertTotal !== 1 ? "s" : ""} need attention:</strong>{" "}
                  {alertParts.map((p, i) => (
                    <span key={p.label}>
                      {i > 0 && " · "}
                      {p.count} {p.label}{p.count !== 1 ? "s" : ""}
                    </span>
                  ))}
                </span>
              </span>
              <span className="text-xl font-bold text-orange-700 whitespace-nowrap">View Alerts →</span>
            </button>
          ) : (
            <div className="w-full flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-xl text-green-700">
              <IoCheckmarkCircleOutline size={24} className="shrink-0" />
              All clear — no outstanding alerts.
            </div>
          )
        )}

        {/* ── Rooms needing attention (manual out-of-order/complementary/reserved flags) ── */}
        {(roomStatusCounts.outOfOrder > 0 || roomStatusCounts.complementary > 0 || roomStatusCounts.reserved > 0) && (
          <div className="w-full flex flex-col sm:flex-row gap-4">
            {roomStatusCounts.outOfOrder > 0 && (
              <StatusBanner
                icon={IoConstructOutline}
                boldText={`${roomStatusCounts.outOfOrder} room${roomStatusCounts.outOfOrder !== 1 ? "s" : ""} out of order`}
                detail="needs maintenance before it can be sold"
                color="red"
                onClick={() => navigate("/admin/rooms", {
                  state: {
                    openRoomTypeId: roomStatusCounts.outOfOrderFirst?.roomTypeId,
                    expandPhysicalRooms: true,
                    highlightRoomInventoryId: roomStatusCounts.outOfOrderFirst?.roomInventoryId,
                  },
                })}
              />
            )}
            {roomStatusCounts.complementary > 0 && (
              <StatusBanner
                icon={IoGiftOutline}
                boldText={`${roomStatusCounts.complementary} room${roomStatusCounts.complementary !== 1 ? "s" : ""} complementary`}
                detail="no room charge applied"
                color="purple"
                onClick={() => navigate("/admin/rooms", {
                  state: {
                    openRoomTypeId: roomStatusCounts.complementaryFirst?.roomTypeId,
                    expandPhysicalRooms: true,
                    highlightRoomInventoryId: roomStatusCounts.complementaryFirst?.roomInventoryId,
                  },
                })}
              />
            )}
            {roomStatusCounts.reserved > 0 && (
              <StatusBanner
                icon={IoBriefcaseOutline}
                boldText={`${roomStatusCounts.reserved} room${roomStatusCounts.reserved !== 1 ? "s" : ""} reserved (${roomStatusCounts.reservedRoomNumbers.join(", ")})`}
                detail="set aside for a branch/zonal manager"
                color="indigo"
                onClick={() => navigate("/admin/rooms", {
                  state: {
                    openRoomTypeId: roomStatusCounts.reservedFirst?.roomTypeId,
                    expandPhysicalRooms: true,
                    highlightRoomInventoryId: roomStatusCounts.reservedFirst?.roomInventoryId,
                  },
                })}
              />
            )}
          </div>
        )}

        {/* ── Today at a glance ── */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlanceCard
            icon={IoLogInOutline}
            label="Arrivals Today"
            value={glance.arrivals}
            sub="expected check-ins"
            onClick={() => navigate("/admin/check-ins")}
          />
          <GlanceCard
            icon={IoLogOutOutline}
            label="Departures Today"
            value={glance.departures}
            sub="expected check-outs"
            onClick={() => navigate("/admin/check-outs")}
          />
          <GlanceCard
            icon={IoHomeOutline}
            label="In-House Now"
            value={glance.inHouse}
            sub="guests currently staying"
            onClick={() => navigate("/admin/in-house")}
          />
          <GlanceCard
            icon={IoBedOutline}
            label="Available Tonight"
            value={isLoading ? null : totalAvailable}
            sub={`of ${totalRooms} rooms · ${occupancyPct}% occupied`}
            onClick={() => navigate("/admin/rooms")}
          />
        </div>

        {/* ── Month to date ── */}
        {reportSummary && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GlanceCard
              icon={IoCashOutline}
              label="Collected This Month"
              value={money(paymentsCollectedMTD)}
              sub="payments received MTD"
              onClick={() => navigate("/admin/reports")}
              accent
            />
            <GlanceCard
              icon={IoWalletOutline}
              label="Outstanding"
              value={money(reportTotals.total_outstanding)}
              sub="balance still owed"
              onClick={() => navigate("/admin/folios?tab=pending")}
              warn={Number(reportTotals.total_outstanding) > 0}
            />
            <GlanceCard
              icon={IoGridOutline}
              label="Stays This Month"
              value={reportTotals.total_stays ?? "—"}
              sub={`${reportTotals.completed_stays ?? 0} completed`}
              onClick={() => navigate("/admin/reports")}
            />
          </div>
        )}

        {/* ── House Status ── */}
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-3xl font-bold text-[color:var(--black)]">House Status</h2>
          <div className={table.card}>
            <div className={table.scroll}>
              <table className={table.el}>
                <thead>
                  <tr className={table.headRow}>
                    <th className={table.th}>Room Type</th>
                    <th className={`${table.th} text-right!`}>Total Rooms</th>
                    <th className={`${table.th} text-right!`}>Occupied / Held</th>
                    <th className={`${table.th} text-right!`}>Available</th>
                    <th className={table.th}>Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="5" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">Loading…</td></tr>
                  ) : roomTypes.length === 0 ? (
                    <tr><td colSpan="5" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No room types configured.</td></tr>
                  ) : (
                    roomTypes.map((rt) => {
                      const total = rt.total_rooms || 0;
                      const available = rt.available || 0;
                      // Out-of-order/reserved rooms are excluded here on
                      // purpose — they're a maintenance/admin block, not a
                      // guest, and shouldn't inflate this figure (see
                      // RoomsService.getHouseStatusSummary).
                      const occupied = (rt.occupied || 0) + (rt.held || 0);
                      const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                      return (
                        <tr key={rt.room_type_id} className={table.row}>
                          <td className={`${table.td} font-medium`}>{rt.room_type_name}</td>
                          <td className={`${table.td} text-right!`}>{total}</td>
                          <td className={`${table.td} text-right!`}>{occupied}</td>
                          <td className={`${table.td} text-right! font-bold ${available === 0 ? "text-red-600" : "text-green-700"}`}>{available}</td>
                          <td className={table.td}>
                            <div className="flex items-center gap-3">
                              <div className="w-40 max-sm:w-24 h-3 rounded-full bg-[color:var(--text-color)]/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-orange-400" : "bg-green-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-lg text-[color:var(--text-color)]/76 w-14">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Recent bookings ── */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-[color:var(--black)]">Recent Bookings</h2>
            <button
              onClick={() => navigate("/admin/reservations")}
              className="text-xl font-bold text-[color:var(--emphasis)] hover:underline cursor-pointer"
            >
              View all →
            </button>
          </div>
          <div className={table.card}>
            <div className={table.scroll}>
              <table className={table.el}>
                <thead>
                  <tr className={table.headRow}>
                    <th className={table.th}>Guest</th>
                    <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                    <th className={`${table.th} hidden md:table-cell`}>Check-In</th>
                    <th className={`${table.th} hidden md:table-cell`}>Check-Out</th>
                    <th className={table.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr><td colSpan="5" className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No bookings yet.</td></tr>
                  ) : (
                    recentBookings.map((r) => (
                      <tr key={r.id} className={table.row}>
                        <td className={`${table.td} font-medium`}>
                          <div>{r.guest_name}</div>
                          <div className="text-base text-[color:var(--text-color)]/68">{r.booking_reference}</div>
                        </td>
                        <td className={`${table.td} hidden md:table-cell`}>{r.room_type?.name || "N/A"}</td>
                        <td className={`${table.td} hidden md:table-cell`}>{formatDate(r.check_in)}</td>
                        <td className={`${table.td} hidden md:table-cell`}>{formatDate(r.check_out)}</td>
                        <td className={table.td}><StatusBadge status={r.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {maintenanceMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999 }}
        >
          <div
            style={{
              padding: "4rem",
              borderRadius: "1rem",
              maxWidth: "50rem",
              textAlign: "center",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔧</div>
            <h2
              style={{
                fontSize: "2.4rem",
                fontWeight: "bold",
                marginBottom: "1rem" }}
            >
              Maintenance In Progress
            </h2>
            <p style={{ fontSize: "1.6rem", color: "#666" }}>
              Our system is currently undergoing scheduled maintenance. Please check back later.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// `Icon` is used below as the JSX tag <Icon .../>; ESLint's no-unused-vars doesn't detect
// JSX-only usage of a destructured function-parameter binding (confirmed with an isolated
// repro — the identical destructure works fine as a variable declaration, so this is an
// ESLint limitation, not dead code).
// eslint-disable-next-line no-unused-vars
function GlanceCard({ icon: Icon, label, value, sub, onClick, accent, warn }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-6 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
        accent
          ? "bg-[color:var(--emphasis)] border-transparent text-white"
          : warn
          ? "bg-white border-orange-200"
          : "bg-white border-[color:var(--text-color)]/10"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-[3.2rem] h-[3.2rem] rounded-lg flex items-center justify-center shrink-0 ${
          accent ? "bg-white/15 text-white" : "bg-[color:var(--emphasis)]/10 text-[color:var(--emphasis)]"
        }`}>
          <Icon size={18} />
        </span>
        <p className={`text-xl font-semibold uppercase tracking-wide ${accent ? "text-white/70" : "text-[color:var(--text-color)]/68"}`}>
          {label}
        </p>
      </div>
      <p className={`text-4xl font-bold ${accent ? "text-white" : warn ? "text-orange-600" : "text-[color:var(--black)]"}`}>
        {value === null || value === undefined ? "…" : value}
      </p>
      {sub && (
        <p className={`text-lg mt-1 ${accent ? "text-white/60" : "text-[color:var(--text-color)]/60"}`}>{sub}</p>
      )}
    </button>
  );
}

// Mimics the alerts strip above (colored border, faint/opaque background,
// bold lead-in) so manager-facing status flags read consistently at a
// glance — used for out-of-order/complementary/reserved room counts.
const STATUS_BANNER_THEMES = {
  red: "bg-red-50 border-red-200 text-red-800 hover:bg-red-100",
  purple: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100",
};
const STATUS_BANNER_ICON_THEMES = {
  red: "text-red-600",
  purple: "text-purple-600",
  indigo: "text-indigo-600",
};

// eslint-disable-next-line no-unused-vars
function StatusBanner({ icon: Icon, boldText, detail, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-4 border rounded-xl px-6 py-4 text-left text-xl cursor-pointer transition-colors ${STATUS_BANNER_THEMES[color]}`}
    >
      <Icon size={24} className={`shrink-0 ${STATUS_BANNER_ICON_THEMES[color]}`} />
      <span>
        <strong className="font-bold">{boldText}</strong>
        {detail && <> — {detail}</>}
      </span>
    </button>
  );
}
