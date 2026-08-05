import { useState, useEffect, useCallback } from "react";
import { IoBarChartOutline, IoDownloadOutline, IoChevronDown, IoChevronUp } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Button from "../components/shared/Button";
import StatusBadge from "../components/shared/StatusBadge";
import { ReportSection, TableHead, EmptyRow, SummaryCard, OccupancyBadge } from "../components/shared/reportUi";
import { money, pct, formatDate, formatDateTime } from "../utils/report-format";
import { fetchSentReportsGrouped, fetchSentReport, downloadSentReportExport } from "../utils/sent-reports-api";

const REPORT_TYPE_LABELS = {
  dashboard: "Dashboard",
  manifest: "Manifest",
  analysis: "Analysis",
  pms: "PMS Report",
  accommodation: "Accommodation",
};

export default function AccountantReportsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setGroups(await fetchSentReportsGrouped());
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load sent reports.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div data-component="AccountantReports" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoBarChartOutline}>Reports from Front Office</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Every report sent from the front office, grouped by the day it was sent. Click a report to see exactly what was sent — the snapshot doesn't change even if the underlying records do later.
      </p>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
      {loading && <div className="flex justify-center py-20 w-full"><LoadingSpinner size="lg" /></div>}

      {!loading && groups.length === 0 && !error && (
        <div className="text-center py-20 text-[color:var(--text-color)]/60 text-2xl w-full">
          No reports have been sent yet.
        </div>
      )}

      {!loading && groups.map((group) => (
        <DaySection key={group.date} date={group.date} reports={group.reports} />
      ))}
    </div>
  );
}

function DaySection({ date, reports }) {
  return (
    <div className="w-full flex flex-col gap-4">
      <h2 className="text-3xl font-bold text-[color:var(--black)]">{formatDate(date)}</h2>
      <div className="bg-white rounded-xl border border-[color:var(--text-color)]/10 overflow-hidden w-full">
        {reports.map((r) => (
          <SentReportRow key={r.id} report={r} />
        ))}
      </div>
    </div>
  );
}

function SentReportRow({ report }) {
  const [expanded, setExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (snapshot) return; // already fetched — don't re-fetch on every re-expand
    try {
      setLoading(true);
      setError(null);
      setSnapshot(await fetchSentReport(report.id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load this report's snapshot.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      await downloadSentReportExport(report.id, report.report_type, report.label);
    } catch (err) {
      setExportError(err.response?.data?.message || "Failed to export this report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="border-b border-[color:var(--text-color)]/10 last:border-b-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer hover:bg-black/2 transition-colors"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-block px-3 pt-2 pb-2 rounded-full text-lg font-bold leading-tight whitespace-nowrap bg-[color:var(--emphasis)]/10 text-[color:var(--emphasis)]">
            {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
          </span>
          <span className="text-2xl font-semibold text-[color:var(--black)]">{report.label}</span>
          {report.shift && <span className="text-xl text-[color:var(--text-color)]/68">Shift: {report.shift}</span>}
          <span className="text-lg text-[color:var(--text-color)]/60">
            Sent {formatDateTime(report.sent_at)}{report.sent_by ? ` by ${report.sent_by}` : ""}
          </span>
        </div>
        {expanded ? <IoChevronUp size={24} /> : <IoChevronDown size={24} />}
      </button>

      {expanded && (
        <div className="px-6 pb-6 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={exporting} variant="secondary" className="text-xl! flex items-center gap-2 rounded-xl">
              <IoDownloadOutline size={20} /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
          {exportError && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{exportError}</div>}
          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xl w-full">{error}</div>}
          {loading && <div className="flex justify-center py-10 w-full"><LoadingSpinner size="md" /></div>}
          {!loading && snapshot && <SnapshotView reportType={snapshot.report_type} data={snapshot.snapshot_data} />}
        </div>
      )}
    </div>
  );
}

function SnapshotView({ reportType, data }) {
  if (reportType === "dashboard") return <DashboardSnapshot data={data} />;
  if (reportType === "manifest") return <ManifestSnapshot data={data} />;
  if (reportType === "analysis") return <AnalysisSnapshot data={data} />;
  if (reportType === "pms") return <PmsSnapshot data={data} />;
  if (reportType === "accommodation") return <AccommodationSnapshot data={data} />;
  return <p className="text-xl text-[color:var(--text-color)]/68">Unknown report type "{reportType}".</p>;
}

function DashboardSnapshot({ data }) {
  const summary = data?.summary || {};
  const paymentMethods = data?.paymentMethods || [];
  const revenueByRoomType = data?.revenueByRoomType || [];
  const occupancy = data?.occupancy || [];
  const totalPaymentsCollected = paymentMethods.reduce((sum, m) => sum + (m.total || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Billed" value={money(summary.total_billed)} sub="charged to folios" />
        <SummaryCard label="Payments Received" value={money(totalPaymentsCollected)} sub="collected this period" accent />
        <SummaryCard label="Outstanding" value={money(summary.total_outstanding)} sub="balance still owed" warn={Number(summary.total_outstanding) > 0} />
        <SummaryCard label="Completed Stays" value={summary.completed_stays ?? "—"} sub={`of ${summary.total_stays ?? 0} total`} />
      </div>

      <ReportSection title="Revenue by Room Type">
        {revenueByRoomType.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Room Type", "Stays", "Revenue", "Avg / Stay"]} />
            <tbody>
              {revenueByRoomType.map((row, i) => (
                <tr key={i} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)]">{row.room_type_name}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.total_stays}</td>
                  <td className="px-6 py-4 text-right font-semibold text-[color:var(--black)]">{money(row.total_revenue)}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{money(row.avg_rate_per_stay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>

      <ReportSection title="Payments by Method">
        {paymentMethods.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Method", "Count", "Total", "Share"]} />
            <tbody>
              {paymentMethods.map((row, i) => (
                <tr key={i} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)] capitalize">{row.payment_method}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.count}</td>
                  <td className="px-6 py-4 text-right font-semibold text-[color:var(--black)]">{money(row.total)}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/76">
                    {totalPaymentsCollected > 0 ? pct((row.total / totalPaymentsCollected) * 100) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>

      <ReportSection title="Occupancy by Room Type">
        {occupancy.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Room Type", "Capacity", "Avail. Nights", "Occupied", "Occ. %"]} />
            <tbody>
              {occupancy.map((row, i) => (
                <tr key={i} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)]">{row.room_type_name}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.max_capacity}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{row.available_room_nights}</td>
                  <td className="px-6 py-4 text-right text-[color:var(--text-color)]/84">{Number(row.occupied_room_nights).toFixed(1)}</td>
                  <td className="px-6 py-4 text-right"><OccupancyBadge value={row.occupancy_pct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
    </div>
  );
}

function ManifestRow(r) {
  return (
    <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
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
}

function ManifestSnapshot({ data }) {
  const headers = ["Guest", "Room", "Room Price", "Breakfast Price", "Receipt No.", "Deposited", "Arrival", "Check-Out", "Source"];
  const checkIns = data?.check_ins || [];
  const checkOuts = data?.check_outs || [];
  const paidBefore = data?.paid_before || [];
  const notes = data?.notes || [];

  return (
    <div className="flex flex-col gap-6">
      <ReportSection title="Check-Ins">
        {checkIns.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl"><TableHead cells={headers} /><tbody>{checkIns.map(ManifestRow)}</tbody></table>
        )}
      </ReportSection>
      <ReportSection title="Check-Outs">
        {checkOuts.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl"><TableHead cells={headers} /><tbody>{checkOuts.map(ManifestRow)}</tbody></table>
        )}
      </ReportSection>
      <ReportSection title="Reservation">
        {paidBefore.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Guest", "Room", "Amount", "Method", "Status", "Receipt No."]} />
            <tbody>
              {paidBefore.map((d) => (
                <tr key={d.id} className="border-b border-[color:var(--text-color)]/10">
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
      <ReportSection title="Notes">
        {notes.length === 0 ? (
          <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No guest notes recorded for this business day.</p>
        ) : (
          <div className="flex flex-col gap-2 p-6">
            {notes.map((n, i) => (
              <p key={i} className="text-xl">
                <span className="font-bold">{n.guest_name}</span>{" "}
                <span className="text-[color:var(--text-color)]/60">({n.booking_reference})</span> — {n.note}
              </p>
            ))}
          </div>
        )}
      </ReportSection>
    </div>
  );
}

function AnalysisSnapshot({ data }) {
  const payments = data?.payments || [];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <SummaryCard label="Collected" value={money(data?.total_collected)} sub="completed payments" accent />
        <SummaryCard label="Refunded" value={money(data?.total_refunded)} sub="refunds issued" warn={data?.total_refunded > 0} />
        <SummaryCard label="Net Total" value={money(data?.net_total)} sub="collected minus refunded" />
      </div>
      <ReportSection title="All Payments" subtitle={`${payments.length} transaction(s)`}>
        {payments.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Room", "Receipt No.", "Reference", "Guest", "Method", "Date", "Amount"]} />
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-[color:var(--text-color)]/10">
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
          </table>
        )}
      </ReportSection>
    </div>
  );
}

function PmsSnapshot({ data }) {
  const roomNumberList = (rooms) => (!rooms || rooms.length === 0 ? "—" : rooms.map((r) => r.room_number).join(", "));
  const arrivals = data?.arrivals || [];
  const departures = data?.departures || [];
  const stayOvers = data?.stay_overs || [];
  const roomStatus = data?.room_status || {};

  return (
    <div className="flex flex-col gap-6">
      {data?.previous_night_audit !== undefined && (
        <div className={`p-5 rounded-xl border w-full text-xl ${data.previous_night_audit ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
          {data.previous_night_audit
            ? `Previous night's audit ran at ${formatDateTime(data.previous_night_audit.audited_at)} — ${data.previous_night_audit.rooms_charged} room(s) charged, ${money(data.previous_night_audit.total_posted)} posted.`
            : "Previous night's audit has not been run yet."}
        </div>
      )}
      <ReportSection title="Stay-Overs" subtitle="Currently in-house, not arriving or departing today">
        {stayOvers.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Guest", "Check-In", "Check-Out"]} />
            <tbody>
              {stayOvers.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                  <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(r.check_in)}</td>
                  <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(r.check_out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
      <ReportSection title="Arrivals">
        {arrivals.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Guest", "Check-In", "Arrived?"]} />
            <tbody>
              {arrivals.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                  <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(r.check_in)}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.arrived ? "checked in" : "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
      <ReportSection title="Departures">
        {departures.length === 0 ? <EmptyRow /> : (
          <table className="w-full text-xl">
            <TableHead cells={["Guest", "Check-Out", "Departed?"]} />
            <tbody>
              {departures.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--text-color)]/10">
                  <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.guest_name}</td>
                  <td className="px-6 py-4 text-[color:var(--text-color)]/84">{formatDate(r.check_out)}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.departed ? "checked out" : "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>
      <ReportSection title="Room Status">
        <div className="p-6 flex flex-col gap-3 text-xl">
          <p><span className="font-bold text-[color:var(--black)]">Vacant ({(roomStatus.vacant || []).length}):</span> {roomNumberList(roomStatus.vacant)}</p>
          <p><span className="font-bold text-[color:var(--black)]">Occupied ({(roomStatus.occupied || []).length}):</span> {roomNumberList(roomStatus.occupied)}</p>
          <p><span className="font-bold text-[color:var(--black)]">Out of Order ({(roomStatus.out_of_order || []).length}):</span> {roomNumberList(roomStatus.out_of_order)}</p>
          <p><span className="font-bold text-[color:var(--black)]">Reserved ({(roomStatus.reserved || []).length}):</span> {roomNumberList(roomStatus.reserved)}</p>
          <p><span className="font-bold text-[color:var(--black)]">Complementary ({(roomStatus.complementary || []).length}):</span> {roomNumberList(roomStatus.complementary)}</p>
        </div>
      </ReportSection>
    </div>
  );
}

function AccommodationSnapshot({ data }) {
  const rows = data?.rows || [];
  return (
    <ReportSection title="Rooms in Use">
      {rows.length === 0 ? <EmptyRow /> : (
        <table className="w-full text-xl">
          <TableHead cells={["Date", "Guest", "Room Type", "Room No.", "Room Price", "Breakfast Price", "Payment Mode", "Payment Status", "Amount Paid", "Remarks"]} />
          <tbody>
            {rows.map((r, i) => (
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
                <td className="px-6 py-4"><StatusBadge status={r.remarks} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportSection>
  );
}
