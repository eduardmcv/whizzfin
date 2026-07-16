import Dexie from "dexie";

const db = new Dexie("whizzfin");

// Version 4 - original schema
db.version(4).stores({
  settings: "++id",
  categories: "++id, name",
  freeExpenses: "++id, date, categoryId",
  fixedExpenses: "++id, dayOfMonth, categoryId",
  forecasts: "++id, date, categoryId",
  incomes: "++id, date, dayOfMonth",
  savings: "++id, date",
  weeklyBudgets: "++id, weekStart",
});

// Version 5 - category types
db.version(5)
  .stores({
    settings: "++id",
    categories: "++id, name, type",
    freeExpenses: "++id, date, categoryId",
    fixedExpenses: "++id, dayOfMonth, categoryId",
    forecasts: "++id, date, categoryId",
    incomes: "++id, date, dayOfMonth, categoryId",
    savings: "++id, date, categoryId",
    weeklyBudgets: "++id, weekStart",
    recurringInstances: "++id, parentId, parentType, yearMonth",
  })
  .upgrade(async (tx) => {
    await tx
      .table("categories")
      .toCollection()
      .modify((category) => {
        if (!category.type) {
          category.type = "expense";
        }
      });

    await tx.table("categories").bulkAdd([
      { name: "Freelance", type: "income" },
      { name: "Personal transfers", type: "income" },
      { name: "Refunds", type: "income" },
      { name: "Salary", type: "income" },
      { name: "Side jobs", type: "income" },
    ]);

    await tx.table("categories").bulkAdd([
      { name: "Emergency fund", type: "savings" },
      { name: "High-yield account", type: "savings" },
      { name: "Investment", type: "savings" },
      { name: "Savings account", type: "savings" },
    ]);
  });

// Version 6 - recurring items with new fields
db.version(6)
  .stores({
    settings: "++id",
    categories: "++id, name, type",
    freeExpenses: "++id, date, categoryId",
    fixedExpenses: "++id, dayOfMonth, categoryId, isRecurring",
    forecasts: "++id, date, categoryId",
    incomes: "++id, date, dayOfMonth, categoryId, isRecurring",
    savings: "++id, date, categoryId, isRecurring",
    weeklyBudgets: "++id, weekStart",
    recurringInstances: "++id, parentId, parentType, yearMonth, status",
  })
  .upgrade(async (tx) => {
    // Migrate existing fixedExpenses - they were all recurring by nature
    await tx
      .table("fixedExpenses")
      .toCollection()
      .modify((item) => {
        item.isRecurring = true;
        item.startDate =
          item.createdAt?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        item.endType = "indefinite";
        item.dateType = "fixed";
        item.baseAmount = item.amount;
      });

    // Migrate existing recurring incomes
    await tx
      .table("incomes")
      .toCollection()
      .modify((item) => {
        if (item.isRecurring) {
          item.startDate =
            item.createdAt?.split("T")[0] ||
            new Date().toISOString().split("T")[0];
          item.endType = "indefinite";
          item.dateType = "fixed";
          item.baseAmount = item.amount;
        }
      });
  });

// -------------------------------------------------------------------
// Version 7 - unified model: `transactions` (facts) + `rules` (automations)
// Old tables are migrated here and dropped in version 8.
//
// transactions: { type: income|expense|savings, kind (expense only:
//   casual|fixed|forecast), title, description, amount, date, yearMonth,
//   categoryId, ruleId?, deductFrom (expense only: weekly|monthly) }
//
// rules: { type, title, description, categoryId, amount, dayOfMonth?,
//   mode: auto|confirm  (no dayOfMonth => manual "load this month"),
//   active, startDate, endDate?, skippedMonths: ["YYYY-MM"] }
//
// &[ruleId+yearMonth] is a UNIQUE index: a rule can only materialize
// once per month, which kills duplicate generation at the DB level.
// -------------------------------------------------------------------
db.version(7)
  .stores({
    settings: "++id",
    categories: "++id, name, type",
    freeExpenses: "++id, date, categoryId",
    fixedExpenses: "++id, dayOfMonth, categoryId, isRecurring",
    forecasts: "++id, date, categoryId",
    incomes: "++id, date, dayOfMonth, categoryId, isRecurring",
    savings: "++id, date, categoryId, isRecurring",
    weeklyBudgets: "++id, weekStart",
    recurringInstances: "++id, parentId, parentType, yearMonth, status",
    transactions: "++id, date, yearMonth, type, categoryId, ruleId, &[ruleId+yearMonth]",
    rules: "++id, type",
  })
  .upgrade(async (tx) => {
    const now = new Date().toISOString();
    const ymOf = (dateStr) => (dateStr ? dateStr.slice(0, 7) : null);

    const [free, fixed, forecasts, incomes, savings, instances] =
      await Promise.all([
        tx.table("freeExpenses").toArray(),
        tx.table("fixedExpenses").toArray(),
        tx.table("forecasts").toArray(),
        tx.table("incomes").toArray(),
        tx.table("savings").toArray(),
        tx.table("recurringInstances").toArray(),
      ]);

    const newTransactions = [];
    const ruleIdByParent = {}; // "parentType:oldId" -> new rule id
    const parentByKey = {};

    // --- One-time items become transactions -------------------------
    free.forEach((e) => {
      if (!e.date) return;
      newTransactions.push({
        type: "expense",
        kind: "casual",
        title: e.title || "Expense",
        description: e.description || "",
        amount: Number(e.amount) || 0,
        date: e.date,
        yearMonth: ymOf(e.date),
        categoryId: e.categoryId ?? null,
        deductFrom: "weekly",
        createdAt: e.createdAt || now,
        updatedAt: now,
      });
    });

    forecasts.forEach((f) => {
      if (!f.date) return;
      newTransactions.push({
        type: "expense",
        kind: "forecast",
        title: f.title || "Forecast",
        description: f.description || "",
        amount: Number(f.amount) || 0,
        date: f.date,
        yearMonth: ymOf(f.date),
        categoryId: f.categoryId ?? null,
        deductFrom: f.deductFrom === "weekly" ? "weekly" : "monthly",
        createdAt: f.createdAt || now,
        updatedAt: now,
      });
    });

    // --- Recurring templates become rules ---------------------------
    const buildRule = (item, type) => ({
      type,
      title: item.title || type,
      description: item.description || "",
      categoryId: item.categoryId ?? null,
      amount: Number(item.baseAmount ?? item.amount) || 0,
      dayOfMonth:
        item.dateType === "fixed" && item.dayOfMonth
          ? Number(item.dayOfMonth)
          : null,
      mode: "auto",
      active: item.active !== false,
      startDate:
        item.startDate || item.createdAt?.split("T")[0] || now.split("T")[0],
      endDate: item.endType === "end_date" ? item.endDate || null : null,
      skippedMonths: [],
      createdAt: item.createdAt || now,
      updatedAt: now,
    });

    const migrateGroup = async (items, parentType, txType, oneTimeExtra) => {
      for (const item of items) {
        if (item.isRecurring) {
          const rule = buildRule(item, txType);
          const newId = await tx.table("rules").add(rule);
          ruleIdByParent[`${parentType}:${item.id}`] = newId;
          parentByKey[`${parentType}:${item.id}`] = item;
        } else if (item.date) {
          newTransactions.push({
            type: txType,
            kind: txType === "expense" ? "fixed" : null,
            title: item.title || txType,
            description: item.description || "",
            amount: Number(item.amount) || 0,
            date: item.date,
            yearMonth: ymOf(item.date),
            categoryId: item.categoryId ?? null,
            ...(oneTimeExtra || {}),
            createdAt: item.createdAt || now,
            updatedAt: now,
          });
        }
      }
    };

    await migrateGroup(fixed, "fixedExpense", "expense", {
      deductFrom: "monthly",
    });
    await migrateGroup(incomes, "income", "income");
    await migrateGroup(savings, "savings", "savings");

    // --- Instances: assigned -> transactions, skipped -> rule skips --
    const skipsByRule = {};
    const seenRuleMonth = new Set();

    instances.forEach((inst) => {
      const key = `${inst.parentType}:${inst.parentId}`;
      const ruleId = ruleIdByParent[key];
      const parent = parentByKey[key];
      if (!ruleId || !parent) return;

      const dedupeKey = `${ruleId}:${inst.yearMonth}`;
      if (seenRuleMonth.has(dedupeKey)) return; // old duplicate bug
      seenRuleMonth.add(dedupeKey);

      if (inst.status === "assigned" && inst.assignedDate) {
        const txType =
          inst.parentType === "fixedExpense"
            ? "expense"
            : inst.parentType === "income"
              ? "income"
              : "savings";
        newTransactions.push({
          type: txType,
          kind: txType === "expense" ? "fixed" : null,
          title: parent.title || txType,
          description: parent.description || "",
          amount:
            Number(inst.actualAmount ?? parent.baseAmount ?? parent.amount) ||
            0,
          date: inst.assignedDate,
          yearMonth: inst.yearMonth,
          categoryId: parent.categoryId ?? null,
          ruleId,
          deductFrom: txType === "expense" ? "monthly" : undefined,
          createdAt: inst.createdAt || now,
          updatedAt: now,
        });
      } else if (inst.status === "skipped") {
        if (!skipsByRule[ruleId]) skipsByRule[ruleId] = [];
        skipsByRule[ruleId].push(inst.yearMonth);
      }
    });

    for (const [ruleId, months] of Object.entries(skipsByRule)) {
      await tx.table("rules").update(Number(ruleId), {
        skippedMonths: months,
      });
    }

    if (newTransactions.length > 0) {
      await tx.table("transactions").bulkAdd(newTransactions);
    }

    // --- Default pinned categories (max 3 per type) ------------------
    const cats = await tx.table("categories").toArray();
    for (const type of ["expense", "income", "savings"]) {
      const ofType = cats
        .filter((c) => c.type === type)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (ofType.some((c) => c.pinned)) continue;
      for (const c of ofType.slice(0, 3)) {
        await tx.table("categories").update(c.id, { pinned: true });
      }
    }

    // --- Seed settings row if missing --------------------------------
    const existingSettings = await tx.table("settings").get(1);
    if (!existingSettings) {
      await tx.table("settings").add({
        id: 1,
        weeklyBudget: 0,
        weekStartDay: 1,
        monthlySavingsTarget: 0,
        overflowStrategy: "next_week",
        surplusStrategy: "savings",
      });
    }
  });

// Version 8 - drop the legacy tables
db.version(8).stores({
  freeExpenses: null,
  fixedExpenses: null,
  forecasts: null,
  incomes: null,
  savings: null,
  recurringInstances: null,
});

export default db;
