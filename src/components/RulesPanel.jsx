import { useState } from "react";
import Modal from "./Modal";
import db from "../db/database";
import {
  getMonthOccurrences,
  isRuleActiveForMonth,
  formatYearMonth,
  confirmOccurrence,
  skipMonth,
  unskipMonth,
  todayStr,
} from "../lib/rules";

const STATUS_META = {
  done: { label: "Done", cls: "bg-emerald-900/40 text-emerald-300" },
  scheduled: { label: "Scheduled", cls: "bg-blue-900/40 text-blue-300" },
  due: { label: "Applying…", cls: "bg-blue-900/40 text-blue-300" },
  confirm: { label: "Confirm", cls: "bg-orange-700/40 text-orange-300" },
  manual: { label: "Pending", cls: "bg-orange-700/40 text-orange-300" },
  skipped: { label: "Skipped", cls: "bg-gray-4 text-text-muted" },
  paused: { label: "Paused", cls: "bg-gray-4 text-text-muted" },
};

const parseAmount = (v) => Number(String(v).trim().replace(",", "."));
const AMOUNT_RE = /^[0-9]*[.,]?[0-9]{0,2}$/;

const fieldClass =
  "w-full h-11 px-3.5 border border-border rounded-lg bg-background text-text focus:outline-none focus:border-blue-7 transition-colors";

function RuleRow({ occ, rule, categories, yearMonth, onUpdate, onEditRule }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmDate, setConfirmDate] = useState(occ?.date || todayStr());
  const [confirmAmount, setConfirmAmount] = useState(String(rule.amount));

  const status = occ ? occ.status : "inactive";
  const meta = STATUS_META[status];
  const category = categories.find((c) => c.id === rule.categoryId);
  const canSkip = ["scheduled", "due", "confirm", "manual", "done"].includes(
    status,
  );
  const needsAction = status === "confirm" || status === "manual";

  const handleConfirm = async () => {
    const amount = parseAmount(confirmAmount);
    if (!amount || amount <= 0 || !confirmDate) return;
    await confirmOccurrence(db, rule, yearMonth, {
      date: confirmDate,
      amount,
    });
    setConfirming(false);
    onUpdate();
  };

  const handleSkip = async () => {
    if (
      status === "done" &&
      !confirm("Skip this month? The generated entry will be removed.")
    )
      return;
    await skipMonth(db, rule, yearMonth);
    onUpdate();
  };

  const handleToggleActive = async () => {
    await db.rules.update(rule.id, {
      active: rule.active === false,
      updatedAt: new Date().toISOString(),
    });
    onUpdate();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Delete rule "${rule.title}"? Entries already on the calendar are kept.`,
      )
    )
      return;
    await db.rules.delete(rule.id);
    onUpdate();
  };

  const btn =
    "px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors";

  return (
    <div
      className={`p-5 rounded-2xl bg-gray-1 flex flex-col gap-4 ${
        rule.active === false ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text truncate">
            {rule.title}
          </div>
          <div className="text-sm text-text-muted mt-0.5">
            {category?.name || "No category"} ·{" "}
            {rule.dayOfMonth
              ? `Day ${rule.dayOfMonth} · ${rule.mode === "auto" ? "auto" : "confirm"}`
              : "No fixed day"}
          </div>
        </div>
        <div className="nr-500 text-base text-text whitespace-nowrap">
          {Number(occ?.amount ?? rule.amount).toFixed(2)}€
        </div>
        {meta && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${meta.cls}`}
          >
            {meta.label}
            {status === "done" && occ?.date ? ` · ${occ.date.slice(8)}` : ""}
          </span>
        )}
        {status === "inactive" && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-4 text-text-muted whitespace-nowrap">
            Not this month
          </span>
        )}
      </div>

      {/* Inline confirm / load box */}
      {confirming && (
        <div className="flex gap-3 items-end bg-gray-2 p-3.5 rounded-xl animate-grow-in">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-2">
              Date
            </label>
            <input
              type="date"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
              className={`${fieldClass} nr-400`}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted mb-2">
              Amount (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={confirmAmount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || AMOUNT_RE.test(v)) setConfirmAmount(v);
              }}
              className={`${fieldClass} nr-400`}
            />
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className={`${btn} h-11 bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`${btn} h-11 border border-border text-text-muted hover:bg-gray-3`}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {needsAction && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {status === "manual" ? "Load this month" : "Confirm"}
          </button>
        )}
        {canSkip && (
          <button
            type="button"
            onClick={handleSkip}
            className={`${btn} border border-border text-text-muted hover:bg-gray-3`}
          >
            Skip this month
          </button>
        )}
        {status === "skipped" && (
          <button
            type="button"
            onClick={async () => {
              await unskipMonth(db, rule, yearMonth);
              onUpdate();
            }}
            className={`${btn} border border-border text-text-muted hover:bg-gray-3`}
          >
            Undo skip
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={handleToggleActive}
          className={`${btn} border border-border text-text-muted hover:bg-gray-3`}
        >
          {rule.active === false ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={() => onEditRule(rule)}
          className={`${btn} border border-border text-text-muted hover:bg-gray-3`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={`${btn} border border-red-900/60 text-red-400 hover:bg-red-950/40`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function RulesPanel({
  isOpen,
  onClose,
  rules,
  transactions,
  categories,
  year,
  month,
  onUpdate,
  onEditRule,
}) {
  const yearMonth = formatYearMonth(year, month);
  const monthTransactions = transactions.filter(
    (t) => t.yearMonth === yearMonth,
  );
  const occurrences = getMonthOccurrences(
    rules,
    monthTransactions,
    year,
    month,
  );
  const occByRule = Object.fromEntries(occurrences.map((o) => [o.rule.id, o]));

  const sections = [
    { type: "income", label: "Income" },
    { type: "expense", label: "Fixed expenses" },
    { type: "savings", label: "Savings" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rules · ${yearMonth}`}
      size="lg"
    >
      <div className="flex flex-col gap-7 w-full">
        {rules.length === 0 && (
          <p className="text-text-muted text-center py-8">
            No rules yet. Create one by choosing "Fixed" or "Recurring" when
            adding an entry.
          </p>
        )}
        {sections.map(({ type, label }) => {
          const ofType = rules.filter((r) => r.type === type);
          if (ofType.length === 0) return null;
          return (
            <div key={type}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                {label}
              </h4>
              <div className="flex flex-col gap-3">
                {ofType.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    occ={
                      isRuleActiveForMonth(rule, yearMonth)
                        ? occByRule[rule.id]
                        : null
                    }
                    categories={categories}
                    yearMonth={yearMonth}
                    onUpdate={onUpdate}
                    onEditRule={onEditRule}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export default RulesPanel;
