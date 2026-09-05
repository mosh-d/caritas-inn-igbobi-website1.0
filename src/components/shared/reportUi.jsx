import { pct } from "../../utils/report-format";

// Small render pieces shared by every report tab in AdminReports.jsx —
// kept in one place so each report looks and behaves identically.

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

// `rightAlign` lists the column labels whose VALUES are right-aligned —
// money and counts, where the digits need to line up. Without it the header
// sat hard-left over right-aligned figures, so an "Amount" column read as
// two unrelated columns. Matched by label rather than index so inserting a
// column can't silently shift the alignment onto the wrong one.
export function TableHead({ cells, rightAlign = [] }) {
  return (
    <thead>
      <tr className="border-b border-[color:var(--text-color)]/10">
        {cells.map((c, i) => (
          <th
            key={i}
            className={`px-6 py-3 ${rightAlign.includes(c) ? "text-right" : "text-left"} text-xl font-semibold text-[color:var(--text-color)]/76 uppercase tracking-wide`}
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

// "By Staff" — who actually did the work behind a report, shown on every
// report now that reports are generated directly by whoever needs them
// rather than snapshotted and handed to the accountant.
//
// Check-ins, check-outs and payments are three SEPARATE tables rather than
// one merged figure: they are different units (a count of guests vs. an
// amount of money), and a receptionist who checked ten guests in has done
// something different from one who took ten payments. A staff member appears
// in whichever tables they acted in.
//
// On a report covering a date range the backend buckets each row by business
// day and sends a `date`; single-day reports send null and the column is
// dropped. "Unattributed" covers activity recorded before individual staff
// logins existed — those rows have no staff account to resolve to.
export function StaffActivitySection({ activity, money }) {
  if (!activity) return null;
  const groups = [
    { key: "check_ins", label: "Check-Ins", unit: "Guests", amount: false },
    { key: "check_outs", label: "Check-Outs", unit: "Guests", amount: false },
    { key: "payments", label: "Payments Taken", unit: "Count", amount: true },
  ].filter((g) => (activity[g.key] || []).length > 0);

  if (groups.length === 0) {
    return (
      <ReportSection title="By Staff" subtitle="Who handled this day's activity">
        <EmptyRow />
      </ReportSection>
    );
  }

  return (
    <ReportSection title="By Staff" subtitle="Who handled this activity — check-ins, check-outs and payments counted separately">
      <div className="flex flex-col gap-8 p-6">
        {groups.map((g) => {
          const rows = activity[g.key];
          const dated = rows.some((r) => r.date);
          const cells = [...(dated ? ["Date"] : []), "Staff", g.unit, ...(g.amount ? ["Amount"] : [])];
          return (
            <div key={g.key} className="flex flex-col gap-2">
              <h3 className="text-2xl font-bold text-[color:var(--black)]">{g.label}</h3>
              <table className="w-full text-xl">
                <TableHead cells={cells} rightAlign={g.amount ? ["Amount"] : []} />
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-[color:var(--text-color)]/10 last:border-b-0">
                      {dated && <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.date}</td>}
                      <td className="px-6 py-4 font-medium text-[color:var(--black)]">{r.staff_name}</td>
                      <td className="px-6 py-4 text-[color:var(--text-color)]/84">{r.count}</td>
                      {g.amount && (
                        <td className="px-6 py-4 text-right text-[color:var(--black)]">{money(r.total)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}
