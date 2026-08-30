import { useState, useCallback, useEffect } from "react";
import { IoBarChartOutline, IoDownloadOutline, IoMailOutline, IoSendOutline } from "react-icons/io5";
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
  fetchFoodSalesReport,
  downloadFoodSalesReportExport,
  fetchDrinkSalesReport,
  downloadDrinkSalesReportExport,
  fetchBarStockReport,
  downloadBarStockReportExport,
  downloadManifestExport,
  downloadAnalysisExport,
  downloadPmsReportExport,
  downloadAccommodationReportExport,
} from "../utils/reports-api";
import { fetchStaffAccounts } from "../utils/staff-accounts-api";
import { sendReportToAccountant } from "../utils/sent-reports-api";
import { adminTodayISO } from "../utils/date-utils";
import { isAccountant, isReceptionist } from "../utils/auth";

// money/pct/formatDate/formatDateTime plus the shared render bits below
// (ReportSection, TableHead, EmptyRow, SummaryCard, OccupancyBadge) moved
// out to utils/report-format.js and components/shared/reportUi.jsx so
// AccountantReportsPage can render a sent report's snapshot_data with the
// exact same look as the live tab it came from, without duplicating any of
// it — a plain component file can't co-export helper functions/consts
// alongside its default export (breaks Fast Refresh), so this couldn't just
// live here.
import { money, pct, formatDate, formatDateTime } from "../utils/report-format";
import { ReportSection, TableHead, EmptyRow, SummaryCard, OccupancyBadge } from "../components/shared/reportUi";

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const ALL_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "manifest", label: "Manifest" },
  { key: "analysis", label: "Analysis" },
  { key: "pms", label: "PMS Report" },
  { key: "accommodation", label: "Accommodation" },
  { key: "food-sales", label: "Food Sales" },
  { key: "drink-sales", label: "Drink Sales" },
  { key: "bar-stock", label: "Bar Stock" },
];

// Food/Drink Sales and Bar Stock are all F&B-only — a receptionist has no
// front-desk reason to see them, unlike every other tab here. Mirrors the
// backend's own gating (FOOD_DRINK_SALES_ROLES in ReportsController), which
// is the real enforcement; this just keeps a receptionist from seeing tabs
// that would 403 anyway. Same set the page-level Shift picker below uses to
// decide receptionist vs waitron roster/label.
const FNB_TABS = ["food-sales", "drink-sales", "bar-stock"];
const visibleTabs = () => isReceptionist() ? ALL_TABS.filter((t) => !FNB_TABS.includes(t.key)) : ALL_TABS;

// Snapshots a tab's already-loaded `data` and sends it to the accountant —
// shared across every tab below rather than duplicated 5 times. `shift`
// comes from the report-page-level selector (see AdminReportsPage), not a
// per-tab one — disabled with an explanatory title until one's picked.
function SendToAccountantButton({ reportType, label, shift, data }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // An accountant runs these reports for their own audits, not to send them
  // to themselves — this button (and the shift it depends on) is a
  // front-office-only action.
  if (isAccountant()) return null;

  const handleSend = async () => {
    if (!data || !shift) return;
    try {
      setSending(true);
      setError(null);
      await sendReportToAccountant({ report_type: reportType, label, shift, snapshot_data: data });
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send report to accountant.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleSend}
        disabled={!data || !shift || sending}
        variant="secondary"
        className="text-xl! flex items-center gap-2 rounded-xl"
        title={!shift ? "Select a shift at the top of the page first" : undefined}
      >
        <IoSendOutline size={20} /> {sending ? "Sending..." : sent ? "Sent!" : "Send to Accountant"}
      </Button>
      {error && <p className="text-red-600 text-lg">{error}</p>}
    </div>
  );
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Report-page-level, not per-tab — one shift selection covers whichever
  // report is currently active, including when it's sent to the accountant
  // (see SendToAccountantButton). Food Sales/Drink Sales/Bar Stock are
  // waitron territory (FNB_TABS above), so this picker swaps roster + label
  // for those three rather than always showing "receptionist on duty" on a
  // report a receptionist can't even open.
  const isFnbTab = FNB_TABS.includes(activeTab);
  const [receptionistStaff, setReceptionistStaff] = useState([]);
  const [waitronStaff, setWaitronStaff] = useState([]);
  const [shift, setShift] = useState("");

  useEffect(() => {
    fetchStaffAccounts()
      .then((list) => setReceptionistStaff(list || []))
      .catch(() => setReceptionistStaff([]));
    fetchStaffAccounts("waitron")
      .then((list) => setWaitronStaff(list || []))
      .catch(() => setWaitronStaff([]));
  }, []);

  // A receptionist's name has no business riding along into a waitron-
  // attributed report, or vice versa, when switching between the two tab
  // groups.
  useEffect(() => {
    setShift("");
  }, [isFnbTab]);

  const shiftRoster = isFnbTab ? waitronStaff : receptionistStaff;
  const shiftLabel = isFnbTab ? "Shift (waitron on duty)" : "Shift (receptionist on duty)";

  return (
    <div data-component="AdminReports" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoBarChartOutline}>Reports</PageHeading>

      <div className="flex gap-3 text-xl flex-wrap">
        {visibleTabs().map((t) => (
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
          : activeTab === "accommodation"
          ? "One row per room in use on a given date — guest, room, tariff, payment, and whether they checked in, checked out, or are still in-house."
          : activeTab === "food-sales"
          ? "Every food order for a given date — charged to a room's folio or a non-guest folio — with quantity, amount, payment status, and payment method."
          : activeTab === "drink-sales"
          ? "Every drink order for a given date — charged to a room's folio or a non-guest folio — with quantity, amount, payment status, and payment method."
          : "Every active drink item for a given date — opening, added, damaged, sold, and closing stock, plus what sold for. Digitizes the paper Bar Analysis sheet."}
      </p>

      {/* Shift attributes a report to whichever front-desk shift sends it to
          the accountant — meaningless for an accountant's own session,
          since they're not sending anything to themselves. */}
      {!isAccountant() && (
        <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-col gap-2 w-full max-w-sm">
          <label className="text-xl font-semibold text-[color:var(--text-color)]/76">{shiftLabel}</label>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="border border-[color:var(--text-color)]/25 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)]"
          >
            <option value="">-- Select --</option>
            {shiftRoster.map((s) => (
              <option key={s.id} value={s.username}>{s.username} ({s.role})</option>
            ))}
          </select>
        </div>
      )}

      {activeTab === "dashboard" && <DashboardTab shift={shift} />}
      {activeTab === "manifest" && <ManifestTab shift={shift} />}
      {activeTab === "analysis" && <AnalysisTab shift={shift} />}
      {activeTab === "pms" && <PmsReportTab shift={shift} />}
      {activeTab === "accommodation" && <AccommodationReportTab shift={shift} />}
      {activeTab === "food-sales" && <FoodSalesReportTab shift={shift} />}
      {activeTab === "drink-sales" && <DrinkSalesReportTab shift={shift} />}
      {activeTab === "bar-stock" && <BarStockReportTab shift={shift} />}
    </div>
  );
}

// ─── Dashboard (existing report, unchanged) ──────────────────────────────────

function DashboardTab({ shift }) {
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
        <SendToAccountantButton
          reportType="dashboard"
          label={period ? `${period.from} to ${period.to}` : `${from} to ${to}`}
          shift={shift}
          data={data}
        />
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

function ManifestTab({ shift }) {
  const [date, setDate] = useState(adminTodayISO());
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
      setData(await fetchManifest(date));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load manifest.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const handleExport = async () => {
    if (!date) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadManifestExport(date);
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
      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(r.room_price)}</td>
      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(r.breakfast_price)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.receipt_numbers || "—"}</td>
      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(r.amount_deposited)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDateTime(r.actual_check_in || r.check_in)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDateTime(r.actual_check_out || r.check_out)}</td>
      <td className="px-6 py-4 text-[color:var(--text-color)]/84 capitalize">{r.source || "—"}</td>
    </tr>
  );

  const headers = ["Guest", "Room", "Room Price", "Breakfast Price", "Receipt No.", "Res. Credit", "Arrival", "Check-Out", "Source"];

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
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Manifest for <strong className="text-[color:var(--black)]">{data.report_date}</strong>
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex items-center rounded-xl gap-2">
                <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <SendToAccountantButton reportType="manifest" label={data.report_date} shift={shift} data={data} />
            </div>
          </div>

          <ReportSection title="Check-Ins" subtitle="Everyone due to arrive this business day">
            {data.check_ins.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={headers} />
                <tbody>{data.check_ins.map(renderRow)}</tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Check-Outs" subtitle="Everyone due to depart this business day">
            {data.check_outs.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={headers} />
                <tbody>{data.check_outs.map(renderRow)}</tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Reservation (Credit)" subtitle="Advance payments recorded this business day">
            {data.paid_before.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Guest", "Room", "Amount", "Method", "Status", "Receipt No."]} rightAlign={["Amount"]} />
                <tbody>
                  {data.paid_before.map((d) => (
                    <tr key={d.id} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{d.guest_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{d.room_numbers || "Unassigned"}</td>
                      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(d.amount)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84 capitalize">{d.payment_method}</td>
                      <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{d.receipt_number || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Debt Recovery" subtitle="Old debt cleared by a payment received this business day">
            {data.debt_recovery.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Guest", "Room", "Date Owed", "Total Owed", "Total Paid", "Method", "Reference"]} rightAlign={["Total Owed", "Total Paid"]} />
                <tbody>
                  {data.debt_recovery.map((d, i) => (
                    <tr key={i} className="border-b border-[color:var(--text-color)]/10 hover:bg-black/2 transition-colors">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{d.guest_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{d.room_numbers || "Unassigned"}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(d.debt_date)}</td>
                      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(d.total_owed)}</td>
                      <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(d.total_paid)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84 capitalize">{d.payment_method}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{d.payment_reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>

          <ReportSection title="Notes">
            {data.notes.length === 0 ? (
              <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No guest notes recorded for this business day.</p>
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
          Pick a date, then click <strong>Generate Report</strong>.
        </div>
      )}
    </div>
  );
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function AnalysisTab({ shift }) {
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
          <div className="w-full flex justify-end gap-3">
            <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex rounded-xl items-center gap-2">
              <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
            <SendToAccountantButton reportType="analysis" label={`${from} to ${to}`} shift={shift} data={data} />
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
                <TableHead cells={["Room", "Receipt No.", "Reference", "Guest", "Method", "Date", "Amount"]} rightAlign={["Amount"]} />
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

function PmsReportTab({ shift }) {
  const [date, setDate] = useState(adminTodayISO());
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
            <div className="flex items-center gap-3">
              <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex items-center rounded-xl gap-2">
                <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <SendToAccountantButton reportType="pms" label={`${data.report_date} (${data.variant})`} shift={shift} data={data} />
            </div>
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

function AccommodationReportTab({ shift }) {
  const [date, setDate] = useState(adminTodayISO());
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
      setData(await fetchAccommodationReport(date));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load accommodation report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  // An accountant session has no Shift selector at all (see AdminReportsPage)
  // — shift stays "" for them, which the backend already treats as optional
  // (falls back to a blank column), so export only actually needs a shift
  // from a front-office session.
  const shiftRequired = !isAccountant();

  const handleExport = async () => {
    if (!date || (shiftRequired && !shift)) return;
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
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExport}
                disabled={exporting || (shiftRequired && !shift)}
                variant="secondary"
                className="text-xl! flex items-center rounded-xl gap-2"
                title={shiftRequired && !shift ? "Select a shift at the top of the page first" : undefined}
              >
                <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <SendToAccountantButton reportType="accommodation" label={data.report_date} shift={shift} data={data} />
            </div>
          </div>

          <ReportSection title="Rooms in Use">
            {data.rows.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Date", "Guest", "Room Type", "Room No.", "Room Price", "Breakfast Price", "Payment Mode", "Payment Status", "Paid Today", "Shift", "Remarks"]} />
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={`${r.reservation_id}-${r.room_number}-${i}`} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(data.report_date)}</td>
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.room_type_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.room_number}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">
                        {r.is_complementary ? <s className="text-[color:var(--text-color)]/50">{money(r.room_price)}</s> : money(r.room_price)}
                      </td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">
                        {r.is_complementary ? <s className="text-[color:var(--text-color)]/50">{money(r.breakfast_price)}</s> : money(r.breakfast_price)}
                      </td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.payment_mode}</td>
                      {/* A complementary stay isn't actually owing anyone money — showing
                          "Owing" there just because nothing's been paid reads as a real
                          debt. Complementary replaces the payment status instead of
                          tagging along in Remarks a second time. */}
                      <td className="px-6 py-4">
                        <StatusBadge status={r.is_complementary ? "Complementary" : r.payment_status} />
                      </td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.amount_paid)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{shift || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={r.remarks} />
                        </div>
                      </td>
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

// Shared by FoodSalesReportTab/DrinkSalesReportTab — the Total card plus the
// Payment Breakdown / By Staff sections both reports have, just above the
// report-specific itemized/aggregated table below it.
function SalesTotals({ data }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Total" value={money(data.total)} accent />
        {data.payment_breakdown.map((p, i) => (
          <SummaryCard
            key={i}
            label={p.payment_method === "charged_to_room" ? "Charged to Room" : p.payment_method}
            value={money(p.total)}
            sub={p.payment_method === "charged_to_room" ? undefined : `${p.count} sale${p.count === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <ReportSection title="By Staff">
        {data.staff_breakdown.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Staff", "Total"]} />
            <tbody>
              {data.staff_breakdown.map((s, i) => (
                <tr key={i} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)]">{s.staff_name}</td>
                  <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
    </>
  );
}

// A written summary below the table, matching the paper version's own
// convention of a short notes block after the figures — Payment Methods
// restates SalesTotals' cards above as a plain line (that's the ask); PB/
// Owing/Total Sold/Total Service Charge aren't shown anywhere else on this
// report. lineTotal matches buildSalesTotals' own definition on the backend
// (amount + service_charge is the real, chargeable/paid total per row).
function SalesNotes({ data }) {
  const rows = data.rows || [];
  const lineTotal = (r) => Number(r.amount) + Number(r.service_charge);
  const pbTotal = rows.filter((r) => r.status === "PB").reduce((s, r) => s + lineTotal(r), 0);
  const owingTotal = rows.filter((r) => r.status === "owing").reduce((s, r) => s + lineTotal(r), 0);
  const totalSold = rows.reduce((s, r) => s + lineTotal(r), 0);
  const totalServiceCharge = rows.reduce((s, r) => s + Number(r.service_charge), 0);

  return (
    <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 flex flex-col gap-3 w-full">
      <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Notes</p>
      <ul className="flex flex-col gap-2 text-xl text-[color:var(--text-color)]/84 list-disc pl-6">
        <li>
          Payment methods: {data.payment_breakdown.length === 0 ? "none" : data.payment_breakdown.map((p, i) => (
            <span key={i}>
              {p.payment_method === "charged_to_room" ? "Charged to Room" : p.payment_method}: <strong className="text-[color:var(--black)]">{money(p.total)}</strong>
              {i < data.payment_breakdown.length - 1 ? " · " : ""}
            </span>
          ))}
        </li>
        <li>Paid Before (PB): <strong className="text-[color:var(--black)]">{money(pbTotal)}</strong></li>
        <li>Debt (Owing): <strong className="text-[color:var(--black)]">{money(owingTotal)}</strong></li>
        <li>Total Sold: <strong className="text-[color:var(--black)]">{money(totalSold)}</strong></li>
        <li>Total Service Charge: <strong className="text-[color:var(--black)]">{money(totalServiceCharge)}</strong></li>
      </ul>
    </div>
  );
}

function FoodSalesReportTab({ shift }) {
  const [date, setDate] = useState(adminTodayISO());
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
      setData(await fetchFoodSalesReport(date));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load food sales report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const shiftRequired = !isAccountant();

  const handleExport = async () => {
    if (!date || (shiftRequired && !shift)) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadFoodSalesReportExport(date, shift);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export food sales report.");
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
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Food sales for <strong className="text-[color:var(--black)]">{data.report_date}</strong>
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExport}
                disabled={exporting || (shiftRequired && !shift)}
                variant="secondary"
                className="text-xl! flex items-center rounded-xl gap-2"
                title={shiftRequired && !shift ? "Select a shift at the top of the page first" : undefined}
              >
                <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <SendToAccountantButton reportType="food-sales" label={data.report_date} shift={shift} data={data} />
            </div>
          </div>

          <SalesTotals data={data} />

          <ReportSection title="Food Orders">
            {data.rows.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Customer", "Qty", "Bill No", "Description", "Amount", "Service Charge", "Status", "Payment Method", "Remarks"]} />
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.customer}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.quantity}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.bill_no || "—"}</td>
                      <td className="px-6 py-4 capitalize text-[color:var(--text-color)]/84">{r.description}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.amount)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.service_charge)}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 capitalize text-[color:var(--text-color)]/84">{r.payment_method || "—"}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/76">{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>
          <SalesNotes data={data} />
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

function DrinkSalesReportTab({ shift }) {
  const [date, setDate] = useState(adminTodayISO());
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
      setData(await fetchDrinkSalesReport(date));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load drink sales report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const shiftRequired = !isAccountant();

  const handleExport = async () => {
    if (!date || (shiftRequired && !shift)) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadDrinkSalesReportExport(date, shift);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export drink sales report.");
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
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Drink sales for <strong className="text-[color:var(--black)]">{data.report_date}</strong>
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExport}
                disabled={exporting || (shiftRequired && !shift)}
                variant="secondary"
                className="text-xl! flex items-center rounded-xl gap-2"
                title={shiftRequired && !shift ? "Select a shift at the top of the page first" : undefined}
              >
                <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <SendToAccountantButton reportType="drink-sales" label={data.report_date} shift={shift} data={data} />
            </div>
          </div>

          <SalesTotals data={data} />

          <ReportSection title="Drink Orders">
            {data.rows.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Customer", "Qty", "Bill No", "Description", "Amount", "Service Charge", "Status", "Payment Method", "Remarks"]} />
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.customer}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.quantity}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.bill_no || "—"}</td>
                      <td className="px-6 py-4 capitalize text-[color:var(--text-color)]/84">{r.description}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.amount)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.service_charge)}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 capitalize text-[color:var(--text-color)]/84">{r.payment_method || "—"}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/76">{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>
          <SalesNotes data={data} />
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

function BarStockReportTab({ shift }) {
  const [date, setDate] = useState(adminTodayISO());
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
      setData(await fetchBarStockReport(date));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load bar stock report.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const shiftRequired = !isAccountant();

  const handleExport = async () => {
    if (!date || (shiftRequired && !shift)) return;
    try {
      setExporting(true);
      setExportError(null);
      await downloadBarStockReportExport(date, shift);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export bar stock report.");
    } finally {
      setExporting(false);
    }
  };

  const totalSold = data ? data.rows.reduce((s, r) => s + r.sold_stock, 0) : 0;
  const totalAmount = data ? data.rows.reduce((s, r) => s + r.total_amount, 0) : 0;

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
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && data && (
        <div className="w-full flex flex-col gap-[2.5rem]">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <p className="text-2xl text-[color:var(--text-color)]/76">
              Bar stock for <strong className="text-[color:var(--black)]">{data.report_date}</strong>
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExport}
                disabled={exporting || (shiftRequired && !shift)}
                variant="secondary"
                className="text-xl! flex items-center rounded-xl gap-2"
                title={shiftRequired && !shift ? "Select a shift at the top of the page first" : undefined}
              >
                <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
              </Button>
              <SendToAccountantButton reportType="bar-stock" label={data.report_date} shift={shift} data={data} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard label="Total Sold Stock" value={totalSold} accent />
            <SummaryCard label="Total Amount" value={money(totalAmount)} />
          </div>

          <ReportSection title="Stock">
            {data.rows.length === 0 ? (
              <EmptyRow />
            ) : (
              <table className="w-full text-xl">
                <TableHead cells={["Stock", "Opening", "Added", "Total (before sales)", "Damaged", "Sold", "Unit Cost Price", "Total Amount", "Closing", "Service Charge", "Remark"]} />
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.drink_item_id} className="border-b border-[color:var(--text-color)]/10">
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.opening_stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.added_stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.total_stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.damaged_stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.sold_stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.unit_cost_price)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.total_amount)}</td>
                      <td className={`px-6 py-4 font-semibold ${r.closing_stock < 0 ? "text-red-600" : "text-[color:var(--black)]"}`}>{r.closing_stock}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{money(r.service_charge)}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/76">{r.remark || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportSection>

          {data.summary && (
            <ReportSection title="Daily Totals" subtitle="Combined Food + Drink figures for this business day">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                <SummaryCard label="Food" value={money(data.summary.food)} />
                <SummaryCard label="Drink" value={money(data.summary.drink)} />
                <SummaryCard label="Service Charge" value={money(data.summary.service_charge)} />
                <SummaryCard label="Debt Recovered" value={money(data.summary.debt_recovered)} />
                <SummaryCard label="Cash" value={money(data.summary.cash)} />
                <SummaryCard label="POS" value={money(data.summary.pos)} />
                <SummaryCard label="Transfer" value={money(data.summary.transfer)} />
                <SummaryCard label="Reservation" value={money(data.summary.reservation)} />
                <SummaryCard label="Debt" value={money(data.summary.debt)} warn={data.summary.debt > 0} />
                <SummaryCard label="Paid Before" value={money(data.summary.paid_before)} />
                <SummaryCard label="Total" value={money(data.summary.total)} accent />
              </div>
            </ReportSection>
          )}
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

// ReportSection, TableHead, EmptyRow, SummaryCard, OccupancyBadge now live
// in components/shared/reportUi.jsx (imported at the top of this file) so
// AccountantReportsPage can reuse them for rendering a sent report's
// snapshot_data.
