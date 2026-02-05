import { useState, useEffect } from "react";
import db from "./db/database";
import Modal from "./components/Modal";

import MainDashboard from "./components/MainDashboard";
import InputDashboard from "./components/InputDashboard";
import CalendarNavigation from "./components/CalendarNavigation";
import DayActionsModal from "./components/DayActionsModal";
import PendingAssignmentsModal from "./components/PendingAssignmentsModal";
import WeekView from "./components/WeekView";
import {
  getRecurringItemsForMonth,
  getPendingAssignmentsCount,
  getAdjustedDay,
  formatYearMonth,
  autoCompletePassedInstances,
} from "./lib/recurring";

import FreeExpenseForm from "./components/forms/FreeExpenseForm";
import FixedExpenseForm from "./components/forms/FixedExpenseForm";
import ForecastForm from "./components/forms/ForecastForm";
import IncomeForm from "./components/forms/IncomeForm";
import SavingsForm from "./components/forms/SavingsForm";
import CategoriesForm from "./components/forms/CategoriesForm";
import SettingsForm from "./components/forms/SettingsForm";

function App() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [freeExpenses, setFreeExpenses] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [savings, setSavings] = useState([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState([]);
  const [weeklyBudgetAssignments, setWeeklyBudgetAssignments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(null); // For week view navigation
  const [currentView, setCurrentView] = useState("calendar"); // "calendar" | "week"
  const [modal, setModal] = useState({ type: null, data: null });
  const [selectedDay, setSelectedDay] = useState(null);
  const [recurringInstances, setRecurringInstances] = useState([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Initialize currentWeekStart when settings load
  useEffect(() => {
    if (settings && !currentWeekStart) {
      const weekStartDay = settings.weekStartDay ?? 1;
      const today = new Date();
      const currentDay = today.getDay();
      const diff = (currentDay - weekStartDay + 7) % 7;
      const start = new Date(today);
      start.setDate(today.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      setCurrentWeekStart(start);
    }
  }, [settings, currentWeekStart]);

  // Get effective year/month based on current view
  const getEffectiveYearMonth = () => {
    if (currentView === "week" && currentWeekStart) {
      // For week view, use the month based on week assignment or week start
      const weekStartStr = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, "0")}-${String(currentWeekStart.getDate()).padStart(2, "0")}`;
      const assignment = weeklyBudgetAssignments.find(
        (a) => a.weekStart === weekStartStr,
      );

      if (assignment) {
        const [y, m] = assignment.assignedMonth.split("-").map(Number);
        return { year: y, month: m - 1 };
      }
      return {
        year: currentWeekStart.getFullYear(),
        month: currentWeekStart.getMonth(),
      };
    }
    return { year, month };
  };

  const effectiveYearMonth = getEffectiveYearMonth();

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  useEffect(() => {
    const autoComplete = async () => {
      if (fixedExpenses.length || incomes.length || savings.length) {
        const changed = await autoCompletePassedInstances(
          db,
          fixedExpenses,
          incomes,
          savings,
          recurringInstances,
          year,
          month,
        );
        if (changed) {
          loadAllData();
        }
      }
    };
    autoComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedExpenses, incomes, savings, recurringInstances, year, month]);

  const loadAllData = async () => {
    const [
      set,
      cats,
      free,
      fixed,
      fore,
      inc,
      sav,
      weekBud,
      weekAssign,
      recInst,
    ] = await Promise.all([
      db.settings.get(1),
      db.categories.toArray(),
      db.freeExpenses.toArray(),
      db.fixedExpenses.toArray(),
      db.forecasts.toArray(),
      db.incomes.toArray(),
      db.savings.toArray(),
      db.weeklyBudgets.toArray(),
      db.weeklyBudgetAssignments.toArray(),
      db.recurringInstances.toArray(),
    ]);

    setSettings(set);
    setCategories(cats);
    setFreeExpenses(free);
    setFixedExpenses(fixed);
    setForecasts(fore);
    setIncomes(inc);
    setSavings(sav);
    setWeeklyBudgets(weekBud);
    setWeeklyBudgetAssignments(weekAssign);
    setRecurringInstances(recInst);
  };

  // Week start day (0=Sunday, 1=Monday, etc.)
  const weekStartDay = settings?.weekStartDay ?? 1;

  // Calendar layout helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // ---------------------------
  // Date helpers
  // ---------------------------
  const toDateStr = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const isInCurrentMonth = (dateStr) => {
    const d = new Date(dateStr);
    return d.getMonth() === month && d.getFullYear() === year;
  };

  const hasDatePassed = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  };

  const hasDayPassed = (dayOfMonth) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // If viewing the real current month, compare day numbers
    if (month === currentMonth && year === currentYear) {
      return dayOfMonth <= today.getDate();
    }
    // If viewing a past month, everything is considered passed
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return true;
    }
    // Future month => nothing passed
    return false;
  };

  // ---------------------------
  // Recurring instance helpers
  // ---------------------------
  const getInstanceFor = (parentType, parentId, yearMonth) =>
    recurringInstances.find(
      (inst) =>
        inst.parentType === parentType &&
        inst.parentId === parentId &&
        inst.yearMonth === yearMonth,
    );

  const getEffectiveOccurrenceDate = (template, instance, y, m) => {
    // Assigned date is the truth
    if (instance?.status === "assigned" && instance.assignedDate) {
      return instance.assignedDate;
    }
    // Otherwise predict from fixed day
    if (template?.dateType === "fixed" && template?.dayOfMonth) {
      const adjusted = getAdjustedDay(template.dayOfMonth, y, m);
      return toDateStr(y, m, adjusted);
    }
    // One-time fallback
    return template?.date ?? null;
  };

  // ---------------------------
  // Events per day (calendar display)
  // ---------------------------
  const getEventsForDay = (day) => {
    const events = [];
    const dateStr = toDateStr(year, month, day);
    const yearMonth = formatYearMonth(year, month);

    // Fixed expenses
    fixedExpenses
      .filter((e) => {
        if (e.active === false) return false;

        if (e.isRecurring) {
          const instance = getInstanceFor("fixedExpense", e.id, yearMonth);

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            // skipped/pending => not shown on calendar
            return false;
          }

          if (e.dateType === "fixed" && e.dayOfMonth) {
            const adjustedDay = getAdjustedDay(e.dayOfMonth, year, month);
            return adjustedDay === day;
          }

          return false;
        }

        return e.date === dateStr;
      })
      .forEach((e) => {
        const instance = getInstanceFor("fixedExpense", e.id, yearMonth);
        events.push({
          type: "fixed",
          ...e,
          amount: instance?.actualAmount ?? e.amount,
        });
      });

    // Forecasts
    forecasts
      .filter((f) => f.date === dateStr)
      .forEach((f) => events.push({ type: "forecast", ...f }));

    // Free expenses
    freeExpenses
      .filter((e) => e.date === dateStr)
      .forEach((e) => events.push({ type: "free", ...e }));

    // Incomes
    incomes
      .filter((i) => {
        if (i.isRecurring) {
          const instance = getInstanceFor("income", i.id, yearMonth);

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          if (i.dateType === "fixed" && i.dayOfMonth) {
            const adjustedDay = getAdjustedDay(i.dayOfMonth, year, month);
            return adjustedDay === day;
          }

          return false;
        }

        return i.date === dateStr;
      })
      .forEach((i) => {
        const instance = getInstanceFor("income", i.id, yearMonth);
        events.push({
          type: "income",
          ...i,
          amount: instance?.actualAmount ?? i.amount,
        });
      });

    // Savings
    savings
      .filter((s) => {
        if (s.isRecurring) {
          const instance = getInstanceFor("savings", s.id, yearMonth);

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          if (s.dateType === "fixed" && s.dayOfMonth) {
            const adjustedDay = getAdjustedDay(s.dayOfMonth, year, month);
            return adjustedDay === day;
          }

          return false;
        }

        return s.date === dateStr;
      })
      .forEach((s) => {
        const instance = getInstanceFor("savings", s.id, yearMonth);
        events.push({
          type: "savings",
          ...s,
          amount: instance?.actualAmount ?? s.amount,
        });
      });

    return events;
  };

  // Get events for a specific date string (for week view which can span months)
  const getEventsForDate = (dateStr) => {
    const events = [];
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const yearMonth = formatYearMonth(y, m);

    // Fixed expenses
    fixedExpenses
      .filter((e) => {
        if (e.active === false) return false;

        if (e.isRecurring) {
          const instance = getInstanceFor("fixedExpense", e.id, yearMonth);

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          if (e.dateType === "fixed" && e.dayOfMonth) {
            const adjustedDay = getAdjustedDay(e.dayOfMonth, y, m);
            return adjustedDay === day;
          }

          return false;
        }

        return e.date === dateStr;
      })
      .forEach((e) => {
        const instance = getInstanceFor("fixedExpense", e.id, yearMonth);
        events.push({
          type: "fixed",
          ...e,
          amount: instance?.actualAmount ?? e.amount,
        });
      });

    // Forecasts
    forecasts
      .filter((f) => f.date === dateStr)
      .forEach((f) => events.push({ type: "forecast", ...f }));

    // Free expenses
    freeExpenses
      .filter((e) => e.date === dateStr)
      .forEach((e) => events.push({ type: "free", ...e }));

    // Incomes
    incomes
      .filter((i) => {
        if (i.isRecurring) {
          const instance = getInstanceFor("income", i.id, yearMonth);

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          if (i.dateType === "fixed" && i.dayOfMonth) {
            const adjustedDay = getAdjustedDay(i.dayOfMonth, y, m);
            return adjustedDay === day;
          }

          return false;
        }

        return i.date === dateStr;
      })
      .forEach((i) => {
        const instance = getInstanceFor("income", i.id, yearMonth);
        events.push({
          type: "income",
          ...i,
          amount: instance?.actualAmount ?? i.amount,
        });
      });

    // Savings
    savings
      .filter((s) => {
        if (s.isRecurring) {
          const instance = getInstanceFor("savings", s.id, yearMonth);

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          if (s.dateType === "fixed" && s.dayOfMonth) {
            const adjustedDay = getAdjustedDay(s.dayOfMonth, y, m);
            return adjustedDay === day;
          }

          return false;
        }

        return s.date === dateStr;
      })
      .forEach((s) => {
        const instance = getInstanceFor("savings", s.id, yearMonth);
        events.push({
          type: "savings",
          ...s,
          amount: instance?.actualAmount ?? s.amount,
        });
      });

    return events;
  };

  // ---------------------------
  // Week + budget helpers
  // ---------------------------
  const getWeekStart = (date, weekStartDay = 1) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const currentDay = d.getDay();
    const diff = (currentDay - weekStartDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const getWeekBudget = (weekStartDate) => {
    const weekStartStr = formatDateStr(weekStartDate);
    const customBudget = weeklyBudgets.find(
      (wb) => wb.weekStart === weekStartStr,
    );
    return customBudget?.amount ?? (settings?.weeklyBudget || 0);
  };

  // Free expenses + forecasts with deductFrom="weekly"
  const getWeekSpent = (weekStartDate) => {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const freeSpent = freeExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= weekStartDate && d <= weekEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const forecastSpent = forecasts
      .filter((f) => {
        if (f.deductFrom !== "weekly") return false;
        const d = new Date(f.date);
        return d >= weekStartDate && d <= weekEnd;
      })
      .reduce((sum, f) => sum + f.amount, 0);

    return freeSpent + forecastSpent;
  };

  // ---------------------------
  // Dashboard calculation
  // ---------------------------
  const calculateDashboard = () => {
    // Use effective year/month (changes based on view and week navigation)
    const dashYear = effectiveYearMonth.year;
    const dashMonth = effectiveYearMonth.month;
    const yearMonth = formatYearMonth(dashYear, dashMonth);

    const isInDashMonth = (dateStr) => {
      const d = new Date(dateStr);
      return d.getMonth() === dashMonth && d.getFullYear() === dashYear;
    };

    const thisMonthFree = freeExpenses.filter((e) => isInDashMonth(e.date));
    const thisMonthForecasts = forecasts.filter((f) => isInDashMonth(f.date));
    const thisMonthSavings = savings.filter((s) =>
      s.date ? isInDashMonth(s.date) : true,
    );

    // --- CURRENT BALANCE (up to today) ---
    const incomeReceived = incomes.reduce((sum, i) => {
      if (i.isRecurring) {
        const inst = getInstanceFor("income", i.id, yearMonth);

        // If there is an instance, only count it if assigned and passed
        if (inst) {
          if (inst.status !== "assigned") return sum;
          const occ = getEffectiveOccurrenceDate(i, inst, dashYear, dashMonth);
          if (occ && hasDatePassed(occ)) {
            return sum + (inst.actualAmount ?? i.amount);
          }
          return sum;
        }

        // No instance yet => predict by fixed day
        const occ = getEffectiveOccurrenceDate(i, null, dashYear, dashMonth);
        if (occ && hasDatePassed(occ)) return sum + i.amount;
        return sum;
      }

      // One-time income
      if (i.date && isInDashMonth(i.date) && hasDatePassed(i.date)) {
        return sum + i.amount;
      }
      return sum;
    }, 0);

    const fixedPaid = fixedExpenses.reduce((sum, e) => {
      if (e.active === false) return sum;

      if (e.isRecurring) {
        const inst = getInstanceFor("fixedExpense", e.id, yearMonth);

        if (inst) {
          if (inst.status !== "assigned") return sum;
          const occ = getEffectiveOccurrenceDate(e, inst, dashYear, dashMonth);
          if (occ && hasDatePassed(occ)) {
            return sum + (inst.actualAmount ?? e.amount);
          }
          return sum;
        }

        const occ = getEffectiveOccurrenceDate(e, null, dashYear, dashMonth);
        if (occ && hasDatePassed(occ)) return sum + e.amount;
        return sum;
      }

      // One-time fixed expense
      if (e.date && isInDashMonth(e.date) && hasDatePassed(e.date)) {
        return sum + e.amount;
      }

      // Legacy fallback (if you still have fixed items with just dayOfMonth)
      if (!e.date && e.dayOfMonth && hasDayPassed(e.dayOfMonth)) {
        return sum + e.amount;
      }

      return sum;
    }, 0);

    const freePaid = thisMonthFree
      .filter((e) => hasDatePassed(e.date))
      .reduce((sum, e) => sum + e.amount, 0);

    const forecastsPaid = thisMonthForecasts
      .filter((f) => f.status === "completed" || hasDatePassed(f.date))
      .reduce((sum, f) => sum + f.amount, 0);

    const savingsMade = savings.reduce((sum, s) => {
      if (s.isRecurring) {
        const inst = getInstanceFor("savings", s.id, yearMonth);

        if (inst) {
          if (inst.status !== "assigned") return sum;
          const occ = getEffectiveOccurrenceDate(s, inst, dashYear, dashMonth);
          if (occ && hasDatePassed(occ)) {
            return sum + (inst.actualAmount ?? s.amount);
          }
          return sum;
        }

        const occ = getEffectiveOccurrenceDate(s, null, dashYear, dashMonth);
        if (occ && hasDatePassed(occ)) return sum + s.amount;
        return sum;
      }

      if (s.date && isInDashMonth(s.date) && hasDatePassed(s.date)) {
        return sum + s.amount;
      }
      return sum;
    }, 0);

    const currentBalance =
      incomeReceived - savingsMade - fixedPaid - freePaid - forecastsPaid;

    // --- MONTH-END FORECAST (end-of-month estimation for the VIEWED month) ---
    const totalIncome = incomes.reduce((sum, i) => {
      if (i.isRecurring) return sum + i.amount;
      if (i.date && isInDashMonth(i.date)) return sum + i.amount;
      return sum;
    }, 0);

    const totalFixed = fixedExpenses
      .filter((e) => e.active !== false)
      .reduce((sum, e) => {
        // For recurring, count the amount for this month
        if (e.isRecurring) return sum + e.amount;
        // For one-time, only if in this month
        if (e.date && isInDashMonth(e.date)) return sum + e.amount;
        return sum;
      }, 0);

    const totalForecasts = thisMonthForecasts
      .filter((f) => f.deductFrom !== "weekly") // Only count forecasts NOT deducted from weekly
      .reduce((sum, f) => sum + f.amount, 0);

    const totalSavings = savings.reduce((sum, s) => {
      if (s.isRecurring) return sum + s.amount;
      if (s.date && isInDashMonth(s.date)) return sum + s.amount;
      return sum;
    }, 0);

    // --- Weekly budgets for this viewed month ---
    // Check weeklyBudgetAssignments for cross-month weeks
    const getWeeksInViewedMonth = (y, m, wkStartDay) => {
      const weeks = [];
      const firstOfMonth = new Date(y, m, 1);
      const lastOfMonth = new Date(y, m + 1, 0);

      let weekStart = getWeekStart(firstOfMonth, wkStartDay);

      // Include the week if it starts in this month OR if it's assigned to this month
      while (weekStart <= lastOfMonth) {
        const weekStartStr = formatDateStr(weekStart);
        const assignment = weeklyBudgetAssignments.find(
          (a) => a.weekStart === weekStartStr,
        );

        const weekBelongsToThisMonth =
          (weekStart.getMonth() === m && weekStart.getFullYear() === y) ||
          assignment?.assignedMonth === formatYearMonth(y, m);

        // Exclude if assigned to a different month
        const assignedElsewhere =
          assignment && assignment.assignedMonth !== formatYearMonth(y, m);

        if (weekBelongsToThisMonth && !assignedElsewhere) {
          weeks.push(new Date(weekStart));
        }

        weekStart.setDate(weekStart.getDate() + 7);
      }

      return weeks;
    };

    const weeksThisMonth = getWeeksInViewedMonth(
      dashYear,
      dashMonth,
      weekStartDay,
    );

    let totalWeeklyBudgets = 0;
    let totalWeeklySpent = 0;
    let totalOverspending = 0;

    weeksThisMonth.forEach((weekStartDate) => {
      const weekBudget = getWeekBudget(weekStartDate);
      const weekSpent = getWeekSpent(weekStartDate);

      totalWeeklyBudgets += weekBudget;
      totalWeeklySpent += weekSpent;

      if (weekSpent > weekBudget) {
        totalOverspending += weekSpent - weekBudget;
      }
    });

    const totalWeeklyRemaining = totalWeeklyBudgets - totalWeeklySpent;

    // Month-end forecast: Income - Fixed - Savings - Forecasts(non-weekly) - WeeklyBudgets - Overspending
    const monthEndForecast =
      totalIncome -
      totalSavings -
      totalFixed -
      totalForecasts -
      totalWeeklyBudgets -
      totalOverspending;

    // --- Current week budget (relative to today) ---
    // If you're viewing another month, this is still "today's week", which is fine for the top dashboard
    const now = new Date();
    const todayWeekStart = getWeekStart(now, weekStartDay);
    const weeklySpent = getWeekSpent(todayWeekStart);
    const weekStartStr = formatDateStr(todayWeekStart);
    const customBudget = weeklyBudgets.find(
      (wb) => wb.weekStart === weekStartStr,
    );
    const weeklyBudget = customBudget?.amount ?? (settings?.weeklyBudget || 0);
    const weeklyRemaining = weeklyBudget - weeklySpent;

    return {
      currentBalance,
      monthEndForecast,
      totalIncome,
      totalFixed,
      totalForecasts,
      totalWeeklyBudgets,
      totalWeeklyRemaining,
      totalOverspending,
      totalSavings,
      weeklySpent,
      weeklyBudget,
      weeklyRemaining,
      dashYear,
      dashMonth,
    };
  };

  const dashboard = calculateDashboard();

  // Recurring items for the month (PendingAssignmentsModal)
  const recurringItems = getRecurringItemsForMonth(
    fixedExpenses,
    incomes,
    savings,
    recurringInstances,
    year,
    month,
  );
  const pendingCount = getPendingAssignmentsCount(recurringItems);

  // ---------------------------
  // UI handlers
  // ---------------------------
  const handleDayClick = (day) => {
    setSelectedDay(day);
    setModal({ type: "dayActions", data: { day } });
  };

  const closeModal = () => {
    setModal({ type: null, data: null });
    setSelectedDay(null);
    loadAllData();
  };

  const handleDelete = async (type, id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Are you sure you want to delete this?")) return;

    switch (type) {
      case "free":
        await db.freeExpenses.delete(id);
        break;
      case "fixed":
        await db.fixedExpenses.delete(id);
        break;
      case "forecast":
        await db.forecasts.delete(id);
        break;
      case "income":
        await db.incomes.delete(id);
        break;
      case "savings":
        await db.savings.delete(id);
        break;
      default:
        break;
    }
    loadAllData();
  };

  const handleEdit = (type, item) => {
    setModal({
      type: `edit${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data: item,
    });
  };

  const eventColors = {
    fixed: "bg-purple-900/40 text-purple-200",
    forecast: "bg-orange-700/30 text-orange-200",
    free: "bg-red-900/40 text-red-200",
    income: "bg-blue-900/40 text-blue-200",
    savings: "bg-emerald-900/40 text-emerald-200",
  };

  // Calendar always starts on Monday (1), week view uses weekStartDay from settings
  const calendarStartDay = 1; // Monday

  const getDayNames = (startDay) => {
    const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    for (let i = 0; i < 7; i++) {
      result.push(allDays[(startDay + i) % 7]);
    }
    return result;
  };

  // Recalculate calendar layout with Monday start
  const rawFirstDayCalendar = new Date(year, month, 1).getDay();
  const firstDayOfMonthCalendar =
    (rawFirstDayCalendar - calendarStartDay + 7) % 7;

  // Calendar cells
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonthCalendar; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-text">
        Whizzfin
      </h1>

      <CalendarNavigation
        month={month}
        year={year}
        monthNames={monthNames}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      <MainDashboard data={dashboard} />

      {/* View selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCurrentView("calendar")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            currentView === "calendar"
              ? "bg-blue-6 text-white"
              : "bg-surface text-text-muted hover:bg-blue-3"
          }`}
        >
          📅 Calendar
        </button>
        <button
          onClick={() => setCurrentView("week")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            currentView === "week"
              ? "bg-blue-6 text-white"
              : "bg-surface text-text-muted hover:bg-blue-3"
          }`}
        >
          📊 Week View
        </button>
      </div>

      {currentView === "calendar" ? (
        /* Calendar Grid - without budget sidebar */
        <div className="mb-4 border border-border rounded-xl overflow-hidden">
          <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr>
                {getDayNames(calendarStartDay).map((d, i) => {
                  const actualDay = (calendarStartDay + i) % 7;
                  const isSunday = actualDay === 0;
                  return (
                    <th
                      key={d}
                      className={`p-2 border-b border-r border-border text-sm font-bold 
                        last:border-r-0
                        ${isSunday ? "bg-red-900/10" : "bg-surface"}`}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map(
                (_, wi) => {
                  const weekDays = calendarDays.slice(wi * 7, (wi + 1) * 7);
                  const isLastRow =
                    wi === Math.ceil(calendarDays.length / 7) - 1;

                  return (
                    <tr key={wi}>
                      {weekDays.map((day, di) => {
                        const isToday =
                          day &&
                          new Date().getDate() === day &&
                          new Date().getMonth() === month &&
                          new Date().getFullYear() === year;

                        const actualDay = (calendarStartDay + di) % 7;
                        const isSunday = actualDay === 0;

                        return (
                          <td
                            key={di}
                            className={`
                              border-b border-border p-1 align-top h-24 text-xs transition-colors
                              last:border-r-0
                              ${!day ? "bg-surface/50" : "cursor-pointer hover:bg-blue-3"}
                              ${isToday ? "bg-blue-2" : isSunday && day ? "bg-red-900/10" : ""}
                              ${isLastRow ? "border-b-0" : ""}
                            `}
                            onClick={() => day && handleDayClick(day)}
                          >
                            {day ? (
                              <div className="flex flex-col h-full">
                                <div
                                  className={`font-bold nr-300 mb-1 text-center ${isToday ? "text-blue-8" : ""}`}
                                >
                                  {day}
                                </div>

                                <div className="gap-1 overflow-hidden">
                                  {getEventsForDay(day)
                                    .slice(0, 3)
                                    .map((e, i) => (
                                      <div
                                        key={i}
                                        className={`${eventColors[e.type]} px-1 py-0.25 rounded nr-300 text-[11px] mb-0.75 truncate`}
                                      >
                                        {e.type === "income" ||
                                        e.type === "savings"
                                          ? "+"
                                          : "-"}
                                        {e.amount}€
                                      </div>
                                    ))}

                                  {getEventsForDay(day).length > 3 && (
                                    <div className="text-gray-400 text-[10px] mt-1">
                                      +{getEventsForDay(day).length - 3} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full w-full" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Week View */
        <div className="mb-4">
          {currentWeekStart && (
            <WeekView
              weekStartDay={weekStartDay}
              settings={settings}
              freeExpenses={freeExpenses}
              forecasts={forecasts}
              fixedExpenses={fixedExpenses}
              incomes={incomes}
              savings={savings}
              weeklyBudgets={weeklyBudgets}
              weeklyBudgetAssignments={weeklyBudgetAssignments}
              recurringInstances={recurringInstances}
              eventColors={eventColors}
              onDayClick={(date) => {
                // date is a Date object from WeekView
                setModal({
                  type: "dayActions",
                  data: { day: date.getDate(), fullDate: date },
                });
              }}
              onEditWeeklyBudget={(weekStart, currentBudget) =>
                setModal({
                  type: "weeklyBudget",
                  data: { weekStart, currentBudget },
                })
              }
              onReload={loadAllData}
              currentWeekStart={currentWeekStart}
              onWeekChange={setCurrentWeekStart}
              getEventsForDate={getEventsForDate}
            />
          )}
        </div>
      )}

      <InputDashboard
        data={dashboard}
        onOpenModal={(type) => setModal({ type })}
        pendingCount={pendingCount}
      />

      <DayActionsModal
        isOpen={modal.type === "dayActions"}
        onClose={closeModal}
        day={modal.data?.day}
        month={month}
        year={year}
        fullDate={modal.data?.fullDate}
        monthNames={monthNames}
        events={
          modal.data?.fullDate
            ? getEventsForDate(formatDateStr(modal.data.fullDate))
            : modal.data?.day
              ? getEventsForDay(modal.data.day)
              : []
        }
        eventColors={eventColors}
        onOpenModal={(type, data) => setModal({ type, data })}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add Modals */}
      <Modal
        isOpen={modal.type === "freeExpense"}
        onClose={closeModal}
        title="Add Free Expense"
      >
        <FreeExpenseForm
          categories={categories}
          defaultDay={modal.data?.day}
          year={modal.data?.fullDate ? modal.data.fullDate.getFullYear() : year}
          month={modal.data?.fullDate ? modal.data.fullDate.getMonth() : month}
          onSave={closeModal}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "fixedExpense"}
        onClose={closeModal}
        title="Add Fixed Expense"
      >
        <FixedExpenseForm
          categories={categories}
          onSave={closeModal}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "forecast"}
        onClose={closeModal}
        title="Add Forecast"
      >
        <ForecastForm
          categories={categories}
          defaultDay={modal.data?.day}
          year={modal.data?.fullDate ? modal.data.fullDate.getFullYear() : year}
          month={modal.data?.fullDate ? modal.data.fullDate.getMonth() : month}
          onSave={closeModal}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "income"}
        onClose={closeModal}
        title="Add Income"
      >
        <IncomeForm
          categories={categories}
          onSave={closeModal}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "savings"}
        onClose={closeModal}
        title="Add Savings"
      >
        <SavingsForm
          categories={categories}
          defaultDay={modal.data?.day}
          year={modal.data?.fullDate ? modal.data.fullDate.getFullYear() : year}
          month={modal.data?.fullDate ? modal.data.fullDate.getMonth() : month}
          onSave={closeModal}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "categories"}
        onClose={closeModal}
        title="Manage Categories"
      >
        <CategoriesForm categories={categories} onSave={closeModal} />
      </Modal>

      <Modal
        isOpen={modal.type === "settings"}
        onClose={closeModal}
        title="Settings"
      >
        <SettingsForm settings={settings} onSave={closeModal} />
      </Modal>

      {/* Edit Modals */}
      <Modal
        isOpen={modal.type === "editFree"}
        onClose={closeModal}
        title="Edit Free Expense"
      >
        <FreeExpenseForm
          categories={categories}
          year={year}
          month={month}
          onSave={closeModal}
          editData={modal.data}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "editFixed"}
        onClose={closeModal}
        title="Edit Fixed Expense"
      >
        <FixedExpenseForm
          categories={categories}
          onSave={closeModal}
          editData={modal.data}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "editForecast"}
        onClose={closeModal}
        title="Edit Forecast"
      >
        <ForecastForm
          categories={categories}
          year={year}
          month={month}
          onSave={closeModal}
          editData={modal.data}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "editIncome"}
        onClose={closeModal}
        title="Edit Income"
      >
        <IncomeForm
          categories={categories}
          onSave={closeModal}
          editData={modal.data}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "editSavings"}
        onClose={closeModal}
        title="Edit Savings"
      >
        <SavingsForm
          categories={categories}
          year={year}
          month={month}
          onSave={closeModal}
          editData={modal.data}
          onCategoriesChanged={loadAllData}
        />
      </Modal>

      {/* Weekly Budget Edit Modal */}
      <Modal
        isOpen={modal.type === "weeklyBudget"}
        onClose={closeModal}
        title="Edit Weekly Budget"
      >
        <WeeklyBudgetForm
          weekStart={modal.data?.weekStart}
          currentBudget={modal.data?.currentBudget}
          defaultBudget={settings?.weeklyBudget || 0}
          onSave={closeModal}
        />
      </Modal>

      {/* Pending Assignments Modal */}
      <PendingAssignmentsModal
        isOpen={modal.type === "pendingAssignments"}
        onClose={closeModal}
        recurringItems={recurringItems}
        year={year}
        month={month}
        onUpdate={loadAllData}
        onEditTemplate={(item) => {
          const editType = {
            income: "editIncome",
            fixedExpense: "editFixed",
            savings: "editSavings",
          }[item.parentType];

          setModal({ type: editType, data: item });
        }}
      />
    </div>
  );
}

// ------------------------------------
// WeeklyBudgetForm
// ------------------------------------
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
          className="w-full p-2 border border-border rounded bg-background text-text"
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
          className="flex-1 p-2 bg-gray-8 text-white rounded hover:bg-gray-7"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="p-2 border border-border rounded hover:bg-surface text-text-muted"
        >
          Reset to default
        </button>
      </div>
    </form>
  );
}

export default App;
