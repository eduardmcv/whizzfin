import { useState } from "react";
import db from "../../db/database";

function CategoriesForm({ categories, onSave }) {
  const [newName, setNewName] = useState("");

  const addCategory = async () => {
    if (!newName.trim()) return;
    await db.categories.add({ name: newName });
    setNewName("");
    onSave();
  };

  const deleteCategory = async (id) => {
    await db.categories.delete(id);
    onSave();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 p-2 border border-border rounded bg-background text-text"
        />
        <button
          onClick={addCategory}
          className="px-4 py-2 bg-gray-8 text-white rounded hover:bg-gray-7"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex justify-between items-center p-2 border-b border-border"
          >
            <span className="text-text">{c.name}</span>
            <button
              onClick={() => deleteCategory(c.id)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CategoriesForm;
