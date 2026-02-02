import { useState } from "react";
import db from "../../db/database";

function ForecastForm({
  categories,
  defaultDay,
  year,
  month,
  onSave,
  editData,
}) {
  const defaultDate =
    editData?.date ||
    (defaultDay
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    date: defaultDate,
    categoryId: editData?.categoryId || categories[0]?.id || "",
    deductFrom: editData?.deductFrom || "monthly",
    status: editData?.status || "pending",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.forecasts.update(editData.id, data);
    } else {
      await db.forecasts.add({ ...data, createdAt: new Date().toISOString() });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Title (e.g. Haircut)"
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
      <select
        value={form.deductFrom}
        onChange={(e) => setForm({ ...form, deductFrom: e.target.value })}
        className="w-full p-2 border border-border rounded bg-background text-text"
      >
        <option value="monthly">Deduct from monthly budget</option>
        <option value="weekly">Deduct from weekly budget</option>
      </select>
      {editData && (
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full p-2 border border-border rounded bg-background text-text"
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      )}
      <button
        type="submit"
        className="w-full p-2 bg-orange-500 text-white rounded hover:bg-orange-600"
      >
        {editData ? "Update" : "Add"} Forecast
      </button>
    </form>
  );
}

export default ForecastForm;
