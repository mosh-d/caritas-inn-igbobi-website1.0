import { useState, useCallback, useEffect } from "react";
import { IoBarChartOutline, IoDownloadOutline, IoMailOutline } from "react-icons/io5";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Button from "../components/shared/Button";
import PageHeading from "../components/shared/PageHeading";
import StatusBadge from "../components/shared/StatusBadge";
import {
  fetchReportsDashboard,
  downloadReportsExport,
  emailReportsDashboard,
  fetchManifest,
  fetchPaymentsAnalysis,
  fetchPmsReport,
  fetchAccommodationReport,
  downloadManifestExport,
  downloadAnalysisExport,
  downloadPmsReportExport,
  downloadAccommodationReportExport,
} from "../utils/reports-api";
import { fetchStaffAccounts } from "../utils/staff-accounts-api";
import { localTodayISO } from "../utils/date-utils";

const money = (v) =>
  `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (v) => `${Number(v || 0).toFixed(1)}%`;

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

// check_in/check_out are stored as a UTC-midnight marker for the scheduled
// calendar date, not a real point in time — formatting them with a time
// component renders a meaningless "1:00 AM" (UTC midnight shifted into
// WAT). Use this for any date that hasn't actually happened yet (a
// scheduled checkout still in the future); use formatDateTime with the
// actual_check_in/actual_check_out timestamp once it's a real past event.
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }) : "—";

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "manifest", label: "Manifest" },
  { key: "analysis", label: "Analysis" },
  { key: "pms", label: "PMS Report" },
  { key: "accommodation", label: "Accommodation" },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div data-component="AdminReports" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoBarChartOutline}>Reports</PageHeading>

      <div className="flex gap-3 text-xl flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-6 py-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === t.key ? "bg-[color:var(--emphasis)] text-white" : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xl text-[color:var(--text-color)]/76">
        {activeTab === "dashboard"
          ? "Revenue, occupancy, and stay totals for a custom date range."
          : activeTab === "manifest"
          ? "Arrivals and departures for a date range, with room price, receipt numbers, and deposits — the daily front-desk manifest, digitized."
          : activeTab === "analysis"
          ? "Every payment received in a date range, broken down by room, receipt number, and method."
          : activeTab === "pms"
          ? "A shift-handoff snapshot: room status (vacant/occupied/out-of-order/reserved/complementary) plus arrivals and departures — pick Evening for end-of-day or Morning to see the previous night's audit."
          : "One row per room in use on a given date — guest, room, tariff, payment, and whether they checked in, checked out, or are still in-house."}
      </p>

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "manifest" && <ManifestTab />}
      {activeTab === "analysis" && <AnalysisTab />}
      {activeTab === "pms" && <PmsReportTab />}
      {activeTab === "accommodation" && <AccommodationReportTab />}
    </div>
  );
}

// ─── Dashboard (existing report, unchanged) ──────────────────────────────────

function DashboardTab() {
  const defaultRange = currentMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailing, setEmailing] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);

  const loadReport = useCallback(async () => {
    if (!from || !to) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchReportsDashboard(from, to);
      setData(result);
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const handleExport = async () => {
    if (!from || !to) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadReportsExport(from, to);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export report.");
    } finally {
      setExporting(false);
    }
  };

  const handleEmailReport = async () => {
    if (!from || !to || !emailAddress.trim()) return;
    try {
      setEmailing(true);
      setEmailError(null);
      setEmailSuccess(null);
      await emailReportsDashboard(from, to, emailAddress.trim());
      setEmailSuccess(`Report sent to ${emailAddress.trim()}.`);
      setEmailAddress("");
      setTimeout(() => setEmailSuccess(null), 6000);
    } catch (err) {
      setEmailError(err.response?.data?.message || "Failed to send report email.");
    } finally {
      setEmailing(false);
    }
  };

  const summary = data?.summary || {};
  const paymentMethods = data?.paymentMethods || [];
  const revenueByRoomType = data?.revenueByRoomType || [];
  const occupancy = data?.occupancy || [];
  const period = data?.period;

  const totalPaymentsCollected = paymentMethods.reduce((sum, m) => sum + (m.total || 0), 0);

  return (
    <div className="w-full flex flex-col items-start gap-[2.5rem]">
      {/* Date range picker */}
      <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-wrap gap-4 items-end w-full">
        <div className="flex flex-col gap-2">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              const newFrom = e.target.value;
              setFrom(newFrom);
              // Keep "to" from ever being pushed before "from" when "from" moves later.
              if (newFrom && to && newFrom > to) setTo(newFrom);
            }}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">To</label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          />
        </div>
        <Button
          onClick={loadReport}
          disabled={loading}
          variant="emphasis"
          className={`text-xl! pb-5 pt-4.5 rounded-xl ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Loading..." : "Generate Report"}
        </Button>
        <Button
          onClick={handleExport}
          disabled={exporting || !from || !to}
          variant="secondary"
          className={`text-xl! flex items-center gap-2 rounded-xl ${exporting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
        </Button>
        <Button
          onClick={() => setShowEmailForm((v) => !v)}
          disabled={!from || !to}
          variant="secondary"
          className={`text-xl! flex items-center gap-2 rounded-xl`}
        >
          <IoMailOutline size={20} /> Email Report
        </Button>
      </div>

      {showEmailForm && (
        <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-wrap gap-4 items-end w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-[16rem]">
            <label className="text-xl font-semibold text-[color:var(--text-color)]/76">Send report to</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
            />
          </div>
          <Button
            onClick={handleEmailReport}
            disabled={emailing || !emailAddress.trim()}
            variant="emphasis"
            className={`text-xl! ${emailing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {emailing ? "Sending..." : "Send"}
          </Button>
          {emailSuccess && <p className="text-green-700 text-xl w-full">{emailSuccess}</p>}
          {emailError && <p className="text-red-600 text-xl w-full">{emailError}</p>}
        </div>
      )}

      {exportError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">
          {exportError}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20 w-full">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          {period && (
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Showing data for <strong className="text-[color:var(--black)]">{period.from}</strong> to{" "}
              <strong className="text-[color:var(--black)]">{period.to}</strong> ({period.days} day{period.days !== 1 ? "s" : ""})
            </p>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Billed" value={money(summary.total_billed)} sub="charged to folios" />
            <SummaryCard label="Payments Received" value={money(totalPaymentsCollected)} sub="collected this period" accent />
            <SummaryCard label="Outstanding" value={money(summary.total_outstanding)} sub="balance still owed" warn={Number(summary.total_outstanding) > 0} />
            <SummaryCard label="Completed Stays" value={summary.completed_stays ?? "—"} sub={`of ${summary.total_stays ?? 0} total`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by room type */}
            <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-[color:var(--text-color)]/10">
                <h2 className="text-3xl font-bold text-[color:var(--black)]">Revenue by Room Type</h2>
                <p className="text-xl text-[color:var(--text-color)]/68 mt-1">Reservations with check-in in selected period</p>
              </div>
              {revenueByRoomType.length === 0 ? (
                <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No data for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-2xl">
                    <thead>
                      <tr className="border-b border-[color:var(--text-color)]/10">
                        <th className="px-6 py-3 text-left text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Room Type</th>
                        <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Stays</th>
                        <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Revenue</th>
                        <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Avg / Stay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueByRoomType.map((row, i) => (
                        <tr key={i} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
                          <td className="px-6 py-4 font-medium text-[color:var(--black)]">{row.room_type_name}</td>
                          <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.total_stays}</td>
                          <td className="px-6 py-4 text-right font-semibold text-[color:var(--black)]">{money(row.total_revenue)}</td>
                          <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(row.avg_rate_per_stay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-[color:var(--text-color)]/10">
                <h2 className="text-3xl font-bold text-[color:var(--black)]">Payments by Method</h2>
                <p className="text-xl text-[color:var(--text-color)]/68 mt-1">Payments received in selected period</p>
              </div>
              {paymentMethods.length === 0 ? (
                <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No payments recorded in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-2xl">
                    <thead>
                      <tr className="border-b border-[color:var(--text-color)]/10">
                        <th className="px-6 py-3 text-left text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Method</th>
                        <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Count</th>
                        <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Total</th>
                        <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethods.map((row, i) => (
                        <tr key={i} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
                          <td className="px-6 py-4 font-medium text-[color:var(--black)] capitalize">{row.payment_method}</td>
                          <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.count}</td>
                          <td className="px-6 py-4 text-right font-semibold text-[color:var(--black)]">{money(row.total)}</td>
                          <td className="px-6 py-4 text-right text-[color:var(--text-color)]/76">
                            {totalPaymentsCollected > 0 ? pct((row.total / totalPaymentsCollected) * 100) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-[color:var(--text-color)]/15">
                      <tr className="bg-[color:var(--text-color)]/3">
                        <td className="px-6 py-4 font-bold text-[color:var(--black)]">Total</td>
                        <td className="px-6 py-4 text-right font-semibold text-[color:var(--text-color)]/84">
                          {paymentMethods.reduce((s, r) => s + r.count, 0)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-[color:var(--black)]">{money(totalPaymentsCollected)}</td>
                        <td className="px-6 py-4 text-right text-[color:var(--text-color)]/68">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Occupancy */}
          <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-[color:var(--text-color)]/10">
              <h2 className="text-3xl font-bold text-[color:var(--black)]">Occupancy by Room Type</h2>
              <p className="text-xl text-[color:var(--text-color)]/68 mt-1">Room nights occupied vs available across the selected period</p>
            </div>
            {occupancy.length === 0 ? (
              <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No data for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-2xl">
                  <thead>
                    <tr className="border-b border-[color:var(--text-color)]/10">
                      <th className="px-6 py-3 text-left text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Room Type</th>
                      <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Capacity</th>
                      <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Avail. Nights</th>
                      <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Occupied</th>
                      <th className="px-6 py-3 text-right text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide">Occ. %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancy.map((row, i) => (
                      <tr key={i} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
                        <td className="px-6 py-4 font-medium text-[color:var(--black)]">{row.room_type_name}</td>
                        <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.max_capacity}</td>
                        <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.available_room_nights}</td>
                        <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{Number(row.occupied_room_nights).toFixed(1)}</td>
                        <td className="px-6 py-4 text-right">
                          <OccupancyBadge value={row.occupancy_pct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center py-20 text-[color:var(--text-color)]/60 text-2xl w-full">
          Select a date range and click <strong>Generate Report</strong> to view results.
        </div>
      )}
    </div>
  );
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

function ManifestTab() {
  const defaultRange = currentMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const load = useCallback(async () => {
    if (!from || !to) return;
    try {
      setLoading(true);
      setError(null);
      setData(await fetchManifest(from, to));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load manifest.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const handleExport = async () => {
    if (!from || !to) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadManifestExport(from, to);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export manifest.");
    } finally {
      setExporting(false);
    }
  };

  const renderRow = (r) => (
    <tr key={r.id} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.room_numbers || "Unassigned"}</td>
      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{r.total_rate ? money(r.total_rate) : "—"}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.receipt_numbers || "—"}</td>
      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(r.amount_deposited)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDateTime(r.actual_check_in || r.check_in)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDateTime(r.actual_check_out || r.check_out)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84 capitalize">{r.source || "—"}</td>
    </tr>
  );

  const headers = ["Guest", "Room", "Room Price", "Receipt No.", "Deposited", "Arrival", "Check-Out", "Source"];

  return (
    <div className="w-full flex flex-col items-start gap-[2.5rem]">
      <RangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onGenerate={load} loading={loading} />

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Showing data for <strong className="text-[color:var(--black)]">{data.period.from}</strong> to{" "}
              <strong className="text-[color:var(--black)]">{data.period.to}</strong>
            </p>
            <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex items-center rounded-xl gap-2">
              <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>

          <ReportSection title="Check-Ins" subtitle="Everyone arriving in the selected period">
            {data.check_ins.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={headers} />
                <tbody>{data.check_ins.map(renderRow)}</tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Check-Outs" subtitle="Everyone departing in the selected period">
            {data.check_outs.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={headers} />
                <tbody>{data.check_outs.map(renderRow)}</tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Notes">
            {data.notes.length === 0 ? (
              <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No guest notes recorded for this period.</p>
            ) : (
              <div className="flex flex-col gap-2 p-6">
                {data.notes.map((n, i) => (
                  <p key={i} className="text-xl">
                    <span className="font-bold">{n.guest_name}</span>{" "}
                    <span className="text-[color:var(--text-color)]/60">({n.booking_reference})</span> — {n.note}
                  </p>
                ))}
              </div>
            )}
          </ReportSection>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center py-20 text-[color:var(--text-color)]/60 text-2xl w-full">
          Select a date range and click <strong>Generate Report</strong> to view results.
        </div>
      )}
    </div>
  );
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function AnalysisTab() {
  const defaultRange = currentMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const load = useCallback(async () => {
    if (!from || !to) return;
    try {
      setLoading(true);
      setError(null);
      setData(await fetchPaymentsAnalysis(from, to));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load analysis.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const handleExport = async () => {
    if (!from || !to) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadAnalysisExport(from, to);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export analysis.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-start gap-[2.5rem]">
      <RangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} onGenerate={load} loading={loading} />

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex justify-end">
            <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex rounded-xl items-center gap-2">
              <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            <SummaryCard label="Collected" value={money(data.total_collected)} sub="completed payments" accent />
            <SummaryCard label="Refunded" value={money(data.total_refunded)} sub="refunds issued" warn={data.total_refunded > 0} />
            <SummaryCard label="Net Total" value={money(data.net_total)} sub="collected minus refunded" />
          </div>

          <ReportSection title="All Payments" subtitle={`${data.payments.length} transaction(s)`}>
            {data.payments.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Room", "Receipt No.", "Reference", "Guest", "Method", "Date", "Amount"]} />
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{p.room_numbers || "—"}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{p.receipt_number || "—"}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/68 font-mono text-lg">{p.payment_reference}</td>
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{p.guest_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84 capitalize">{p.payment_method}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDateTime(p.payment_date)}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${p.status === "refunded" ? "text-red-600" : "text-[color:var(--black)]"}`}>
                        {p.status === "refunded" ? "−" : ""}{money(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[color:var(--text-color)]/15">
                  <tr className="bg-[color:var(--text-color)]/3">
                    <td colSpan="6" className="px-6 py-4 font-bold text-[color:var(--black)] text-right">Net Total</td>
                    <td className="px-6 py-4 text-right font-bold text-[color:var(--black)]">{money(data.net_total)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </ReportSection>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center py-20 text-[color:var(--text-color)]/60 text-2xl w-full">
          Select a date range and click <strong>Generate Report</strong> to view results.
        </div>
      )}
    </div>
  );
}

// ─── PMS Report (Evening / Morning) ─────────────────────────────────────────────

function PmsReportTab() {
  const [date, setDate] = useState(localTodayISO());
  const [variant, setVariant] = useState("evening");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const load = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);
      setData(await fetchPmsReport(date, variant));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load PMS report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date, variant]);

  const handleExport = async () => {
    if (!date) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadPmsReportExport(date, variant);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export PMS report.");
    } finally {
      setExporting(false);
    }
  };

  const roomNumberList = (rooms) => (rooms.length === 0 ? "—" : rooms.map((r) => r.room_number).join(", "));

  return (
    <div className="w-full flex flex-col items-start gap-[2.5rem]">
      <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-wrap gap-4 items-end w-full">
        <div className="flex flex-col gap-2">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">Variant</label>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          >
            <option value="evening">Evening (~7pm)</option>
            <option value="morning">Morning (~7am)</option>
          </select>
        </div>
        <Button onClick={load} disabled={loading} variant="emphasis" className={`text-xl! pb-5 pt-4.5 rounded-xl ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
          {loading ? "Loading..." : "Generate Report"}
        </Button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              {data.variant === "evening" ? "Evening" : "Morning"} report for{" "}
              <strong className="text-[color:var(--black)]">{data.report_date}</strong>
            </p>
            <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex items-center rounded-xl gap-2">
              <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>

          {data.previous_night_audit !== undefined && (
            <div className={`p-5 rounded-xl border w-full text-xl ${data.previous_night_audit ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
              {data.previous_night_audit
                ? `Previous night's audit ran at ${formatDateTime(data.previous_night_audit.audited_at)} — ${data.previous_night_audit.rooms_charged} room(s) charged, ${money(data.previous_night_audit.total_posted)} posted.`
                : "Previous night's audit has not been run yet."}
            </div>
          )}

          <ReportSection title="Stay-Overs" subtitle="Currently in-house, not arriving or departing today">
            {data.stay_overs.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Guest", "Check-In", "Check-Out"]} />
                <tbody>
                  {data.stay_overs.map((r) => (
                    <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                      {/* A stay-over is already checked in (that's what makes them a stay-over,
                          not an arrival) but hasn't checked out yet — actual_check_in is a real
                          timestamp worth showing with a time; check_out is still just a scheduled
                          calendar date until it actually happens, so it gets no fake time attached. */}
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDateTime(r.actual_check_in)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(r.check_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Arrivals">
            {data.arrivals.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Guest", "Status"]} />
                <tbody>
                  {data.arrivals.map((r) => (
                    <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-lg font-bold ${r.arrived ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {r.arrived ? "Arrived" : "Still Expected"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Departures">
            {data.departures.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Guest", "Status"]} />
                <tbody>
                  {data.departures.map((r) => (
                    <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-lg font-bold ${r.departed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {r.departed ? "Departed" : "Still In-House"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Room Status">
            <div className="flex flex-col gap-4 p-6">
              <RoomStatusLine label="Vacant" count={data.room_status.vacant.length} rooms={roomNumberList(data.room_status.vacant)} />
              <RoomStatusLine label="Occupied" count={data.room_status.occupied.length} rooms={roomNumberList(data.room_status.occupied)} />
              <RoomStatusLine label="Out of Order" count={data.room_status.out_of_order.length} rooms={roomNumberList(data.room_status.out_of_order)} />
              <RoomStatusLine label="Reserved" count={data.room_status.reserved.length} rooms={roomNumberList(data.room_status.reserved)} />
              {/* Complementary always last, per the manual report's convention */}
              <RoomStatusLine label="Complementary" count={data.room_status.complementary.length} rooms={roomNumberList(data.room_status.complementary)} />
            </div>
          </ReportSection>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center py-20 text-[color:var(--text-color)]/60 text-2xl w-full">
          Pick a date and variant, then click <strong>Generate Report</strong>.
        </div>
      )}
    </div>
  );
}

// ─── Accommodation Report ───────────────────────────────────────────────────

function AccommodationReportTab() {
  const [date, setDate] = useState(localTodayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [staff, setStaff] = useState([]);
  const [shift, setShift] = useState("");

  useEffect(() => {
    fetchStaffAccounts()
      .then((list) => setStaff(list || []))
      .catch(() => setStaff([]));
  }, []);

  const load = useCallback(async () => {
    if (!date) return;
    try {
      setLoading(true);
      setError(null);
      setData(await fetchAccommodationReport(date));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load accommodation report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const handleExport = async () => {
    if (!date || !shift) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadAccommodationReportExport(date, shift);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export accommodation report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-start gap-[2.5rem]">
      <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-wrap gap-4 items-end w-full">
        <div className="flex flex-col gap-2">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          />
        </div>
        <Button onClick={load} disabled={loading} variant="emphasis" className={`text-xl! pb-5 pt-4.5 rounded-xl ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
          {loading ? "Loading..." : "Generate Report"}
        </Button>
        <div className="flex flex-col gap-2">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">Shift (receptionist on duty)</label>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          >
            <option value="">-- Select --</option>
            {staff.map((s) => (
              <option key={s.id} value={s.display_name}>{s.display_name} ({s.role})</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Accommodation report for <strong className="text-[color:var(--black)]">{data.report_date}</strong>
            </p>
            <Button
              onClick={handleExport}
              disabled={exporting || !shift}
              variant="secondary"
              className="text-xl! flex items-center rounded-xl gap-2"
              title={!shift ? "Select a shift before exporting" : undefined}
            >
              <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>

          <ReportSection title="Rooms in Use">
            {data.rows.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Date", "Guest", "Room Type", "Room No.", "Room Price", "Breakfast Price", "Payment Mode", "Payment Status", "Amount Paid", "Shift", "Remarks"]} />
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={`${r.reservation_id}-${r.room_number}-${i}`} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(data.report_date)}</td>
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.room_type_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.room_number}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.room_price)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.breakfast_price)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.payment_mode}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.payment_status} /></td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.amount_paid)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{shift || "—"}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.remarks} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center py-20 text-[color:var(--text-color)]/60 text-2xl w-full">
          Pick a date, then click <strong>Generate Report</strong>.
        </div>
      )}
    </div>
  );
}

function RoomStatusLine({ label, count, rooms }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xl font-bold text-[color:var(--black)]">{label} ({count})</p>
      <p className="text-xl text-[color:var(--text-color)]/76">{rooms}</p>
    </div>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function RangePicker({ from, to, setFrom, setTo, onGenerate, loading }) {
  return (
    <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-wrap gap-4 items-end w-full">
      <div className="flex flex-col gap-2">
        <label className="text-xl font-semibold text-[color:var(--text-color)]/76">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            const newFrom = e.target.value;
            setFrom(newFrom);
            if (newFrom && to && newFrom > to) setTo(newFrom);
          }}
          className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xl font-semibold text-[color:var(--text-color)]/76">To</label>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
        />
      </div>
      <Button onClick={onGenerate} disabled={loading} variant="emphasis" className={`text-xl! pb-5 pt-4.5 rounded-xl ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
        {loading ? "Loading..." : "Generate Report"}
      </Button>
    </div>
  );
}

function ReportSection({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden w-full">
      <div className="px-6 py-5 border-b border-[color:var(--text-color)]/10">
        <h2 className="text-3xl font-bold text-[color:var(--black)]">{title}</h2>
        {subtitle && <p className="text-xl text-[color:var(--text-color)]/68 mt-1">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function TableHead({ cells }) {
  return (
    <thead>
      <tr className="border-b border-[color:var(--text-color)]/10">
        {cells.map((c, i) => (
          <th
            key={i}
            className={`px-6 py-3 text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide ${
              i === 0 ? "text-left" : "text-left"
            }`}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function EmptyRow() {
  return <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No data for this period.</p>;
}

function SummaryCard({ label, value, sub, accent, warn }) {
  return (
    <div className={`rounded-xl border p-6 ${accent ? "bg-[color:var(--emphasis)] border-transparent text-white" : warn ? "bg-white border-orange-200" : "bg-white border-[color:var(--text-color)]/10"}`}>
      <p className={`text-xl font-semibold uppercase tracking-wide mb-2 ${accent ? "text-white/70" : "text-[color:var(--text-color)]/68"}`}>
        {label}
      </p>
      <p className={`text-4xl font-bold ${accent ? "text-white" : warn ? "text-orange-600" : "text-[color:var(--black)]"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xl mt-1 ${accent ? "text-white/60" : "text-[color:var(--text-color)]/60"}`}>{sub}</p>
      )}
    </div>
  );
}

function OccupancyBadge({ value }) {
  const v = Number(value || 0);
  const color = v >= 80 ? "bg-green-100 text-green-700" : v >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xl font-bold ${color}`}>
      {pct(v)}
    </span>
  );
}
