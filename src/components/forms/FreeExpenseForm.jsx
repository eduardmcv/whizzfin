import { useState } from "react";
import db from "../../db/database";
import CategorySelect from "./CategorySelect";
import FormInfoText from "./FormInfoText";

function FreeExpenseForm({
  categories,
  defaultDay,
  year,
  month,
  onSave,
  editData,
  onCategoriesChanged,
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
    categoryId: editData?.categoryId || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title || !form.categoryId) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.freeExpenses.update(editData.id, data);
    } else {
      await db.freeExpenses.add({
        ...data,
        createdAt: new Date().toISOString(),
      });
    }
    onSave();
  };

  const handleCategoryAdded = async (newId) => {
    if (onCategoriesChanged) {
      await onCategoriesChanged();
    }
    setForm({ ...form, categoryId: newId });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormInfoText>Your info text here for free expenses.</FormInfoText>

      <input
        type="text"
        placeholder="Title"
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
      <CategorySelect
        categories={categories}
        type="expense"
        value={form.categoryId}
        onChange={(val) => setForm({ ...form, categoryId: val })}
        onCategoryAdded={handleCategoryAdded}
        required
      />
      <button
        type="submit"
        className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        {editData ? "Update" : "Add"} Expense
      </button>
    </form>
  );
}

export default FreeExpenseForm;
