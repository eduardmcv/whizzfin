import { useState } from "react";
import db from "../../db/database";
import {
  categoryUsage,
  deleteCategoryWithReassign,
} from "../../lib/categories";

const MAX_PINS = 3;

function PinIcon({ active, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
      <path d="M9 15l-4.5 4.5" />
      <path d="M14.5 4l5.5 5.5" />
    </svg>
  );
}

// -------------------------------------------------------------------
// Quick-access grid: up to 3 pinned categories + a "Categories" button
// that opens a popup with ALL categories of this type, where you can
// pick one, pin/unpin (max 3), add and delete (with reassignment).
// Layout: odd number of buttons => last one spans full width.
// -------------------------------------------------------------------
function CategoryPicker({ categories, type, value, onChange, onCategoriesChanged }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [newName, setNewName] = useState("");
  // { cat, usage, targetId } while a delete is being confirmed
  const [deleting, setDeleting] = useState(null);

  const ofType = categories
    .filter((c) => c.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
  const pinned = ofType.filter((c) => c.pinned).slice(0, MAX_PINS);
  const pinnedCount = ofType.filter((c) => c.pinned).length;
  const selected = ofType.find((c) => c.id === Number(value));
  const selectedIsPinned = selected && pinned.some((c) => c.id === selected.id);

  const totalButtons = pinned.length + 1;
  const lastSpansFull = totalButtons % 2 === 1;

  const togglePin = async (cat) => {
    if (!cat.pinned && pinnedCount >= MAX_PINS) return;
    await db.categories.update(cat.id, { pinned: !cat.pinned });
    onCategoriesChanged?.();
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    const newId = await db.categories.add({ name, type });
    setNewName("");
    await onCategoriesChanged?.();
    onChange(newId);
    setPopupOpen(false);
  };

  const startDelete = async (cat) => {
    const usage = await categoryUsage(db, cat.id);
    const others = ofType.filter((c) => c.id !== cat.id);
    setDeleting({
      cat,
      usage,
      targetId: usage.total > 0 && others.length > 0 ? String(others[0].id) : "",
    });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting.targetId === "" ? null : Number(deleting.targetId);
    await deleteCategoryWithReassign(db, deleting.cat.id, target);
    if (Number(value) === deleting.cat.id) onChange(target ?? "");
    setDeleting(null);
    onCategoriesChanged?.();
  };

  const pinnedBtnClass = (isSelected) =>
    `cursor-pointer h-11 px-3 rounded-lg text-sm font-medium flex items-center justify-center transition-colors border ${
      isSelected
        ? "bg-blue-3 border-blue-7 text-blue-11"
        : "bg-background border-border text-text-muted hover:text-text hover:bg-gray-3"
    }`;

  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-2">
        Category
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        {pinned.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={pinnedBtnClass(Number(value) === c.id)}
          >
            <span className="truncate">{c.name}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setPopupOpen(true)}
          className={`${pinnedBtnClass(false)} ${lastSpansFull ? "col-span-2" : ""} ${
            selected && !selectedIsPinned ? "border-blue-7 text-blue-11 bg-blue-3" : ""
          }`}
        >
          {selected && !selectedIsPinned ? (
            <span className="truncate">{selected.name}</span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M4 4h6v6h-6z" />
                <path d="M14 4h6v6h-6z" />
                <path d="M4 14h6v6h-6z" />
                <path d="M14 14h6v6h-6z" />
              </svg>
              Categories
            </span>
          )}
        </button>
      </div>

      {/* Popup with all categories */}
      {popupOpen && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-overlay-in"
          onClick={() => setPopupOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface p-6 rounded-2xl w-full sm:max-w-[460px] max-h-[80vh] flex flex-col border border-border shadow-2xl shadow-black/50 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-semibold text-text tracking-tight">
                Select category
              </h3>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                aria-label="Close"
                className="p-2 -mr-2 rounded-lg text-text-muted hover:text-text hover:bg-gray-3 cursor-pointer transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M18 6l-12 12" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2.5 mb-3">
              <input
                type="text"
                placeholder="New category"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                className="flex-1 h-11 px-3.5 border border-border rounded-lg bg-background text-text text-sm placeholder:text-gray-9 focus:outline-none focus:border-blue-7 transition-colors"
              />
              <button
                type="button"
                onClick={addCategory}
                className="px-5 h-11 bg-gray-8 text-white rounded-lg text-sm font-medium hover:bg-gray-7 cursor-pointer transition-colors"
              >
                Add
              </button>
            </div>

            <p className="text-xs text-text-muted mb-3">
              Pin up to {MAX_PINS} categories for quick access.
            </p>

            <ul className="overflow-y-auto flex flex-col gap-1">
              {ofType.length === 0 && (
                <li className="text-text-muted text-sm py-4 text-center">
                  No categories yet. Add one above.
                </li>
              )}
              {ofType.map((c) => {
                const pinDisabled = !c.pinned && pinnedCount >= MAX_PINS;
                const isDeleting = deleting?.cat.id === c.id;
                const others = ofType.filter((o) => o.id !== c.id);
                return (
                  <li key={c.id}>
                    <div
                      className={`flex items-center gap-1 rounded-lg border ${
                        Number(value) === c.id
                          ? "bg-blue-3 border-blue-7"
                          : "border-transparent hover:bg-gray-3"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onChange(c.id);
                          setPopupOpen(false);
                        }}
                        className="flex-1 text-left px-3.5 py-3 text-sm text-text cursor-pointer"
                      >
                        {c.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePin(c)}
                        disabled={pinDisabled}
                        aria-label={c.pinned ? "Unpin" : "Pin"}
                        title={
                          c.pinned
                            ? "Unpin"
                            : pinDisabled
                              ? `Max ${MAX_PINS} pinned`
                              : "Pin for quick access"
                        }
                        className={`p-2 rounded transition-colors ${
                          c.pinned
                            ? "text-emerald-400 hover:text-emerald-300"
                            : pinDisabled
                              ? "text-gray-8 opacity-40 cursor-not-allowed"
                              : "text-text-muted hover:text-text"
                        }`}
                      >
                        <PinIcon active={c.pinned} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          isDeleting ? setDeleting(null) : startDelete(c)
                        }
                        aria-label="Delete category"
                        title="Delete category"
                        className="p-2 mr-1 rounded text-text-muted hover:text-red-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                          <path d="M4 7l16 0" />
                          <path d="M10 11l0 6" />
                          <path d="M14 11l0 6" />
                          <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                          <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                        </svg>
                      </button>
                    </div>

                    {/* Delete confirmation with reassignment */}
                    {isDeleting && (
                      <div className="mt-1 mb-2 p-4 rounded-xl bg-gray-1 flex flex-col gap-3 animate-grow-in">
                        {deleting.usage.total > 0 ? (
                          <>
                            <p className="text-sm text-text">
                              <strong>{c.name}</strong> is used by{" "}
                              {deleting.usage.transactions > 0 && (
                                <>
                                  {deleting.usage.transactions}{" "}
                                  {deleting.usage.transactions === 1
                                    ? "entry"
                                    : "entries"}
                                </>
                              )}
                              {deleting.usage.transactions > 0 &&
                                deleting.usage.rules > 0 &&
                                " and "}
                              {deleting.usage.rules > 0 && (
                                <>
                                  {deleting.usage.rules}{" "}
                                  {deleting.usage.rules === 1
                                    ? "rule"
                                    : "rules"}
                                </>
                              )}
                              . Move them to:
                            </p>
                            <select
                              value={deleting.targetId}
                              onChange={(e) =>
                                setDeleting({
                                  ...deleting,
                                  targetId: e.target.value,
                                })
                              }
                              className="w-full h-11 px-3.5 border border-border rounded-lg bg-background text-text text-sm focus:outline-none focus:border-blue-7 transition-colors"
                            >
                              {others.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                              <option value="">No category</option>
                            </select>
                          </>
                        ) : (
                          <p className="text-sm text-text-muted">
                            Not used by any entry or rule. Delete{" "}
                            <strong className="text-text">{c.name}</strong>?
                          </p>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setDeleting(null)}
                            className="px-3.5 py-2 rounded-lg text-[13px] font-medium border border-border text-text-muted hover:bg-gray-3 cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={confirmDelete}
                            className="px-3.5 py-2 rounded-lg text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors"
                          >
                            {deleting.usage.total > 0
                              ? "Move & delete"
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryPicker;
