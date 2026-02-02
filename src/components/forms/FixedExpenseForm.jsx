import { useState } from "react";
import db from "../../db/database";

function FixedExpenseForm({ categories, onSave, editData }) {
  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    dayOfMonth: editData?.dayOfMonth || 1,
    categoryId: editData?.categoryId || categories[0]?.id || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      categoryId: Number(form.categoryId),
      active: true,
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.fixedExpenses.update(editData.id, data);
    } else {
      await db.fixedExpenses.add({
        ...data,
        createdAt: new Date().toISOString(),
      });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Title (e.g. Netflix)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full p-2 border border-border rounded bg-background text-text"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border border-border rounded bg-background text-text"
      />
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Day of month"
          value={form.dayOfMonth}
          onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
          className="w-full p-2 border border-border rounded bg-background text-text"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Amount (€)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full p-2 border border-border rounded bg-background text-text"
          required
        />
      </div>
      <select
        value={form.categoryId}
        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        className="w-full p-2 border border-border rounded bg-background text-text"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        {editData ? "Update" : "Add"} Fixed Expense
      </button>
    </form>
  );
}

export default FixedExpenseForm;
