import { useState, useEffect, useCallback } from "react";
import { IoMoonOutline } from "react-icons/io5";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Button from "../components/shared/Button";
import PageHeading from "../components/shared/PageHeading";
import { table } from "../components/shared/ui";
import { runNightAudit, fetchNightAuditHistory } from "../utils/night-audit-api";
import { useWebSocketContext } from "../context/WebSocketContext";

const money = (v) =>
  `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PAGE_SIZE = 10;

export default function AdminNightAudit() {
  const [auditDate, setAuditDate] = useState(yesterday());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      const data = await fetchNightAuditHistory({ page, limit: PAGE_SIZE });
      setHistory(data.data || []);
      setHistoryTotal(data.total || 0);
      setHistoryPage(page);
      setHistoryError(null);
    } catch (err) {
      setHistoryError((err.response?.data?.message || "Failed to load audit history.") + " Please refresh the page.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(1); }, [loadHistory]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleRun = async () => {
    if (!auditDate) return;
    try {
      setRunning(true);
      setResult(null);
      setRunError(null);
      const data = await runNightAudit(auditDate);
      setResult(data);
      loadHistory(1);
    } catch (err) {
      setRunError(err.response?.data?.message || "Audit failed. Check if it has already been run for this date.");
    } finally {
      setRunning(false);
    }
  };

  const historyPages = Math.ceil(historyTotal / PAGE_SIZE);

  return (
    <div data-component="AdminNightAudit" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <div>
        <PageHeading icon={IoMoonOutline}>Night Audit</PageHeading>
        <p className="text-2xl text-[color:var(--text-color)]/76 mt-2">
          Posts nightly room charges to all in-house guest folios.
          Runs automatically at 2am if not triggered manually.
        </p>
      </div>

      {/* Run panel */}
      <div className="w-full bg-white border border-[color:var(--text-color)]/15 rounded-xl p-8 flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-[color:var(--black)]">Run Audit</h2>

        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xl font-semibold text-[color:var(--text-color)]/84">Business Date</label>
            <input
              type="date"
              value={auditDate}
              max={yesterday()}
              onChange={(e) => { setAuditDate(e.target.value); setResult(null); setRunError(null); }}
              className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
            />
          </div>
          <Button
            variant="emphasis"
            onClick={handleRun}
            disabled={running || !auditDate}
            className={`text-xl! pb-5 pt-4.5 rounded-xl ${running || !auditDate ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {running ? "Running..." : "Run Night Audit"}
          </Button>
        </div>

        {runError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-6 py-4 text-xl">
            {runError}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Date Audited" value={formatDate(result.audit.audit_date)} />
              <StatCard label="Guests Charged" value={result.audit.rooms_charged} accent />
              <StatCard label="Total Posted" value={money(result.audit.total_posted)} accent />
              <StatCard label="Skipped" value={result.audit.skipped} warn={result.audit.skipped > 0} />
            </div>

            {/* Detail table */}
            {result.details?.length > 0 && (
              <div className={`${table.card} mt-2`}>
                <div className={table.scroll}>
                <table className={table.el}>
                  <thead>
                    <tr className={table.headRow}>
                      <th className={table.th}>Guest</th>
                      <th className={`${table.th} hidden md:table-cell`}>Room Type</th>
                      <th className={`${table.th} hidden md:table-cell`}>Folio</th>
                      <th className={`${table.th} text-right!`}>Charge</th>
                      <th className={table.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((d, i) => (
                      <tr key={i} className={table.row}>
                        <td className="px-6 py-3 font-medium">
                          <div>{d.guest_name}</div>
                          {d.booking_reference && (
                            <div className="text-base text-[color:var(--text-color)]/68">{d.booking_reference}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 hidden md:table-cell">
                          {d.skipped ? "—" : `${d.room_type}${d.rooms_booked > 1 ? ` × ${d.rooms_booked}` : ""}`}
                        </td>
                        <td className="px-6 py-3 hidden md:table-cell text-[color:var(--text-color)]/84">
                          {d.folio_number || "—"}
                        </td>
                        <td className="px-6 py-3 text-right font-bold">
                          {d.skipped ? "—" : money(d.charge)}
                        </td>
                        <td className="px-6 py-3">
                          {d.skipped ? (
                            <span className="text-orange-600 font-semibold">Skipped — {d.reason}</span>
                          ) : (
                            <span className="text-green-700 font-semibold">Posted</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div className="w-full flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-[color:var(--black)]">Audit History</h2>

        {historyLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
        ) : historyError ? (
          <p className="text-red-600 text-xl">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="text-2xl text-[color:var(--text-color)]/68">No audits have been run yet.</p>
        ) : (
          <>
            <div className={table.card}>
              <div className={table.scroll}>
              <table className={table.el}>
                <thead>
                  <tr className={table.headRow}>
                    <th className={table.th}>Business Date</th>
                    <th className={`${table.th} text-right! hidden md:table-cell`}>Guests Charged</th>
                    <th className={`${table.th} text-right! hidden md:table-cell`}>Skipped</th>
                    <th className={`${table.th} text-right!`}>Total Posted</th>
                    <th className={`${table.th} hidden md:table-cell`}>Run At</th>
                    <th className={`${table.th} hidden md:table-cell`}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => (
                    <tr key={a.id} className={table.row}>
                      <td className="px-6 py-4 font-bold">{formatDate(a.audit_date)}</td>
                      <td className="px-6 py-4 text-right hidden md:table-cell">{a.rooms_charged}</td>
                      <td className="px-6 py-4 text-right hidden md:table-cell text-[color:var(--text-color)]/76">{a.skipped}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-700">{money(a.total_posted)}</td>
                      <td className="px-6 py-4 hidden md:table-cell text-[color:var(--text-color)]/84 text-xl">
                        {a.audited_at
                          ? new Date(a.audited_at).toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className={`text-xl font-semibold px-3 py-1 rounded-full ${a.auto_run ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                          {a.auto_run ? "Auto" : "Manual"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {historyPages > 1 && (
              <div className="flex justify-center items-center gap-4 w-full mt-6">
                <Button
                  variant="emphasis"
                  onClick={() => loadHistory(historyPage - 1)}
                  disabled={historyPage === 1}
                  className={historyPage === 1 ? "opacity-30 cursor-not-allowed" : ""}
                >
                  Previous
                </Button>
                <span className="text-lg font-medium">Page {historyPage} of {historyPages}</span>
                <Button
                  variant="emphasis"
                  onClick={() => loadHistory(historyPage + 1)}
                  disabled={historyPage === historyPages}
                  className={historyPage === historyPages ? "opacity-30 cursor-not-allowed" : ""}
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

function StatCard({ label, value, accent, warn }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "bg-[color:var(--emphasis)] border-transparent text-white" : warn ? "bg-orange-50 border-orange-200" : "bg-white border-[color:var(--text-color)]/15"}`}>
      <p className={`text-xl font-semibold uppercase tracking-wide mb-1 ${accent ? "text-white/70" : "text-[color:var(--text-color)]/68"}`}>
        {label}
      </p>
      <p className={`text-3xl font-bold ${accent ? "text-white" : warn ? "text-orange-600" : "text-[color:var(--black)]"}`}>
        {value}
      </p>
    </div>
  );
}
