import Dexie from "dexie";

// Create the database
const db = new Dexie("whizzfin");

// Define tables and their columns (schema)
db.version(4).stores({
  settings: "++id",
  categories: "++id, name",
  freeExpenses: "++id, date, categoryId",
  fixedExpenses: "++id, dayOfMonth, categoryId",
  forecasts: "++id, date, categoryId",
  incomes: "++id, date, dayOfMonth",
  savings: "++id, date",
  weeklyBudgets: "++id, weekStart", // Custom weekly budgets by week start date
});

export default db;
