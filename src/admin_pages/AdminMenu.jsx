import { useState, useEffect, useCallback, Fragment } from "react";
import { IoRestaurantOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import AutoGrowTextarea from "../components/shared/AutoGrowTextarea";
import { btn, field, table } from "../components/shared/ui";
import { isManager, isWaitstaff } from "../utils/auth";
import {
  fetchFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  fetchDrinkItems,
  createDrinkItem,
  updateDrinkItem,
  deleteDrinkItem,
  recordDrinkStockMovement,
} from "../utils/menu-api";

const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function AdminMenu() {
  const manager = isManager();
  // A waitron gets full Menu access — same as manager, including
  // pricing/add/delete — not just view+stock-adjust.
  const canAccess = manager || isWaitstaff();
  const [tab, setTab] = useState("food");

  if (!canAccess) {
    return (
      <div data-component="AdminMenu" className="px-[4rem] max-sm:px-[1rem] py-[4rem]">
        <p className="text-2xl text-[color:var(--text-color)]/68">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div data-component="AdminMenu" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]">
      <PageHeading icon={IoRestaurantOutline}>Menu</PageHeading>
      <p className="text-xl text-[color:var(--text-color)]/76">
        Food and drink items a waitron picks from when posting a charge to a folio, or when recording a non-guest sale. Prices set here are what auto-fills — always still editable at the point of charging.
      </p>

      <div className="flex gap-3 text-xl flex-wrap">
        {[
          { key: "food", label: "Food" },
          { key: "drinks", label: "Drinks" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 rounded-lg font-bold cursor-pointer transition-all ${
              tab === t.key ? "bg-[color:var(--emphasis)] text-white" : "bg-black/4 text-[color:var(--text-color)] hover:bg-black/8"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "food" ? (
        <MenuSection
          key="food"
          label="food item"
          fetchItems={fetchFoodItems}
          createItem={createFoodItem}
          updateItem={updateFoodItem}
          deleteItem={deleteFoodItem}
          canEdit={canAccess}
        />
      ) : (
        <MenuSection
          key="drinks"
          label="drink item"
          fetchItems={fetchDrinkItems}
          createItem={createDrinkItem}
          updateItem={updateDrinkItem}
          deleteItem={deleteDrinkItem}
          recordStock={recordDrinkStockMovement}
          canEdit={canAccess}
        />
      )}
    </div>
  );
}

function MenuSection({ label, fetchItems, createItem, updateItem, deleteItem, recordStock, canEdit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", price: "", service_charge: "" });
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", service_charge: "" });
  const [savingId, setSavingId] = useState(null);

  // Delete is only allowed for an item with zero order/stock history (the
  // backend rejects anything else with a 409) — a two-click confirm avoids
  // a native confirm() popup for something this rarely used and hard to undo.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Stock adjustment (drinks only — recordStock is undefined for food) —
  // feeds the Bar Stock report (Reports → Bar Stock), separate from is_active
  // ("In Stock"/"Out of Stock" above, which is really just menu availability).
  const [stockAdjustId, setStockAdjustId] = useState(null);
  const [stockForm, setStockForm] = useState({ movement_type: "added", quantity: "", notes: "" });
  const [savingStockId, setSavingStockId] = useState(null);
  const [stockSuccessId, setStockSuccessId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await fetchItems(showInactive));
      setError(null);
    } catch (err) {
      setError((err.response?.data?.message || `Failed to load ${label}s.`) + " Please refresh the page.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.price) return;
    try {
      setAdding(true);
      setError(null);
      await createItem({ name: addForm.name.trim(), price: Number(addForm.price), service_charge: Number(addForm.service_charge || 0) });
      setAddForm({ name: "", price: "", service_charge: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to add ${label}.`);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, price: String(item.price), service_charge: String(item.service_charge || 0) });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim() || !editForm.price) return;
    try {
      setSavingId(id);
      setError(null);
      await updateItem(id, { name: editForm.name.trim(), price: Number(editForm.price), service_charge: Number(editForm.service_charge || 0) });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update ${label}.`);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      setSavingId(item.id);
      setError(null);
      await updateItem(item.id, { is_active: !item.is_active });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update ${label}.`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (item) => {
    try {
      setDeletingId(item.id);
      setError(null);
      await deleteItem(item.id);
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to delete ${label}.`);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  // Drinks only (recordStock is undefined for food): once an item has a
  // tracked stock ledger, computed current_stock hitting 0 or below shows
  // "Out of Stock" automatically — informational only, doesn't block
  // ordering (a hotel may still have physical stock that just hasn't been
  // logged as "Added" yet). current_stock is null until the item's first
  // stock movement is ever recorded — shown as its own "Not Tracked" state
  // rather than defaulting to "In Stock", which used to read as false
  // confidence (every drink showed In Stock even with zero stock ever
  // logged).
  const statusBadge = (item) => {
    if (!item.is_active) return { label: "Out of Stock", className: "bg-gray-100 text-gray-600" };
    if (recordStock) {
      if (item.current_stock === null || item.current_stock === undefined) {
        return { label: "Not Tracked", className: "bg-gray-100 text-gray-600" };
      }
      if (item.current_stock <= 0) return { label: "Out of Stock", className: "bg-gray-100 text-gray-600" };
    }
    return { label: "In Stock", className: "bg-green-100 text-green-700" };
  };

  const startStockAdjust = (item) => {
    setStockAdjustId(item.id);
    setStockForm({ movement_type: "added", quantity: "", notes: "" });
  };

  const handleSaveStockAdjust = async (id) => {
    const qty = Number(stockForm.quantity);
    // Added/damaged are always a positive count. Correction is the odd one
    // out: the field holds the real, physically-counted stock total (never
    // negative, and 0 is a genuine valid count — fully out of stock) — the
    // server works out the ledger delta against the live current stock.
    const valid = stockForm.movement_type === "correction"
      ? stockForm.quantity !== "" && qty >= 0
      : qty >= 1;
    if (!valid) return;
    try {
      setSavingStockId(id);
      setError(null);
      await recordStock(id, {
        movement_type: stockForm.movement_type,
        quantity: Number(stockForm.quantity),
        notes: stockForm.notes.trim() || undefined,
      });
      setStockAdjustId(null);
      setStockSuccessId(id);
      setTimeout(() => setStockSuccessId(null), 4000);
      await load(); // reflect the new current_stock/status without a reload
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record stock movement.");
    } finally {
      setSavingStockId(null);
    }
  };

  // Stock is a drinks-only column — Name, Price, Service Charge, Status,
  // Actions is 5 for food; drinks get a 6th for it.
  const columnCount = recordStock ? 6 : 5;

  const stockQtyValid = stockForm.movement_type === "correction"
    ? stockForm.quantity !== "" && Number(stockForm.quantity) >= 0
    : Number(stockForm.quantity) >= 1;

  return (
    <div className="w-full flex flex-col gap-6">
      {error && <p className="text-red-600 text-xl bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <label className="flex items-center gap-3 text-xl cursor-pointer">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-5 h-5 cursor-pointer" />
        Show out-of-stock items
      </label>

      <div className={table.card}>
        <div className={table.scroll}>
          <table className={table.el}>
            <thead>
              <tr className={table.headRow}>
                <th className={table.th}>Name</th>
                <th className={table.th}>Price (₦)</th>
                <th className={table.th}>Service Charge (₦)</th>
                {recordStock && <th className={table.th}>Stock</th>}
                <th className={table.th}>Status</th>
                <th className={table.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columnCount} className="px-8 py-10 text-center text-xl"><LoadingSpinner /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={columnCount} className="px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68">No {label}s yet.</td></tr>
              ) : (
                items.map((item) => (
                  <Fragment key={item.id}>
                    <tr className={table.row}>
                      {editingId === item.id ? (
                        <>
                          <td className={table.td}>
                            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={`${field.input} text-xl!`} />
                          </td>
                          <td className={table.td}>
                            <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className={`${field.input} text-xl! w-32`} />
                          </td>
                          <td className={table.td}>
                            <input type="number" value={editForm.service_charge} onChange={(e) => setEditForm({ ...editForm, service_charge: e.target.value })} className={`${field.input} text-xl! w-32`} />
                          </td>
                          {recordStock && (
                            <td className={table.td}>{item.current_stock ?? "—"}</td>
                          )}
                          <td className={table.td}>
                            <span className={`text-sm font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${statusBadge(item).className}`}>
                              {statusBadge(item).label}
                            </span>
                          </td>
                          <td className={table.td}>
                            <div className={table.actions}>
                              <button onClick={() => handleSaveEdit(item.id)} disabled={savingId === item.id} className={btn.rowPrimary}>
                                {savingId === item.id ? "Saving..." : "Save"}
                              </button>
                              <button onClick={() => setEditingId(null)} className={btn.rowSecondary}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`${table.td} font-medium`}>{item.name}</td>
                          <td className={table.td}>{money(item.price)}</td>
                          <td className={table.td}>{money(item.service_charge)}</td>
                          {recordStock && (
                            <td className={table.td}>{item.current_stock ?? "—"}</td>
                          )}
                          <td className={table.td}>
                            <span className={`text-sm font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${statusBadge(item).className}`}>
                              {statusBadge(item).label}
                            </span>
                          </td>
                          <td className={table.td}>
                            <div className={table.actions}>
                              {canEdit && <button onClick={() => startEdit(item)} className={btn.rowSecondary}>Edit</button>}
                              {/* For drinks, going out of stock is now automatic (computed from the ledger) — this manual toggle only stays available to reactivate an item deactivated before that existed. */}
                              {canEdit && (!recordStock || !item.is_active) && (
                                <button onClick={() => handleToggleActive(item)} disabled={savingId === item.id} className={item.is_active ? btn.rowDanger : btn.rowSuccess}>
                                  {savingId === item.id ? "..." : item.is_active ? "Set Out of Stock" : "Mark In Stock"}
                                </button>
                              )}
                              {recordStock && (
                                <button onClick={() => startStockAdjust(item)} className={btn.rowSecondary}>
                                  {stockSuccessId === item.id ? "Recorded ✓" : "Adjust Stock"}
                                </button>
                              )}
                              {canEdit && deleteItem && (
                                confirmDeleteId === item.id ? (
                                  <>
                                    <button onClick={() => handleDelete(item)} disabled={deletingId === item.id} className={btn.rowDanger}>
                                      {deletingId === item.id ? "Deleting..." : "Confirm Delete"}
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(null)} className={btn.rowSecondary}>Cancel</button>
                                  </>
                                ) : (
                                  <button onClick={() => setConfirmDeleteId(item.id)} className={btn.rowSecondary}>Delete</button>
                                )
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                    {recordStock && stockAdjustId === item.id && (
                      <tr className={table.row}>
                        <td colSpan={columnCount} className={`${table.td} bg-[color:var(--text-color)]/3`}>
                          <div className="flex flex-wrap gap-4 items-end">
                            <span className="text-xl font-semibold whitespace-nowrap">Adjust stock — {item.name}</span>
                            <div className="flex flex-col gap-2">
                              <label className={field.label}>Type</label>
                              <select value={stockForm.movement_type} onChange={(e) => setStockForm({ ...stockForm, movement_type: e.target.value })} className={`${field.select} text-xl!`}>
                                <option value="added">Added (restock)</option>
                                <option value="damaged">Damaged (breakage/spillage/expiry)</option>
                                <option value="correction">Correction (set the real, counted total)</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className={field.label}>{stockForm.movement_type === "correction" ? "Actual Count" : "Quantity"}</label>
                              <input
                                type="number"
                                min="0"
                                value={stockForm.quantity}
                                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                                className={`${field.input} text-xl! w-32`}
                              />
                              {stockForm.movement_type === "correction" && (
                                <span className="text-base text-[color:var(--text-color)]/60">The real total counted on the shelf right now, not a +/- adjustment</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 flex-1 min-w-48">
                              <label className={field.label}>Notes (optional)</label>
                              <AutoGrowTextarea value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} className={`${field.textarea} text-xl!`} />
                            </div>
                            <div className={table.actions}>
                              <button onClick={() => handleSaveStockAdjust(item.id)} disabled={savingStockId === item.id || !stockQtyValid} className={btn.rowPrimary}>
                                {savingStockId === item.id ? "Saving..." : "Save"}
                              </button>
                              <button onClick={() => setStockAdjustId(null)} className={btn.rowSecondary}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <form onSubmit={handleAdd} className="flex flex-col gap-4 bg-white rounded-xl border border-[color:var(--text-color)]/10 p-6 max-w-xl">
          <p className="text-lg font-semibold uppercase tracking-wide text-[color:var(--text-color)]/68">Add a {label}</p>
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col gap-2 flex-1 min-w-48">
              <label className={field.label}>Name</label>
              <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className={field.input} />
            </div>
            <div className="flex flex-col gap-2 w-40">
              <label className={field.label}>Price (₦)</label>
              <input type="number" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} className={field.input} />
            </div>
            <div className="flex flex-col gap-2 w-40">
              <label className={field.label}>Service Charge (₦)</label>
              <input type="number" value={addForm.service_charge} onChange={(e) => setAddForm({ ...addForm, service_charge: e.target.value })} className={field.input} />
            </div>
            <button type="submit" disabled={adding || !addForm.name.trim() || !addForm.price} className={btn.primary}>
              {adding ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
