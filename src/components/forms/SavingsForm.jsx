import { useState } from "react";
import db from "../../db/database";

function SavingsForm({ defaultDay, year, month, onSave, editData }) {
  const defaultDate =
    editData?.date ||
    (defaultDay
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    amount: editData?.amount || "",
    description: editData?.description || "",
    date: defaultDate,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;

    const data = {
      amount: Number(form.amount),
      description: form.description,
      date: form.date,
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.savings.update(editData.id, data);
    } else {
      await db.savings.add({ ...data, createdAt: new Date().toISOString() });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border border-border rounded bg-background text-text"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
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
      <button
        type="submit"
        className="w-full p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
      >
        {editData ? "Update" : "Add"} Savings
      </button>
    </form>
  );
}

export default SavingsForm;
