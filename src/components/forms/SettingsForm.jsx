import { useState } from "react";
import db from "../../db/database";

function SettingsForm({ settings, onSave }) {
  const [form, setForm] = useState({
    weeklyBudget: settings?.weeklyBudget || 0,
    weekStartDay: settings?.weekStartDay || 1,
    monthlySavingsTarget: settings?.monthlySavingsTarget || 0,
    overflowStrategy: settings?.overflowStrategy || "next_week",
    surplusStrategy: settings?.surplusStrategy || "savings",
  });

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    await db.settings.put({ id: 1, ...form });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="block text-sm text-text-muted mb-1">
          Weekly budget (€)
        </label>
        <input
          type="number"
          value={form.weeklyBudget}
          onChange={(e) =>
            setForm({ ...form, weeklyBudget: Number(e.target.value) })
          }
          className="w-full p-2.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm text-text-muted mb-1">
          Week starts on
        </label>
        <select
          value={form.weekStartDay}
          onChange={(e) =>
            setForm({ ...form, weekStartDay: Number(e.target.value) })
          }
          className="w-full p-2.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors"
        >
          {dayNames.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-text-muted mb-1">
          Monthly savings target (€)
        </label>
        <input
          type="number"
          value={form.monthlySavingsTarget}
          onChange={(e) =>
            setForm({ ...form, monthlySavingsTarget: Number(e.target.value) })
          }
          className="w-full p-2.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm text-text-muted mb-1">
          When you exceed weekly budget
        </label>
        <select
          value={form.overflowStrategy}
          onChange={(e) =>
            setForm({ ...form, overflowStrategy: e.target.value })
          }
          className="w-full p-2.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors"
        >
          <option value="next_week">Deduct from next week</option>
          <option value="proportional">Deduct proportionally</option>
          <option value="next_month">Deduct from next month</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-text-muted mb-1">
          When you have surplus
        </label>
        <select
          value={form.surplusStrategy}
          onChange={(e) =>
            setForm({ ...form, surplusStrategy: e.target.value })
          }
          className="w-full p-2.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors"
        >
          <option value="savings">Add to savings</option>
          <option value="next_week">Add to next week</option>
          <option value="distribute">Distribute across weeks</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full py-3 bg-gray-8 text-white rounded-lg font-medium hover:bg-gray-7 mt-2 cursor-pointer transition-colors"
      >
        Save Settings
      </button>
    </form>
  );
}

export default SettingsForm;
