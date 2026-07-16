import { useState } from "react";
import db from "../../db/database";
import CategoryPicker from "./CategoryPicker";
import { todayStr, toDateStr } from "../../lib/rules";

// -------------------------------------------------------------------
// Unified form for the three transaction types.
//
//   expense:          [ Casual | Fixed | Forecast ]
//   income / savings: [ One-time | Recurring ]
//
// "Fixed" / "Recurring" creates a RULE (automation) instead of a
// transaction. Editing an existing transaction or rule locks the
// selector to its nature.
// -------------------------------------------------------------------

const TYPE_CONFIG = {
  income: {
    label: "Income",
    accent: "bg-blue-600 hover:bg-blue-700",
    kinds: [
      { id: "oneoff", label: "One-time" },
      { id: "rule", label: "Recurring" },
    ],
    defaultKind: "oneoff",
    titleHint: "e.g. Salary",
  },
  expense: {
    label: "Expense",
    accent: "bg-red-500 hover:bg-red-600",
    kinds: [
      { id: "casual", label: "Casual" },
      { id: "rule", label: "Fixed" },
      { id: "forecast", label: "Forecast" },
    ],
    defaultKind: "casual",
    titleHint: "e.g. Netflix",
  },
  savings: {
    label: "Savings",
    accent: "bg-emerald-600 hover:bg-emerald-700",
    kinds: [
      { id: "oneoff", label: "One-time" },
      { id: "rule", label: "Recurring" },
    ],
    defaultKind: "oneoff",
    titleHint: "e.g. Emergency fund",
  },
};

// "1.234,56" / "1234.56" / "1234,56" → number. Comma or dot, both fine.
const parseAmount = (v) => Number(String(v).trim().replace(",", "."));
const AMOUNT_RE = /^[0-9]*[.,]?[0-9]{0,2}$/;

const inputClass =
  "w-full h-11 px-3.5 border border-border rounded-lg bg-background text-text placeholder:text-gray-9 focus:outline-none focus:border-blue-7 transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-medium text-text-muted mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function AmountInput({ value, onChange, placeholder = "0.00" }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || AMOUNT_RE.test(v)) onChange(v);
      }}
      className={`${inputClass} nr-400`}
    />
  );
}

function TransactionForm({
  type,
  categories,
  defaultDay,
  year,
  month,
  editData, // existing transaction
  editRule, // existing rule
  onSave,
  onCategoriesChanged,
}) {
  const config = TYPE_CONFIG[type];
  const today = todayStr();
  const defaultDate =
    editData?.date ||
    (defaultDay != null ? toDateStr(year, month, defaultDay) : today);

  const initialKind = editRule
    ? "rule"
    : editData
      ? editData.kind === "forecast"
        ? "forecast"
        : editData.kind === "fixed"
          ? "fixedTx"
          : type === "expense"
            ? "casual"
            : "oneoff"
      : config.defaultKind;

  const [kind, setKind] = useState(initialKind);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: editRule?.title || editData?.title || "",
    description: editRule?.description || editData?.description || "",
    categoryId: editRule?.categoryId ?? editData?.categoryId ?? "",
    // transaction fields
    amount: editData?.amount ?? "",
    date: defaultDate,
    deductFrom: editData?.deductFrom || "monthly",
    // rule fields
    ruleAmount: editRule?.amount ?? "",
    hasFixedDay: editRule ? editRule.dayOfMonth != null : true,
    dayOfMonth: editRule?.dayOfMonth ?? 1,
    mode: editRule?.mode || "auto",
    startDate: editRule?.startDate || today,
    endType: editRule?.endDate ? "end_date" : "indefinite",
    endDate: editRule?.endDate || "",
  });

  const isRule = kind === "rule";
  const showSelector = !editData && !editRule;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const dayWillAdjust =
    isRule && form.hasFixedDay && Number(form.dayOfMonth) >= 29;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const now = new Date().toISOString();

    if (!form.title.trim()) return setError("Title is required.");
    if (!form.categoryId) return setError("Pick a category.");

    if (isRule) {
      const amount = parseAmount(form.ruleAmount);
      if (!amount || amount <= 0)
        return setError("Default amount must be greater than 0.");
      if (
        form.endType === "end_date" &&
        (!form.endDate || form.endDate <= form.startDate)
      )
        return setError("End date must be after the start date.");

      const data = {
        type,
        title: form.title.trim(),
        description: form.description,
        categoryId: Number(form.categoryId),
        amount,
        dayOfMonth: form.hasFixedDay ? Number(form.dayOfMonth) : null,
        mode: form.hasFixedDay ? form.mode : "confirm",
        startDate: form.startDate,
        endDate: form.endType === "end_date" ? form.endDate : null,
        updatedAt: now,
      };

      if (editRule?.id) {
        await db.rules.update(editRule.id, data);
      } else {
        await db.rules.add({
          ...data,
          active: true,
          skippedMonths: [],
          createdAt: now,
        });
      }
    } else {
      const amount = parseAmount(form.amount);
      if (!amount || amount <= 0)
        return setError("Amount must be greater than 0.");
      if (!form.date) return setError("Pick a date.");

      const txKind =
        type !== "expense"
          ? null
          : kind === "forecast"
            ? "forecast"
            : kind === "fixedTx"
              ? "fixed"
              : "casual";

      const data = {
        type,
        kind: txKind,
        title: form.title.trim(),
        description: form.description,
        amount,
        date: form.date,
        categoryId: Number(form.categoryId),
        updatedAt: now,
      };

      if (type === "expense") {
        data.deductFrom =
          txKind === "casual"
            ? "weekly"
            : txKind === "forecast"
              ? form.deductFrom
              : "monthly";
      }

      if (editData?.id) {
        // Rule-generated transactions keep their occurrence month so the
        // engine never regenerates them; normal ones follow their date.
        data.yearMonth = editData.ruleId
          ? editData.yearMonth
          : form.date.slice(0, 7);
        await db.transactions.update(editData.id, data);
      } else {
        await db.transactions.add({
          ...data,
          yearMonth: form.date.slice(0, 7),
          createdAt: now,
        });
      }
    }

    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Kind selector */}
      {showSelector && config.kinds.length > 1 && (
        <div className="flex gap-1.5 bg-gray-1 p-1.5 rounded-xl">
          {config.kinds.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                kind === k.id
                  ? "bg-blue-9 text-white shadow-lg shadow-blue-9/25"
                  : "text-text-muted hover:text-text hover:bg-gray-3"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      {editData?.ruleId && (
        <p className="text-xs text-text-muted bg-gray-1 p-3 rounded-lg">
          Generated by a rule — editing only affects this month's entry.
        </p>
      )}

      <Field label="Title">
        <input
          type="text"
          placeholder={config.titleHint}
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          placeholder="Optional notes…"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={2}
          className="w-full min-h-[88px] px-3.5 py-2.5 border border-border rounded-lg bg-background text-text placeholder:text-gray-9 focus:outline-none focus:border-blue-7 transition-colors resize-none"
        />
      </Field>

      <CategoryPicker
        categories={categories}
        type={type}
        value={form.categoryId}
        onChange={(val) => set({ categoryId: val })}
        onCategoriesChanged={onCategoriesChanged}
      />

      {isRule ? (
        /* Rule block: bleeds out of the field column (-mx) so its inner
           fields keep the exact same width as the fields above. Darker
           background, no border, grows in. */
        <div
          key="rule-block"
          className="-mx-4 px-4 py-5 rounded-2xl bg-gray-1 flex flex-col gap-6 animate-grow-in"
        >
          <Field label="Default amount (€) — adjustable each month">
            <AmountInput
              value={form.ruleAmount}
              onChange={(v) => set({ ruleAmount: v })}
            />
          </Field>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.hasFixedDay}
              onChange={(e) => set({ hasFixedDay: e.target.checked })}
            />
            Fixed day of the month
          </label>

          {form.hasFixedDay ? (
            <div className="flex gap-4 animate-grow-in">
              <Field label="Day of month">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dayOfMonth}
                  onChange={(e) => set({ dayOfMonth: e.target.value })}
                  className={`${inputClass} nr-400`}
                />
                {dayWillAdjust && (
                  <p className="text-xs text-orange-300 mt-2">
                    In shorter months this falls on the last day.
                  </p>
                )}
              </Field>
              <Field label="When the day arrives">
                <select
                  value={form.mode}
                  onChange={(e) => set({ mode: e.target.value })}
                  className={inputClass}
                >
                  <option value="auto">Apply automatically</option>
                  <option value="confirm">Ask me to confirm</option>
                </select>
              </Field>
            </div>
          ) : (
            <p className="text-sm text-text-muted animate-grow-in">
              No fixed day: each month it stays pending until you load it
              from the Rules panel.
            </p>
          )}

          <div className="flex gap-4">
            <Field label="Start date">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                className={`${inputClass} nr-400`}
              />
            </Field>
            <Field label="Ends">
              <select
                value={form.endType}
                onChange={(e) => set({ endType: e.target.value })}
                className={inputClass}
              >
                <option value="indefinite">Never</option>
                <option value="end_date">On a date</option>
              </select>
            </Field>
          </div>

          {form.endType === "end_date" && (
            <div className="animate-grow-in">
              <Field label="End date">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set({ endDate: e.target.value })}
                  className={`${inputClass} nr-400`}
                />
              </Field>
            </div>
          )}
        </div>
      ) : (
        <div key="tx-block" className="flex flex-col gap-6 animate-grow-in">
          <div className="flex gap-4">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
                className={`${inputClass} nr-400`}
              />
            </Field>
            <Field label="Amount (€)">
              <AmountInput
                value={form.amount}
                onChange={(v) => set({ amount: v })}
              />
            </Field>
          </div>

          {kind === "forecast" && (
            <div className="animate-grow-in">
              <Field label="Deduct from">
                <select
                  value={form.deductFrom}
                  onChange={(e) => set({ deductFrom: e.target.value })}
                  className={inputClass}
                >
                  <option value="monthly">Monthly balance</option>
                  <option value="weekly">Weekly budget</option>
                </select>
              </Field>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400 -my-1">{error}</p>}

      <button
        type="submit"
        className={`w-full py-3.5 text-white rounded-xl font-semibold text-[15px] cursor-pointer transition-colors ${config.accent}`}
      >
        {editData || editRule ? "Update" : "Add"}{" "}
        {isRule ? `recurring ${config.label.toLowerCase()}` : config.label}
      </button>
    </form>
  );
}

export default TransactionForm;
