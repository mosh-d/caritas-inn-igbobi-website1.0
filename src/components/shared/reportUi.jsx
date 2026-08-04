import { pct } from "../../utils/report-format";

// Small render pieces shared by AdminReports.jsx (the live report tabs) and
// AccountantReportsPage.jsx (rendering a sent report's frozen snapshot_data)
// — kept in one place so a snapshot always renders identically to how it
// looked when it was sent.

export function ReportSection({ title, subtitle, children }) {
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

export function TableHead({ cells }) {
  return (
    <thead>
      <tr className="border-b border-[color:var(--text-color)]/10">
        {cells.map((c, i) => (
          <th
            key={i}
            className="px-6 py-3 text-left text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function EmptyRow() {
  return <p className="text-2xl text-[color:var(--text-color)]/68 px-6 py-8">No data for this period.</p>;
}

export function SummaryCard({ label, value, sub, accent, warn }) {
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

export function OccupancyBadge({ value }) {
  const v = Number(value || 0);
  const color = v >= 80 ? "bg-green-100 text-green-700" : v >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xl font-bold ${color}`}>
      {pct(v)}
    </span>
  );
}
