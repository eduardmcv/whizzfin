// Get the actual day for a given month, adjusting for months with fewer days
// e.g., day 31 in February becomes 28/29
export function getAdjustedDay(dayOfMonth, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(dayOfMonth, daysInMonth);
}

// Check if a recurring item is active for a given month
export function isRecurringActiveForMonth(item, year, month) {
  if (!item.isRecurring) return false;

  const startDate = new Date(item.startDate);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  // Check if month is before start date
  if (year < startYear || (year === startYear && month < startMonth)) {
    return false;
  }

  // Check end date if applicable
  if (item.endType === "end_date" && item.endDate) {
    const endDate = new Date(item.endDate);
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    if (year > endYear || (year === endYear && month > endMonth)) {
      return false;
    }
  }

  return true;
}

// Get or create instance for a recurring item in a specific month
export function getInstanceForMonth(
  instances,
  parentId,
  parentType,
  yearMonth,
) {
  return instances.find(
    (i) =>
      i.parentId === parentId &&
      i.parentType === parentType &&
      i.yearMonth === yearMonth,
  );
}

// Format year-month string
export function formatYearMonth(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// Get all recurring items that should appear this month with their instance status
export function getRecurringItemsForMonth(
  fixedExpenses,
  incomes,
  savings,
  instances,
  year,
  month,
) {
  const yearMonth = formatYearMonth(year, month);
  const items = [];

  // Fixed expenses
  fixedExpenses
    .filter(
      (item) =>
        item.isRecurring && isRecurringActiveForMonth(item, year, month),
    )
    .forEach((item) => {
      const instance = getInstanceForMonth(
        instances,
        item.id,
        "fixedExpense",
        yearMonth,
      );

      // If dateType is "fixed", it's automatically assigned (unless explicitly skipped)
      let status = instance?.status || "pending";
      let assignedDate = instance?.assignedDate || null;

      if (item.dateType === "fixed" && !instance) {
        // Auto-assigned by day of month
        status = "assigned";
        const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
        assignedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      } else if (
        item.dateType === "fixed" &&
        instance &&
        instance.status === "pending"
      ) {
        // Has instance but still pending - treat as assigned since it has fixed day
        status = "assigned";
        const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
        assignedDate =
          instance.assignedDate ||
          `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      }

      items.push({
        ...item,
        parentType: "fixedExpense",
        instance: instance || null,
        status,
        assignedDate,
        actualAmount: instance?.actualAmount ?? item.baseAmount ?? item.amount,
      });
    });

  // Incomes
  incomes
    .filter(
      (item) =>
        item.isRecurring && isRecurringActiveForMonth(item, year, month),
    )
    .forEach((item) => {
      const instance = getInstanceForMonth(
        instances,
        item.id,
        "income",
        yearMonth,
      );

      let status = instance?.status || "pending";
      let assignedDate = instance?.assignedDate || null;

      if (item.dateType === "fixed" && !instance) {
        status = "assigned";
        const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
        assignedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      } else if (
        item.dateType === "fixed" &&
        instance &&
        instance.status === "pending"
      ) {
        status = "assigned";
        const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
        assignedDate =
          instance.assignedDate ||
          `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      }

      items.push({
        ...item,
        parentType: "income",
        instance: instance || null,
        status,
        assignedDate,
        actualAmount: instance?.actualAmount ?? item.baseAmount ?? item.amount,
      });
    });

  // Savings
  savings
    .filter(
      (item) =>
        item.isRecurring && isRecurringActiveForMonth(item, year, month),
    )
    .forEach((item) => {
      const instance = getInstanceForMonth(
        instances,
        item.id,
        "savings",
        yearMonth,
      );

      let status = instance?.status || "pending";
      let assignedDate = instance?.assignedDate || null;

      if (item.dateType === "fixed" && !instance) {
        status = "assigned";
        const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
        assignedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      } else if (
        item.dateType === "fixed" &&
        instance &&
        instance.status === "pending"
      ) {
        status = "assigned";
        const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
        assignedDate =
          instance.assignedDate ||
          `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
      }

      items.push({
        ...item,
        parentType: "savings",
        instance: instance || null,
        status,
        assignedDate,
        actualAmount: instance?.actualAmount ?? item.baseAmount ?? item.amount,
      });
    });

  return items;
}

// Calculate pending assignments count
export function getPendingAssignmentsCount(recurringItems) {
  const assigned = recurringItems.filter(
    (item) => item.status === "assigned",
  ).length;
  const pending = recurringItems.filter(
    (item) => item.status === "pending",
  ).length;
  const total = assigned + pending; // Excludes "skipped"

  return { assigned, pending, total };
}

// Get date string for a recurring item in a specific month
export function getRecurringDateForMonth(item, year, month) {
  if (item.dateType === "unassigned") {
    return null;
  }

  const adjustedDay = getAdjustedDay(item.dayOfMonth, year, month);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
}
