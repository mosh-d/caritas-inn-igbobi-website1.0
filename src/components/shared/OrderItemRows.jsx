import { useState, useEffect, useRef } from "react";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import { btn, field } from "./ui";

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// The item lines of one bill, shared by Guest Sales and Non-Guest Sales —
// both post the same food/drink lines, and Non-Guest additionally has the
// "For Manager" toggle (showManagerToggle).
//
// Each line collapses to a one-line summary, so a bill of fifteen items reads
// as fifteen lines instead of a wall of identical selects. That wall is what
// made a half-filled line impossible to spot and the Post button look broken
// — an unfilled line is what blocks posting (see each page's
// postableRows/blockReason).
//
// Picking an item never collapses the line being worked on: a line closes
// only when + Add Item opens the next one, or when its own summary is
// clicked. A line still missing its item says so in its summary, so a
// collapsed line never hides what is blocking the bill.
export default function OrderItemRows({
  rows,
  onUpdate,
  onRemove,
  onAdd,
  menuFor,
  itemFor,
  rowAmount,
  rowServiceCharge,
  showManagerToggle = false,
}) {
  // Which lines are open is tracked explicitly and never derived from whether
  // a line is filled in — deriving it meant typing the last missing field
  // closed the line under the cursor.
  const [openRows, setOpenRows] = useState(() => new Set([0]));
  const previousCount = useRef(rows.length);
  useEffect(() => {
    setOpenRows((current) => {
      // A new line is the one now being worked on, so it opens and the
      // finished line closes behind it.
      if (rows.length > previousCount.current) return new Set([rows.length - 1]);
      // A shorter list — a line removed, or the whole form reset after
      // posting — can leave the open index pointing at a line that no longer
      // exists. Fall back to the last line so there is always one open.
      const stillThere = new Set([...current].filter((index) => index < rows.length));
      return stillThere.size > 0 ? stillThere : new Set([Math.max(rows.length - 1, 0)]);
    });
    previousCount.current = rows.length;
  }, [rows.length]);

  const toggle = (index) => {
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {rows.map((row, index) => {
        const open = openRows.has(index);
        const item = itemFor(row);
        const comped = row.is_complementary || row.is_manager;
        return (
          <div
            key={index}
            className={`rounded-xl border-2 transition-colors ${
              open
                ? "border-[color:var(--text-color)]/30 bg-black/[0.04]"
                : "border-[color:var(--text-color)]/15 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
              >
                {open ? <IoChevronDown size={20} className="shrink-0" /> : <IoChevronForward size={20} className="shrink-0" />}
                <span className="text-lg font-bold text-[color:var(--text-color)]/60 shrink-0">{index + 1}.</span>
                <span className="text-xl truncate">
                  {item ? (
                    <>
                      <span className="font-semibold text-[color:var(--black)]">{item.name}</span>
                      <span className="text-[color:var(--text-color)]/68"> &times; {row.quantity || 0}</span>
                    </>
                  ) : (
                    // Amber, because this is the line that keeps the bill from
                    // being posted — it has to read as unfinished at a glance,
                    // even while collapsed.
                    <span className="text-orange-600 font-semibold">No item picked yet</span>
                  )}
                </span>
                {comped && (
                  <span className="text-sm font-bold uppercase tracking-wide text-purple-700 bg-purple-100 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                    {row.is_manager ? "Manager" : "Complementary"}
                  </span>
                )}
              </button>
              <span className="text-xl font-bold whitespace-nowrap">{money(rowAmount(row) + rowServiceCharge(row))}</span>
              {rows.length > 1 && (
                <button type="button" onClick={() => onRemove(index)} className={btn.rowDanger}>Remove</button>
              )}
            </div>

            {open && (
              <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
                <div className="flex flex-col gap-2">
                  <label className={field.label}>Kind</label>
                  <select
                    value={row.item_kind}
                    onChange={(e) =>
                      onUpdate(index, {
                        item_kind: e.target.value,
                        reference_id: "",
                        is_complementary: false,
                        ...(showManagerToggle ? { is_manager: false } : {}),
                      })
                    }
                    className={field.select}
                  >
                    <option value="food">Food</option>
                    <option value="drink">Drink</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={field.label}>Item</label>
                  <select
                    value={row.reference_id}
                    onChange={(e) => onUpdate(index, { reference_id: e.target.value })}
                    className={field.select}
                  >
                    <option value="">Select an item</option>
                    {menuFor(row.item_kind).map((i) => <option key={i.id} value={i.id}>{i.name} &mdash; {money(i.price)}</option>)}
                  </select>
                  {!row.reference_id && (
                    <p className="text-lg text-[color:var(--text-color)]/60">Pick an item, or remove this line, to post the bill.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={field.label}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => onUpdate(index, { quantity: e.target.value })}
                    className={field.input}
                  />
                </div>
                <div className="flex gap-6 flex-wrap items-center">
                  <label className="flex items-center gap-2 text-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(row.is_complementary) || (showManagerToggle && Boolean(row.is_manager))}
                      disabled={showManagerToggle && Boolean(row.is_manager)}
                      onChange={(e) => onUpdate(index, { is_complementary: e.target.checked })}
                      className="w-5 h-5 cursor-pointer"
                    />
                    Complementary
                  </label>
                  {showManagerToggle && (
                    <label className="flex items-center gap-2 text-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(row.is_manager)}
                        onChange={(e) =>
                          onUpdate(index, {
                            is_manager: e.target.checked,
                            is_complementary: e.target.checked ? true : row.is_complementary,
                          })
                        }
                        className="w-5 h-5 cursor-pointer"
                      />
                      For Manager
                    </label>
                  )}
                </div>
                {Number(rowServiceCharge(row)) > 0 && (
                  <p className="text-lg text-[color:var(--text-color)]/60">Service Charge: {money(rowServiceCharge(row))}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={onAdd} className={`${btn.rowSecondary} self-start`}>+ Add Item</button>
    </div>
  );
}
