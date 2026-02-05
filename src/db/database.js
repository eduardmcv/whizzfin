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

    // Savings were not recurring before, so no migration needed
  });

export default db;
