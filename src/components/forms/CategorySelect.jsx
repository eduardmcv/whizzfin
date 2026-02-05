import { useState } from "react";
import db from "../../db/database";

function CategorySelect({
  categories,
  type,
  value,
  onChange,
  onCategoryAdded,
  required = false,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Filter by type and sort alphabetically
  const filteredCategories = categories
    .filter((c) => c.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newId = await db.categories.add({
      name: newCategoryName.trim(),
      type: type,
    });

    setNewCategoryName("");
    setIsAdding(false);

    // Notify parent to refresh categories and select the new one
    if (onCategoryAdded) {
      onCategoryAdded(newId);
    }
  };

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__add_new__") {
      setIsAdding(true);
    } else {
      onChange(val);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewCategoryName("");
    }
  };

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 p-2 border border-border rounded bg-background text-text"
          autoFocus
        />
        <button
          type="button"
          onClick={handleAddCategory}
          className="px-3 py-2 bg-gray-8 text-white rounded hover:bg-gray-7"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAdding(false);
            setNewCategoryName("");
          }}
          className="px-3 py-2 border border-border rounded hover:bg-surface text-text-muted"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      className="w-full p-2 border border-border rounded bg-background text-text"
      required={required}
    >
      <option value="">Select category</option>
      {filteredCategories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      <option value="__add_new__">+ Add new category</option>
    </select>
  );
}

export default CategorySelect;
