import Dexie from "dexie";

// Create the database
const db = new Dexie("whizzfin");

// Define tables and their columns (schema)
db.version(1).stores({
  settings: "++id",
  categories: "++id, name",
  freeExpenses: "++id, date, categoryId",
  fixedExpenses: "++id, month, categoryId",
  forecasts: "++id, date, categoryId",
  incomes: "++id, month",
});

export default db;
