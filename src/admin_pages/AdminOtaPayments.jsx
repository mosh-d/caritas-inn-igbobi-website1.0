import { useState, useEffect, useCallback } from "react";
import { IoBusinessOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import Modal from "../components/shared/Modal";
import StatusBadge from "../components/shared/StatusBadge";
import { btn, field, table } from "../components/shared/ui";
import { fetchOtaSettlements, markOtaSettlementPaid } from "../utils/ota-api";

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// Money owed by OTAs rather than by guests.
//
// It lives on its own page because an OTA normally pays well after the guest
// has gone — by then the folio is off every in-house list, so there would be
// nowhere to go and mark it paid. Pending is the chase list; Paid is the
// record of what has landed.
export default function AdminOtaPaymentsPage() {
  const [status, setStatus] = useState("pending");
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSettlements(await fetchOtaSettlements(status));
    } catch (err) {
      setError((err.response?.data?.message || "Failed to load OTA payments.") + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmPaid = async () => {
    if (!confirming) return;
    try {
      setSaving(true);
      setError(null);
      await markOtaSettlementPaid(confirming.id, reference.trim() || undefined);
      setConfirming(null);
      setReference("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record the OTA payment.");
      setConfirming(null);
    } finally {
      setSaving(false);
    }
  };

  const pendingTotal = settlements
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  return (
    <div data-component="AdminOtaPayments" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoBusinessOutline}>OTA Payments</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Nights an OTA is paying for instead of the guest. The folio keeps showing them as owing until the money
        arrives, and the guest is never asked for them. Marking one paid records the money against that folio.
      </p>

      {error && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        {[
          { key: "pending", label: "Awaiting Payment" },
          { key: "paid", label: "Paid" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={status === tab.key ? btn.rowPrimary : btn.rowSecondary}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === "pending" && !loading && settlements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 flex items-center justify-between gap-4 flex-wrap w-full">
          <span className="text-amber-800 font-bold text-xl">Total awaiting OTA payment:</span>
          <span className="text-amber-800 font-bold text-2xl">{money(pendingTotal)}</span>
        </div>
      )}

      <div className={table.card}>
        <div className={table.scroll}>
          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : settlements.length === 0 ? (
            <p className="text-2xl text-[color:var(--text-color)]/68 px-8 py-10">
              {status === "pending" ? "No OTA payments are outstanding." : "No OTA payments have been recorded yet."}
            </p>
          ) : (
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Guest</th>
                  <th className={table.th}>Booking Ref</th>
                  <th className={table.th}>Nights Covered</th>
                  <th className={table.th}>Covers</th>
                  <th className={table.th}>Amount</th>
                  <th className={table.th}>Status</th>
                  <th className={table.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className={table.row}>
                    <td className={table.td}>{s.reservation?.guest_name || "—"}</td>
                    <td className={table.td}>{s.reservation?.booking_reference || "—"}</td>
                    <td className={table.td}>{s.start_date} to {s.end_date}</td>
                    <td className={table.td}>{s.includes_breakfast ? "Room and breakfast" : "Room only"}</td>
                    <td className={table.td}>{money(s.amount)}</td>
                    <td className={table.td}>
                      <StatusBadge status={s.status === "paid" ? "paid" : "owing"} />
                    </td>
                    <td className={table.td}>
                      {s.status === "pending" ? (
                        <button onClick={() => { setConfirming(s); setReference(s.reference || ""); }} className={btn.rowSuccess}>
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-[color:var(--text-color)]/60">{s.reference || "Recorded"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirming && (
        <Modal
          onClose={() => setConfirming(null)}
          title="Record this OTA payment?"
          subtitle={`${confirming.reservation?.guest_name || "Guest"} · ${confirming.start_date} to ${confirming.end_date}`}
          size="sm"
          footer={
            <>
              <button onClick={() => setConfirming(null)} className={btn.secondary}>Cancel</button>
              <button onClick={confirmPaid} disabled={saving} className={btn.success}>
                {saving ? "Recording..." : `Yes, ${money(confirming.amount)} received`}
              </button>
            </>
          }
        >
          <p className="text-xl text-[color:var(--text-color)]/76">
            This records {money(confirming.amount)} against the guest folio as money from the OTA, settling the
            nights it covered. Only do it once the money has actually arrived.
          </p>
          <div className="flex flex-col gap-2">
            <label className={field.label}>OTA reference (optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="The remittance reference, if they gave one"
              className={field.input}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
