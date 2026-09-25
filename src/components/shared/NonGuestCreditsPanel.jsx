import { creditOwnerLabel, creditServiceLabel } from "./nonGuestCredits";
import { formatDateTime } from "../../utils/report-format";
import { table } from "./ui";

const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// Money the hotel owes back, listed the same way money owed TO the hotel
// already is. Until now an overpayment on a walk-in bill went into a credit
// row that no screen showed, so nobody could tell it existed — the one place
// it could surface needed the sale to have been rung up under a name, and
// most aren't.
//
// Read-only on purpose: a credit is spent against a particular bill, so it
// is applied from inside that folio (where the target is unambiguous), not
// from a list where it isn't. This is the list that tells staff there is
// something to spend.
export default function NonGuestCreditsPanel({ credits = [], loading = false }) {
  const pending = credits.filter((c) => c.status === "pending");
  const total = pending.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h3 className="text-3xl font-bold text-[color:var(--black)]">Unclaimed Credit</h3>
        {pending.length > 0 && (
          <span className="text-xl font-bold text-blue-700">{money(total)} on file</span>
        )}
      </div>
      <p className="text-lg text-[color:var(--text-color)]/68">
        Overpayments kept on file. Open the bill you want it spent on and apply it there — a credit
        from an overpayment can always be applied back to the bill it came off.
      </p>
      {loading ? null : pending.length === 0 ? (
        <p className="text-xl text-[color:var(--text-color)]/68">No unclaimed credit right now.</p>
      ) : (
        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={`${table.th} ${table.stickyTh}`}>Customer</th>
                  <th className={table.th}>From</th>
                  <th className={table.th}>Sold As</th>
                  <th className={table.th}>Date &amp; Time</th>
                  <th className={table.th}>Amount</th>
                  <th className={table.th}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id} className={table.row}>
                    <td className={`${table.td} ${table.stickyTd}`}>{creditOwnerLabel(c)}</td>
                    <td className={table.td}>{c.source_folio?.folio_number || "—"}</td>
                    <td className={table.td}>{creditServiceLabel(c)}</td>
                    <td className={`${table.td} whitespace-nowrap`}>{formatDateTime(c.created_at)}</td>
                    <td className={`${table.td} font-bold text-blue-700`}>{money(c.amount)}</td>
                    <td className={`${table.td} font-mono text-base`}>{c.credit_reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
