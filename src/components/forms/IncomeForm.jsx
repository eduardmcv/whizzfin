import { useState } from "react";
import db from "../../db/database";

function IncomeForm({ onSave, editData }) {
  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    date: editData?.date || new Date().toISOString().split("T")[0],
    isRecurring: editData?.isRecurring || false,
    dayOfMonth: editData?.dayOfMonth || 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.incomes.update(editData.id, data);
    } else {
      await db.incomes.add({ ...data, createdAt: new Date().toISOString() });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Title (e.g. Salary)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full p-2 border border-border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border border-border rounded"
      />

      <div className="flex gap-2">
        {form.isRecurring ? (
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Day of month"
            value={form.dayOfMonth}
            onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
            className="w-full p-2 border border-border rounded"
          />
        ) : (
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full p-2 border border-border rounded"
          />
        )}
        <input
          type="number"
          step="0.01"
          placeholder="Amount (€)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full p-2 border border-border rounded"
          required
        />
      </div>
      <label className="flex items-center gap-2 pl-1 mb-3">
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
        />
        Recurring monthly
      </label>
      <button
        type="submit"
        className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {editData ? "Update" : "Add"} Income
      </button>
    </form>
  );
}

export default IncomeForm;
