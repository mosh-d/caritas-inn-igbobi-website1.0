import { field, btn } from "./ui";

const PAYMENT_METHODS = ["cash", "card", "transfer", "pos", "online"];

// A guest can pay/deposit partly with one method and partly with another
// (e.g. ₦30k cash + ₦20k transfer) in a single action — this renders that as
// a repeatable list of {amount, method} rows, shared between the payment
// form (AdminFolios.jsx) and the deposit form (AdminReservations.jsx).
export default function PaymentSplitRows({ splits, setSplits }) {
  const updateSplit = (i, patch) => {
    setSplits(splits.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const addSplit = () => setSplits([...splits, { amount: "", payment_method: "transfer" }]);
  const removeSplit = (i) => setSplits(splits.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      {splits.map((s, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label className={field.label}>Amount (₦) *</label>
            <input
              type="number"
              value={s.amount}
              onChange={(e) => updateSplit(i, { amount: e.target.value })}
              className={field.input}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={field.label}>Method *</label>
            <select value={s.payment_method} onChange={(e) => updateSplit(i, { payment_method: e.target.value })} className={field.select}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
            </select>
          </div>
          {splits.length > 1 && (
            <button type="button" onClick={() => removeSplit(i)} className={btn.rowDanger}>
              Remove
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={addSplit} className={`${btn.secondary} self-start text-lg! px-6! pt-3! pb-3!`}>
        + Add another method
      </button>
    </div>
  );
}
