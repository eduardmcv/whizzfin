import { useState } from "react";
import db from "../../db/database";

function CategoriesForm({ categories, onSave }) {
  const [activeTab, setActiveTab] = useState("expense");
  const [newName, setNewName] = useState("");

  const tabs = [
    { id: "expense", label: "Expenses" },
    { id: "income", label: "Incomes" },
    { id: "savings", label: "Savings" },
  ];

  const filteredCategories = categories
    .filter((c) => c.type === activeTab)
    .sort((a, b) => a.name.localeCompare(b.name));

  const addCategory = async () => {
    if (!newName.trim()) return;
    await db.categories.add({ name: newName.trim(), type: activeTab });
    setNewName("");
    onSave();
  };

  const deleteCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    await db.categories.delete(id);
    onSave();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCategory();
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-2 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add new category */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={`New ${activeTab} category`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 p-2 border border-border rounded bg-background text-text"
        />
        <button
          onClick={addCategory}
          className="px-4 py-2 bg-gray-8 text-white rounded hover:bg-gray-7"
        >
          Add
        </button>
      </div>

      {/* Categories list */}
      <ul className="space-y-1 max-h-64 overflow-y-auto">
        {filteredCategories.length === 0 ? (
          <li className="text-text-muted text-sm py-4 text-center">
            No categories yet. Add one above.
          </li>
        ) : (
          filteredCategories.map((c) => (
            <li
              key={c.id}
              className="flex justify-between items-center p-2 rounded hover:bg-surface"
            >
              <span className="text-text">{c.name}</span>
              <button
                onClick={() => deleteCategory(c.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default CategoriesForm;
