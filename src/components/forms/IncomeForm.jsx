import { useState } from "react";
import db from "../../db/database";
import CategorySelect from "./CategorySelect";
import FormInfoText from "./FormInfoText";

function IncomeForm({ categories, onSave, editData, onCategoriesChanged }) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: editData?.title || "",
    description: editData?.description || "",
    amount: editData?.amount || "",
    date: editData?.date || today,
    categoryId: editData?.categoryId || "",
    // Recurring fields
    isRecurring: editData?.isRecurring || false,
    startDate: editData?.startDate || today,
    endType: editData?.endType || "indefinite",
    endDate: editData?.endDate || "",
    dateType: editData?.dateType || "fixed",
    dayOfMonth: editData?.dayOfMonth || 1,
    baseAmount: editData?.baseAmount || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.categoryId) return;

    if (form.isRecurring) {
      if (!form.baseAmount) return;

      const data = {
        title: form.title,
        description: form.description,
        categoryId: Number(form.categoryId),
        isRecurring: true,
        startDate: form.startDate,
        endType: form.endType,
        endDate: form.endType === "end_date" ? form.endDate : null,
        dateType: form.dateType,
        dayOfMonth: form.dateType === "fixed" ? Number(form.dayOfMonth) : null,
        baseAmount: Number(form.baseAmount),
        amount: Number(form.baseAmount), // For backwards compatibility
        updatedAt: new Date().toISOString(),
      };

      if (editData?.id) {
        await db.incomes.update(editData.id, data);
      } else {
        await db.incomes.add({ ...data, createdAt: new Date().toISOString() });
      }
    } else {
      if (!form.amount || !form.date) return;

      const data = {
        title: form.title,
        description: form.description,
        amount: Number(form.amount),
        date: form.date,
        categoryId: Number(form.categoryId),
        isRecurring: false,
        updatedAt: new Date().toISOString(),
      };

      if (editData?.id) {
        await db.incomes.update(editData.id, data);
      } else {
        await db.incomes.add({ ...data, createdAt: new Date().toISOString() });
      }
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
      <FormInfoText>Your info text here for incomes.</FormInfoText>

      <input
        type="text"
        placeholder="Title (e.g. Salary)"
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

      <CategorySelect
        categories={categories}
        type="income"
        value={form.categoryId}
        onChange={(val) => setForm({ ...form, categoryId: val })}
        onCategoryAdded={handleCategoryAdded}
        required
      />

      {/* Recurring checkbox */}
      <label className="flex items-center gap-2 pl-1">
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
        />
        Recurring monthly
      </label>

      {form.isRecurring ? (
        /* Recurring fields */
        <div className="flex flex-col gap-4 p-3 bg-surface/50 rounded-lg">
          <input
            type="number"
            step="0.01"
            placeholder="Base amount (€)"
            value={form.baseAmount}
            onChange={(e) => setForm({ ...form, baseAmount: e.target.value })}
            className="w-full p-2 border border-border rounded bg-background text-text"
            required
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">
                Start date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="w-full p-2 border border-border rounded bg-background text-text"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">
                End type
              </label>
              <select
                value={form.endType}
                onChange={(e) => setForm({ ...form, endType: e.target.value })}
                className="w-full p-2 border border-border rounded bg-background text-text"
              >
                <option value="indefinite">Indefinite</option>
                <option value="end_date">End date</option>
              </select>
            </div>
          </div>

          {form.endType === "end_date" && (
            <div>
              <label className="block text-xs text-text-muted mb-1">
                End date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full p-2 border border-border rounded bg-background text-text"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Monthly date
            </label>
            <select
              value={form.dateType}
              onChange={(e) => setForm({ ...form, dateType: e.target.value })}
              className="w-full p-2 border border-border rounded bg-background text-text"
            >
              <option value="fixed">Fixed day of month</option>
              <option value="unassigned">
                Unassigned (assign manually each month)
              </option>
            </select>
          </div>

          {form.dateType === "fixed" && (
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Day of month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.dayOfMonth}
                onChange={(e) =>
                  setForm({ ...form, dayOfMonth: e.target.value })
                }
                className="w-full p-2 border border-border rounded bg-background text-text"
              />
            </div>
          )}
        </div>
      ) : (
        /* One-time fields */
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
      )}

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
