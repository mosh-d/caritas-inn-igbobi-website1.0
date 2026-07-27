import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoClose, IoNotificationsOutline } from "react-icons/io5";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Button from "../components/shared/Button";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import { btn, table } from "../components/shared/ui";
import { fetchAlerts } from "../utils/alerts-api";
import { markNoShow } from "../utils/reservations-pms-api";
import { useWebSocketContext } from "../context/WebSocketContext";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";

const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const daysAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return diff === 0 ? "today" : diff === 1 ? "yesterday" : `${diff} days ago`;
};

// check_in/check_out are date-only values (always stored as UTC midnight
// representing a Lagos calendar day) — "today"/"yesterday" here has to mean
// a real calendar-day difference, not raw elapsed milliseconds. The plain
// daysAgo() above divides elapsed ms by 86400000, which is wrong for a
// date-only field: a check-in from "yesterday" (calendar-wise, in Lagos)
// can still be under 24 real hours in the past — exactly how a missed
// check-in from Jul 21 kept showing "(today)" after midnight on the 22nd.
// Shifts by the fixed WAT (UTC+1, no DST) offset before reading UTC date
// fields — same trick as todayInBranchTimezone() on the backend — to get
// the correct Lagos calendar date regardless of what timezone the viewing
// browser happens to be in.
const WAT_OFFSET_MS = 60 * 60000;
const calendarDaysAgo = (date) => {
  const d = new Date(date);
  const dateDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const nowShifted = new Date(Date.now() + WAT_OFFSET_MS);
  const todayDay = Date.UTC(nowShifted.getUTCFullYear(), nowShifted.getUTCMonth(), nowShifted.getUTCDate());
  const diff = Math.round((todayDay - dateDay) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
};

// Takes `now` as a param (driven by a 1s setInterval in the page component)
// rather than reading Date.now() itself, so every countdown on the page
// ticks in lockstep and re-renders live instead of only updating whenever
// the alerts list happens to refetch.
const timeUntil = (date, now) => {
  const diffMs = new Date(date).getTime() - now;
  if (diffMs <= 0) return "Expiring now";
  const totalSeconds = Math.ceil(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m ${seconds}s`;
};

const PAGE_SIZE = 10;

function Pagination({ page, total, onPage }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-4 w-full mt-6">
      <Button variant="emphasis" onClick={() => onPage(page - 1)} disabled={page === 1} className={page === 1 ? "opacity-30 cursor-not-allowed" : ""}>Previous</Button>
      <span className="text-lg font-medium">Page {page} of {pages}</span>
      <Button variant="emphasis" onClick={() => onPage(page + 1)} disabled={page === pages} className={page === pages ? "opacity-30 cursor-not-allowed" : ""}>Next</Button>
    </div>
  );
}

export default function AdminAlertsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("missed");
  const [pages, setPages] = useState({ missed: 1, overdue: 1, balances: 1, unconfirmed: 1 });
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const { subscribe, alertCount, syncAlertCount, isConnected } = useWebSocketContext();

  // Drives every hold-expiry countdown on this page — ticks once a second so
  // "Unconfirmed" reads a live, second-accurate countdown instead of a value
  // frozen until the next alerts refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAlerts();
      setAlerts(data);
      setError(null);
      // Keep the sidebar badge in lockstep with this page's own total instead
      // of waiting on the next 5-minute backend cron tick or a reconnect —
      // this is the one place that already has a fresh, authoritative count.
      syncAlertCount(data.total ?? 0);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load alerts.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [syncAlertCount]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);
  useEffect(() => subscribe(loadAlerts, "alerts"), [subscribe, loadAlerts]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  useEffect(() => {
    if (!isConnected) return;
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleMarkNoShow = async (reservationId, guestName) => {
    try {
      setActionLoading(reservationId);
      await markNoShow(reservationId);
      setSuccessMessage(`${guestName} marked as no-show.`);
      setTimeout(() => setSuccessMessage(""), 5000);
      loadAlerts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark as no-show.");
    } finally {
      setActionLoading(null);
    }
  };

  const missed = alerts?.missed_check_ins ?? [];
  const overdue = alerts?.overdue_checkouts ?? [];
  const balances = alerts?.overdue_balances ?? [];
  const unconfirmed = alerts?.unconfirmed ?? [];

  const setPage = (key, p) => setPages((prev) => ({ ...prev, [key]: p }));

  const paginate = (arr, key) =>
    arr.slice((pages[key] - 1) * PAGE_SIZE, pages[key] * PAGE_SIZE);

  const tabs = [
    { key: "missed", label: "Missed Check-Ins", count: missed.length },
    { key: "unconfirmed", label: "Unconfirmed", count: unconfirmed.length },
    { key: "overdue", label: "Overdue Checkouts", count: overdue.length },
    { key: "balances", label: "Overdue Balances", count: balances.length },
  ];

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl z-50 flex items-center gap-4 shadow-lg">
          <span className="text-xl font-bold">{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="cursor-pointer"><IoClose size={24} /></button>
        </div>
      )}

      <div data-component="AdminAlerts" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
        <PageHeading
          icon={IoNotificationsOutline}
          badge={alertCount > 0 && (
            <span className="bg-red-600 text-white text-2xl font-bold rounded-full pb-1.5 pt-1 pl-2.5 pr-1 min-w-[2.5rem] text-center">
              {alertCount}
            </span>
          )}
        >
          Alerts
        </PageHeading>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[color:var(--text-color)]/20 w-full">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-8 py-3 text-xl font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                tab === key
                  ? "border-[color:var(--emphasis)] text-[color:var(--emphasis)]"
                  : "border-transparent text-[color:var(--text-color)]/76 hover:text-[color:var(--text-color)]"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xl font-bold rounded-full pl-3 pr-3.5 pt-1 pb-1.5 sm:pr-2 md:pt-2 min-w-[1.4rem] text-center leading-tight ${
                  tab === key ? "bg-[color:var(--emphasis)] text-white" : "bg-red-600 text-white"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="w-full flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <p className="text-red-600 text-xl">{error}</p>
        ) : (
          <>
            {/* Missed Check-Ins */}
            {tab === "missed" && (
              missed.length === 0 ? (
                <AllClear message="No missed check-ins." />
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <p className="text-xl text-[color:var(--text-color)]/76">
                    Confirmed (paid) reservations whose check-in date has passed with no arrival recorded.
                  </p>
                  <div className={table.card}>
                    <div className={table.scroll}>
                      <table className={table.el}>
                        <thead>
                          <tr className={table.headRow}>
                            <th className={table.th}>Guest</th>
                            <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                            <th className={`${table.th} hidden md:table-cell`}>Check-In Was</th>
                            <th className={`${table.th} hidden md:table-cell`}>Status</th>
                            <th className={table.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(missed, "missed").map((r) => (
                            <tr key={r.id} className={table.row}>
                              <td className={`${table.td} font-medium`}>
                                <div>{r.guest_name}</div>
                                <div className="text-base text-[color:var(--text-color)]/68">{r.booking_reference}</div>
                              </td>
                              <td className={`${table.td} hidden md:table-cell`}>{r.room_type?.name || "N/A"}</td>
                              <td className={`${table.td} hidden md:table-cell`}>
                                {formatDate(r.check_in)}
                                <span className="ml-2 text-base text-orange-600 font-semibold">({calendarDaysAgo(r.check_in)})</span>
                              </td>
                              <td className={`${table.td} hidden md:table-cell`}><StatusBadge status={r.status} /></td>
                              <td className={table.td}>
                                <div className={table.actions}>
                                  <button onClick={() => navigate("/admin/reservations")} className={btn.rowPrimary}>
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleMarkNoShow(r.id, r.guest_name)}
                                    disabled={actionLoading === r.id}
                                    className={btn.rowSecondary}
                                  >
                                    {actionLoading === r.id ? "..." : "No-Show"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Pagination page={pages.missed} total={missed.length} onPage={(p) => setPage("missed", p)} />
                </div>
              )
            )}

            {/* Unconfirmed */}
            {tab === "unconfirmed" && (
              unconfirmed.length === 0 ? (
                <AllClear message="No unconfirmed reservations." />
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <p className="text-xl text-[color:var(--text-color)]/76">
                    Awaiting payment confirmation — auto-cancelled and released back to availability if left unconfirmed for too long.
                  </p>
                  <div className={table.card}>
                    <div className={table.scroll}>
                      <table className={table.el}>
                        <thead>
                          <tr className={table.headRow}>
                            <th className={table.th}>Guest</th>
                            <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                            <th className={`${table.th} hidden md:table-cell`}>Booked</th>
                            <th className={table.th}>Auto-Cancels</th>
                            <th className={table.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(unconfirmed, "unconfirmed").map((r) => (
                            <tr key={r.id} className={table.row}>
                              <td className={`${table.td} font-medium`}>
                                <div>{r.guest_name}</div>
                                <div className="text-base text-[color:var(--text-color)]/68">{r.booking_reference}</div>
                              </td>
                              <td className={`${table.td} hidden md:table-cell`}>{r.room_type?.name || "N/A"}</td>
                              <td className={`${table.td} hidden md:table-cell`}>{daysAgo(r.created_at)}</td>
                              <td className={table.td}>
                                <span className="text-base text-orange-600 font-semibold">{timeUntil(r.expires_at, now)}</span>
                              </td>
                              <td className={table.td}>
                                <div className={table.actions}>
                                  <button onClick={() => navigate("/admin/reservations")} className={btn.rowPrimary}>
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Pagination page={pages.unconfirmed} total={unconfirmed.length} onPage={(p) => setPage("unconfirmed", p)} />
                </div>
              )
            )}

            {/* Overdue Checkouts */}
            {tab === "overdue" && (
              overdue.length === 0 ? (
                <AllClear message="No overdue checkouts." />
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <p className="text-xl text-[color:var(--text-color)]/76">
                    Guests still in-house past their scheduled departure date.
                  </p>
                  <div className={table.card}>
                    <div className={table.scroll}>
                      <table className={table.el}>
                        <thead>
                          <tr className={table.headRow}>
                            <th className={table.th}>Guest</th>
                            <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                            <th className={`${table.th} hidden md:table-cell`}>Was Due Out</th>
                            <th className={table.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(overdue, "overdue").map((r) => (
                            <tr key={r.id} className={table.row}>
                              <td className={`${table.td} font-medium`}>
                                <div>{r.guest_name}</div>
                                <div className="text-base text-[color:var(--text-color)]/68">{r.booking_reference}</div>
                              </td>
                              <td className={`${table.td} hidden md:table-cell`}>{r.room_type?.name || "N/A"}</td>
                              <td className={`${table.td} hidden md:table-cell`}>
                                {formatDate(r.check_out)}
                                <span className="ml-2 text-base text-red-600 font-semibold">({calendarDaysAgo(r.check_out)})</span>
                              </td>
                              <td className={table.td}>
                                <div className={table.actions}>
                                  <button onClick={() => navigate("/admin/in-house")} className={btn.rowPrimary}>
                                    Go to In-House
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Pagination page={pages.overdue} total={overdue.length} onPage={(p) => setPage("overdue", p)} />
                </div>
              )
            )}

            {/* Overdue Balances */}
            {tab === "balances" && (
              balances.length === 0 ? (
                <AllClear message="No outstanding post-checkout balances." />
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <p className="text-xl text-[color:var(--text-color)]/76">
                    Checked-out guests with an unpaid folio balance.
                  </p>
                  <div className={table.card}>
                    <div className={table.scroll}>
                      <table className={table.el}>
                        <thead>
                          <tr className={table.headRow}>
                            <th className={table.th}>Guest</th>
                            <th className={`${table.th} hidden md:table-cell`}>Folio #</th>
                            <th className={`${table.th} hidden md:table-cell`}>Checked Out</th>
                            <th className={table.th}>Balance Due</th>
                            <th className={table.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginate(balances, "balances").map((f) => (
                            <tr key={f.id} className={table.row}>
                              <td className={`${table.td} font-medium`}>
                                <div>{f.reservation?.guest_name || "N/A"}</div>
                                <div className="text-base text-[color:var(--text-color)]/68">{f.reservation?.booking_reference}</div>
                              </td>
                              <td className={`${table.td} hidden md:table-cell`}>{f.folio_number}</td>
                              <td className={`${table.td} hidden md:table-cell`}>{formatDate(f.reservation?.check_out)}</td>
                              <td className={`${table.td} font-bold text-red-600`}>{money(f.balance)}</td>
                              <td className={table.td}>
                                <div className={table.actions}>
                                  <button onClick={() => navigate("/admin/folios")} className={btn.rowPrimary}>
                                    Go to Folios
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Pagination page={pages.balances} total={balances.length} onPage={(p) => setPage("balances", p)} />
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
}

function AllClear({ message }) {
  return (
    <div className="w-full flex flex-col items-center gap-4 py-20 text-center">
      <div className="text-6xl">✓</div>
      <p className="text-2xl text-[color:var(--text-color)]/76">{message}</p>
    </div>
  );
}
