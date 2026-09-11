import { useWebSocketContext } from '../context/WebSocketContext';
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { IoClose } from 'react-icons/io5';
import { verifyToken, getDefaultAdminRoute, getStoredStaffRole } from "../utils/auth";
import { canAccessNavItem } from "../components/shared/adminNavItems";
import AdminNavBar from "../components/shared/AdminNavBar";
import AdminTopBar from "../components/shared/AdminTopBar";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { fetchBusinessDate } from "../utils/front-office-api";
import { applyServerClock, deviceClockDriftMinutes, currentBusinessDateISO } from "../utils/date-utils";
import ShiftGate from "../components/shared/ShiftGate";
import { fetchCurrentShift } from "../utils/shifts-api";

// The rotas that get a 6am prompt of their own. Every other role works
// without one, and never sees the readout — a manager has no use for a list
// of other people's rotas in the top bar.
const SHIFT_ROLES = ["receptionist", "waitron"];
const SHIFT_LABELS = { receptionist: "Front desk", waitron: "F&B" };

export default function AdminRootLayout() {
  const [hasNewReservation, setHasNewReservation] = useState(false);
  const { subscribe } = useWebSocketContext();
  const navigate = useNavigate();

  const handleNewReservation = useCallback(() => {
    setHasNewReservation(true);
  }, []);

  const openNewReservation = () => {
    setHasNewReservation(false);
    navigate("/admin/reservations");
  };

  // A role with no nav access to Reservations (accountant, waitron) has
  // nowhere for this popup to usefully send them — clicking it used to
  // dead-end them on a page they can't really use. Never subscribing means
  // hasNewReservation can't become true for them, so the popup itself never
  // appears.
  const canSeeReservations = canAccessNavItem("/admin/reservations");

  useEffect(() => {
    if (!canSeeReservations) return;
    const unsubscribe = subscribe(handleNewReservation, 'reservations');
    return unsubscribe;
  }, [subscribe, handleNewReservation, canSeeReservations]);

  // Whose shift the business day is, per rota, recorded at the 6am rollover.
  //
  // Only a rota's own people are locked out until theirs is recorded (owner's
  // call, 2026-09-11): staff resume around 8am while the business day starts
  // at 6am, so deriving the shift from whoever logs in first would either
  // leave 06:00-07:59 unattributed or block work through it.
  const staffRole = getStoredStaffRole();
  const lockRole = SHIFT_ROLES.includes(staffRole) ? staffRole : null;
  // A manager or developer sees both rotas and can correct either, without
  // being locked out of anything; anyone with a rota of their own sees just
  // that one; every other role (an accountant, say) is shown none at all,
  // rather than a list of other people's rotas.
  const seesEveryRota = staffRole === "manager" || staffRole === "developer";
  const visibleShiftRoles = seesEveryRota ? SHIFT_ROLES : lockRole ? [lockRole] : [];
  const visibleShiftKey = visibleShiftRoles.join(",");
  const [shifts, setShifts] = useState({});
  const [changingRole, setChangingRole] = useState(null);
  const [businessDate, setBusinessDate] = useState(currentBusinessDateISO());

  // A tab left open across 6am has to notice the rollover, since the new day
  // has no shift recorded yet. Compared locally each minute; only a real
  // change costs a request.
  useEffect(() => {
    const timer = setInterval(() => setBusinessDate(currentBusinessDateISO()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!visibleShiftKey) return undefined;
    let cancelled = false;
    visibleShiftKey.split(",").forEach((role) => {
      fetchCurrentShift(role)
        .then((current) => { if (!cancelled) setShifts((all) => ({ ...all, [role]: current })); })
        .catch(() => { if (!cancelled) setShifts((all) => ({ ...all, [role]: null })); });
    });
    return () => { cancelled = true; };
  }, [visibleShiftKey, businessDate]);

  // Only lock on a KNOWN empty shift — if the request itself failed the entry
  // is null, and work continues rather than being shut out by an API hiccup.
  const lockShift = lockRole ? shifts[lockRole] : null;
  const mustRecordShift = Boolean(lockRole && lockShift && !lockShift.staff_account_id);
  const gateRole = changingRole || (mustRecordShift ? lockRole : null);
  const shiftReadouts = visibleShiftRoles.map((role) => ({
    key: role,
    // One rota of your own needs no qualifier; a developer sees both, so both
    // get named.
    label: visibleShiftRoles.length > 1 ? SHIFT_LABELS[role] : "Shift",
    name: shifts[role]?.staff_name || null,
    onChange: shifts[role] ? () => setChangingRole(role) : undefined,
  }));

  // Anchor every admin-facing date helper to the server's clock, once per
  // session. A front-desk PC with a wrong clock or timezone otherwise shows
  // the wrong day's arrivals and defaults every report to the wrong date —
  // the client half of the fix that followed the 2026-08-11 midnight
  // walk-in incident. Failure is deliberately silent: the helpers keep
  // using the device clock exactly as before, so a network blip degrades to
  // the old behaviour rather than blocking the page.
  const [clockDriftMinutes, setClockDriftMinutes] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchBusinessDate()
      .then((d) => {
        if (cancelled || !d?.server_time) return;
        applyServerClock(d.server_time);
        setClockDriftMinutes(deviceClockDriftMinutes());
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isLoginPage = location.pathname === "/admin";

  useEffect(() => {
    let cancelled = false;
    let firstCheck = true;

    const checkAuth = async () => {
      try {
        const userData = await verifyToken();
        if (cancelled) return;
        setIsAuthenticated(!!userData);

        // Redirect to login if not authenticated and not on login page
        if (!userData && !isLoginPage) {
          window.location.href = "/admin";
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Authentication check failed:", error);
        setIsAuthenticated(false);
        if (!isLoginPage) {
          window.location.href = "/admin";
        }
      } finally {
        // Only the very first check should gate the loading spinner — a
        // later, visibility-triggered recheck (below) must stay silent
        // unless it actually finds the session dead, or every tab refocus
        // would flash the full-page spinner over whatever the user's doing.
        if (!cancelled && firstCheck) {
          firstCheck = false;
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // This layout is a persistent nested-route layout (see the <Outlet/>
    // below) — it does NOT remount when navigating between /admin/* pages,
    // so without this, the single checkAuth() call above is the ONLY
    // verification this session ever gets for as long as the tab stays
    // open, regardless of how many real days pass (a laptop sleep/wake, or
    // just leaving the tab open, never triggers a remount either). Re-
    // running on visibility regain closes that gap: reopening the laptop or
    // switching back to this tab after a long absence re-validates the
    // token for real instead of trusting React state that's days stale.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkAuth();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isLoginPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
      {/* ── New Reservation Notification ── */}
      {hasNewReservation && (
        <div className="fixed top-34 right-6 z-[200] animate-notification">
          <div
            onClick={openNewReservation}
            className="bg-white border-l-4 border-[var(--emphasis)] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 rounded-lg flex items-center gap-6 min-w-[320px] backdrop-blur-sm animate-bounce-subtle cursor-pointer hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)] transition-shadow"
          >
            <div className="bg-[var(--emphasis)]/10 p-3 rounded-full">
              <span className="text-3xl" style={{ color: 'var(--emphasis)' }}>🔔</span>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 leading-tight">New Reservation</h4>
              <p className="text-gray-600 text-lg">You have a new reservation</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setHasNewReservation(false); }}
              className="text-gray-400 hover:text-[var(--emphasis)] transition-colors p-1"
            >
              <IoClose size={24} />
            </button>
          </div>
        </div>
      )}

        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If on login page and already authenticated, redirect to this role's
  // default landing page (see getDefaultAdminRoute)
  if (isLoginPage && isAuthenticated) {
    return <Navigate to={getDefaultAdminRoute()} replace />;
  }

  // Don't show layout for login page
  if (isLoginPage) {
    return <Outlet />;
  }

  // Show protected layout for authenticated users.
  // h-screen + overflow-hidden pins the shell to the viewport so the sidebar
  // and the main body scroll independently (each gets its own overflow-y-auto).
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* ── New Reservation Notification ── */}
      {hasNewReservation && (
        <div className="fixed top-34 right-6 z-[200] animate-notification">
          <div
            onClick={openNewReservation}
            className="bg-white border-l-4 border-[var(--emphasis)] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 rounded-lg flex items-center gap-6 min-w-[320px] backdrop-blur-sm animate-bounce-subtle cursor-pointer hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)] transition-shadow"
          >
            <div className="bg-[var(--emphasis)]/10 p-3 rounded-full">
              <span className="text-3xl" style={{ color: 'var(--emphasis)' }}>🔔</span>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 leading-tight">New Reservation</h4>
              <p className="text-gray-600 text-lg">You have a new reservation</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setHasNewReservation(false); }}
              className="text-gray-400 hover:text-[var(--emphasis)] transition-colors p-1"
            >
              <IoClose size={24} />
            </button>
          </div>
        </div>
      )}

      {/* The dates on screen are already correct — they follow the server,
          not this machine. This tells whoever is on the desk that the PC
          itself needs fixing, since its clock still drives everything
          outside this app. 10 minutes is wide enough to ignore ordinary
          drift and network latency. */}
      {Math.abs(clockDriftMinutes) > 10 && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 text-orange-800 text-lg shrink-0">
          This computer's clock is off by about {Math.abs(clockDriftMinutes)} minutes
          ({clockDriftMinutes > 0 ? "behind" : "ahead of"} the hotel's server).
          Dates shown here are correct, but please have the clock corrected.
        </div>
      )}

      <header className="bg-white shadow-sm shrink-0">
        <AdminTopBar shifts={shiftReadouts} />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AdminNavBar />
        <main className="flex-1 overflow-y-auto p-0 md:p-6">
          <Outlet />
        </main>
      </div>

      {gateRole && (
        <ShiftGate
          role={gateRole}
          businessDate={shifts[gateRole]?.business_date}
          currentName={shifts[gateRole]?.staff_name}
          onSelected={(result) => {
            setShifts((all) => ({
              ...all,
              [result.role]: {
                business_date: result.business_date,
                role: result.role,
                staff_account_id: result.staff_account_id,
                staff_name: result.staff_name,
              },
            }));
            setChangingRole(null);
          }}
          onCancel={changingRole ? () => setChangingRole(null) : undefined}
        />
      )}
    </div>
  );
}
