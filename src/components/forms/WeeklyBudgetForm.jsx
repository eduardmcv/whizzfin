import { useState } from "react";
import db from "../../db/database";

function WeeklyBudgetForm({ weekStart, currentBudget, defaultBudget, onSave }) {
  const [amount, setAmount] = useState(currentBudget ?? defaultBudget);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const existing = await db.weeklyBudgets
      .where("weekStart")
      .equals(weekStart)
      .first();

    if (amount === defaultBudget) {
      if (existing) await db.weeklyBudgets.delete(existing.id);
    } else {
      if (existing) {
        await db.weeklyBudgets.update(existing.id, { amount });
      } else {
        await db.weeklyBudgets.add({ weekStart, amount });
      }
    }

    onSave();
  };

  const handleReset = async () => {
    setAmount(defaultBudget);
    const existing = await db.weeklyBudgets
      .where("weekStart")
      .equals(weekStart)
      .first();
    if (existing) {
      await db.weeklyBudgets.delete(existing.id);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-text-muted mb-1">
          Week starting {weekStart}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full p-2.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors"
          min="0"
          step="1"
        />
        <p className="text-xs text-text-muted mt-1">
          Default budget: {defaultBudget}€
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 py-2.5 bg-gray-8 text-white rounded-lg font-medium hover:bg-gray-7 cursor-pointer transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2.5 border border-border rounded-lg hover:bg-gray-3 text-text-muted cursor-pointer transition-colors"
        >
          Reset to default
        </button>
      </div>
    </form>
  );
}

export default WeeklyBudgetForm;
