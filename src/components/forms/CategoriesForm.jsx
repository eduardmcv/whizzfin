import { useState } from "react";
import db from "../../db/database";
import {
  categoryUsage,
  deleteCategoryWithReassign,
} from "../../lib/categories";

const MAX_PINS = 3;

function CategoriesForm({ categories, onSave, onChanged }) {
  const [activeTab, setActiveTab] = useState("expense");
  const [newName, setNewName] = useState("");
  // { cat, usage, targetId } while a delete is being confirmed
  const [deleting, setDeleting] = useState(null);

  const tabs = [
    { id: "expense", label: "Expenses" },
    { id: "income", label: "Incomes" },
    { id: "savings", label: "Savings" },
  ];

  const filteredCategories = categories
    .filter((c) => c.type === activeTab)
    .sort((a, b) => a.name.localeCompare(b.name));
  const pinnedCount = filteredCategories.filter((c) => c.pinned).length;

  const refresh = () => (onChanged ? onChanged() : onSave());

  const addCategory = async () => {
    if (!newName.trim()) return;
    await db.categories.add({ name: newName.trim(), type: activeTab });
    setNewName("");
    refresh();
  };

  const startDelete = async (cat) => {
    const usage = await categoryUsage(db, cat.id);
    const others = filteredCategories.filter((c) => c.id !== cat.id);
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
    setDeleting(null);
    refresh();
  };

  const togglePin = async (cat) => {
    if (!cat.pinned && pinnedCount >= MAX_PINS) return;
    await db.categories.update(cat.id, { pinned: !cat.pinned });
    refresh();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCategory();
    }
  };

  const inputClass =
    "h-11 px-3.5 border border-border rounded-lg bg-background text-text placeholder:text-gray-9 focus:outline-none focus:border-blue-7 transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* Type selector */}
      <div className="flex gap-1.5 bg-gray-1 p-1.5 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setDeleting(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-blue-9 text-white shadow-lg shadow-blue-9/25"
                : "text-text-muted hover:text-text hover:bg-gray-3"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add new category */}
      <div>
        <div className="flex gap-2.5">
          <input
            type="text"
            placeholder={`New ${activeTab} category`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 ${inputClass}`}
          />
          <button
            onClick={addCategory}
            className="px-5 h-11 bg-gray-8 text-white rounded-lg text-sm font-medium hover:bg-gray-7 cursor-pointer transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2.5">
          Pinned categories ({pinnedCount}/{MAX_PINS}) show as quick-access
          buttons in the forms.
        </p>
      </div>

      {/* Categories list */}
      <ul className="space-y-1 max-h-72 overflow-y-auto">
        {filteredCategories.length === 0 ? (
          <li className="text-text-muted text-sm py-4 text-center">
            No categories yet. Add one above.
          </li>
        ) : (
          filteredCategories.map((c) => {
            const pinDisabled = !c.pinned && pinnedCount >= MAX_PINS;
            const isDeleting = deleting?.cat.id === c.id;
            const others = filteredCategories.filter((o) => o.id !== c.id);
            return (
              <li key={c.id}>
                <div className="flex justify-between items-center px-3 py-2.5 rounded-lg hover:bg-gray-3 transition-colors">
                  <span className="text-text">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <button
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
                      className={`p-1 rounded transition-colors ${
                        c.pinned
                          ? "text-emerald-400 hover:text-emerald-300"
                          : pinDisabled
                            ? "text-gray-8 opacity-40 cursor-not-allowed"
                            : "text-text-muted hover:text-text"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={c.pinned ? 1.5 : 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
                        <path d="M9 15l-4.5 4.5" />
                        <path d="M14.5 4l5.5 5.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        isDeleting ? setDeleting(null) : startDelete(c)
                      }
                      className="text-red-400 hover:text-red-300 text-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </span>
                </div>

                {/* Delete confirmation with reassignment */}
                {isDeleting && (
                  <div className="mx-1 mt-1 mb-2 p-4 rounded-xl bg-gray-1 flex flex-col gap-3 animate-grow-in">
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
                              {deleting.usage.rules === 1 ? "rule" : "rules"}
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
                          className={`w-full ${inputClass}`}
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
                        onClick={() => setDeleting(null)}
                        className="px-3.5 py-2 rounded-lg text-[13px] font-medium border border-border text-text-muted hover:bg-gray-3 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
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
          })
        )}
      </ul>
    </div>
  );
}

export default CategoriesForm;
