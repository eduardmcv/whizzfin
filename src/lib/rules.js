// -------------------------------------------------------------------
// Rules engine.
//
// A RULE is an automation ("every month, day 28, ~2000€ salary").
// A TRANSACTION is a fact on the calendar. Rules generate transactions,
// at most one per month (enforced by the unique [ruleId+yearMonth]
// index), and each generated transaction can be edited independently
// without touching the rule.
//
// Rule modes:
//   - "auto":    when the day arrives, the transaction is created
//                automatically with the default values.
//   - "confirm": when the day arrives, it shows as pending and the user
//                confirms (optionally adjusting amount/date).
//   - no dayOfMonth => "manual": pending all month as a preset the user
//                loads whenever it happens ("load this month").
//
// All date handling uses local "YYYY-MM-DD" strings compared
// lexicographically — no Date parsing, no timezone surprises.
// -------------------------------------------------------------------

export const toDateStr = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const formatYearMonth = (year, month) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

export const todayStr = () => {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
};

// Day 31 becomes 28/29 in February, etc.
export const getAdjustedDay = (dayOfMonth, year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(dayOfMonth, daysInMonth);
};

export function isRuleActiveForMonth(rule, yearMonth) {
  if (rule.startDate && yearMonth < rule.startDate.slice(0, 7)) return false;
  if (rule.endDate && yearMonth > rule.endDate.slice(0, 7)) return false;
  return true;
}

export function ruleDateForMonth(rule, year, month) {
  if (!rule.dayOfMonth) return null;
  return toDateStr(year, month, getAdjustedDay(rule.dayOfMonth, year, month));
}

export function isSkipped(rule, yearMonth) {
  return (rule.skippedMonths || []).includes(yearMonth);
}

// Build the transaction a rule produces for a given date/month.
export function transactionFromRule(rule, date, yearMonth, amount) {
  const now = new Date().toISOString();
  return {
    type: rule.type,
    kind: rule.type === "expense" ? "fixed" : null,
    title: rule.title,
    description: rule.description || "",
    amount: Number(amount ?? rule.amount) || 0,
    date,
    yearMonth,
    categoryId: rule.categoryId ?? null,
    ruleId: rule.id,
    deductFrom: rule.type === "expense" ? "monthly" : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// -------------------------------------------------------------------
// Month occurrences: one entry per rule relevant to the viewed month,
// with a status. This is THE single source used by the calendar, the
// dashboard forecast and the Rules panel — no more divergent logic.
//
// Statuses:
//   done      - transaction exists this month
//   skipped   - user skipped this month
//   paused    - rule is deactivated
//   manual    - no fixed day; waiting for the user to load it
//   scheduled - fixed day, still in the future
//   confirm   - fixed day passed, waiting for user confirmation
//   due       - auto rule whose day passed (materializes on next sync)
// -------------------------------------------------------------------
export function getMonthOccurrences(rules, monthTransactions, year, month) {
  const yearMonth = formatYearMonth(year, month);
  const today = todayStr();

  return rules
    .filter((rule) => isRuleActiveForMonth(rule, yearMonth))
    .map((rule) => {
      const transaction =
        monthTransactions.find(
          (t) => t.ruleId === rule.id && t.yearMonth === yearMonth,
        ) || null;
      const date = ruleDateForMonth(rule, year, month);

      let status;
      if (transaction) status = "done";
      else if (isSkipped(rule, yearMonth)) status = "skipped";
      else if (rule.active === false) status = "paused";
      else if (!date) status = "manual";
      else if (date > today) status = "scheduled";
      else status = rule.mode === "confirm" ? "confirm" : "due";

      return {
        rule,
        yearMonth,
        status,
        date: transaction ? transaction.date : date,
        amount: transaction ? transaction.amount : Number(rule.amount) || 0,
        transaction,
      };
    });
}

// Occurrences that haven't happened yet but count toward the
// month-end forecast (and show as ghost events on the calendar).
export const isProjected = (occ) =>
  ["scheduled", "confirm", "due", "manual"].includes(occ.status);

// Occurrences needing user action (badge count).
export const needsAttention = (occ) =>
  occ.status === "confirm" || occ.status === "manual";

// -------------------------------------------------------------------
// Materialize: create transactions for auto rules whose day has passed
// in the given month. Idempotent — the unique index makes duplicates
// impossible even if this runs twice concurrently (React StrictMode).
// Returns true if anything was created.
// -------------------------------------------------------------------
export async function materializeMonth(db, year, month) {
  const yearMonth = formatYearMonth(year, month);
  const today = todayStr();
  let changed = false;

  await db.transaction("rw", db.rules, db.transactions, async () => {
    const rules = await db.rules.toArray();

    for (const rule of rules) {
      if (rule.active === false) continue;
      if (rule.mode !== "auto" || !rule.dayOfMonth) continue;
      if (!isRuleActiveForMonth(rule, yearMonth)) continue;
      if (isSkipped(rule, yearMonth)) continue;

      const date = ruleDateForMonth(rule, year, month);
      if (date > today) continue;

      const existing = await db.transactions
        .where("[ruleId+yearMonth]")
        .equals([rule.id, yearMonth])
        .first();
      if (existing) continue;

      try {
        await db.transactions.add(transactionFromRule(rule, date, yearMonth));
        changed = true;
      } catch (err) {
        // ConstraintError => already materialized by a concurrent run
        if (err?.name !== "ConstraintError") throw err;
      }
    }
  });

  return changed;
}

// Confirm a pending occurrence (confirm-mode or manual preset).
export async function confirmOccurrence(db, rule, yearMonth, { date, amount }) {
  try {
    await db.transactions.add(
      transactionFromRule(rule, date, yearMonth, amount),
    );
  } catch (err) {
    if (err?.name !== "ConstraintError") throw err;
  }
}

// Skip this month. If a transaction was already generated, remove it.
export async function skipMonth(db, rule, yearMonth) {
  await db.transaction("rw", db.rules, db.transactions, async () => {
    const existing = await db.transactions
      .where("[ruleId+yearMonth]")
      .equals([rule.id, yearMonth])
      .first();
    if (existing) await db.transactions.delete(existing.id);

    const skippedMonths = rule.skippedMonths || [];
    if (!skippedMonths.includes(yearMonth)) {
      await db.rules.update(rule.id, {
        skippedMonths: [...skippedMonths, yearMonth],
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

export async function unskipMonth(db, rule, yearMonth) {
  await db.rules.update(rule.id, {
    skippedMonths: (rule.skippedMonths || []).filter((m) => m !== yearMonth),
    updatedAt: new Date().toISOString(),
  });
}
