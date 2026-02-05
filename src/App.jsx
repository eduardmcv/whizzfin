import { useState, useEffect } from "react";
import db from "./db/database";
import Modal from "./components/Modal";

import MainDashboard from "./components/MainDashboard";
import InputDashboard from "./components/InputDashboard";
import CalendarNavigation from "./components/CalendarNavigation";
import DayActionsModal from "./components/DayActionsModal";
import PendingAssignmentsModal from "./components/PendingAssignmentsModal";
import {
  getRecurringItemsForMonth,
  getPendingAssignmentsCount,
  getAdjustedDay,
  formatYearMonth,
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modal, setModal] = useState({ type: null, data: null });
  const [selectedDay, setSelectedDay] = useState(null);
  const [recurringInstances, setRecurringInstances] = useState([]);

  useEffect(() => {
    loadAllData();
  }, [currentDate]);

  const loadAllData = async () => {
    const [set, cats, free, fixed, fore, inc, sav, weekBud, recInst] =
      await Promise.all([
        db.settings.get(1),
        db.categories.toArray(),
        db.freeExpenses.toArray(),
        db.fixedExpenses.toArray(),
        db.forecasts.toArray(),
        db.incomes.toArray(),
        db.savings.toArray(),
        db.weeklyBudgets.toArray(),
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
    setRecurringInstances(recInst);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get week start day from settings (0=Sunday, 1=Monday, etc.)
  const weekStartDay = settings?.weekStartDay ?? 1; // Default to Monday

  // Calculate first day of month adjusted for week start day
  const rawFirstDay = new Date(year, month, 1).getDay(); // 0=Sunday
  const firstDayOfMonth = (rawFirstDay - weekStartDay + 7) % 7;

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

  // Helper to check if a date is in current month
  const isInCurrentMonth = (dateStr) => {
    const d = new Date(dateStr);
    return d.getMonth() === month && d.getFullYear() === year;
  };

  // Helper to check if a date has passed (up to today)
  const hasDatePassed = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  };

  // Helper to check if a day of month has passed
  const hasDayPassed = (dayOfMonth) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Only count as passed if we're in the current actual month
    if (month === currentMonth && year === currentYear) {
      return dayOfMonth <= today.getDate();
    }
    // If viewing past month, all days have passed
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return true;
    }
    // If viewing future month, no days have passed
    return false;
  };

  const getEventsForDay = (day) => {
    const events = [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const yearMonth = formatYearMonth(year, month);

    // Fixed expenses - check recurring vs one-time
    fixedExpenses
      .filter((e) => {
        if (e.active === false) return false;

        if (e.isRecurring) {
          // Check if has instance for this month
          const instance = recurringInstances.find(
            (i) =>
              i.parentId === e.id &&
              i.parentType === "fixedExpense" &&
              i.yearMonth === yearMonth,
          );

          if (instance) {
            // If assigned, show on assigned date
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            // If skipped or pending with no date, don't show
            return false;
          }

          // No instance yet - if fixed day, show on adjusted day
          if (e.dateType === "fixed" && e.dayOfMonth) {
            const adjustedDay = getAdjustedDay(e.dayOfMonth, year, month);
            return adjustedDay === day;
          }

          return false;
        } else {
          // One-time fixed expense
          return e.date === dateStr;
        }
      })
      .forEach((e) => {
        const instance = recurringInstances.find(
          (i) =>
            i.parentId === e.id &&
            i.parentType === "fixedExpense" &&
            i.yearMonth === yearMonth,
        );
        events.push({
          type: "fixed",
          ...e,
          amount: instance?.actualAmount ?? e.amount,
        });
      });

    // Forecasts
    forecasts
      .filter((f) => f.date === dateStr)
      .forEach((f) => {
        events.push({ type: "forecast", ...f });
      });

    // Free expenses
    freeExpenses
      .filter((e) => e.date === dateStr)
      .forEach((e) => {
        events.push({ type: "free", ...e });
      });

    // Incomes - check recurring vs one-time
    incomes
      .filter((i) => {
        if (i.isRecurring) {
          const instance = recurringInstances.find(
            (inst) =>
              inst.parentId === i.id &&
              inst.parentType === "income" &&
              inst.yearMonth === yearMonth,
          );

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          // No instance yet - if fixed day, show on adjusted day
          if (i.dateType === "fixed" && i.dayOfMonth) {
            const adjustedDay = getAdjustedDay(i.dayOfMonth, year, month);
            return adjustedDay === day;
          }

          return false;
        } else {
          // One-time income
          return i.date === dateStr;
        }
      })
      .forEach((i) => {
        const instance = recurringInstances.find(
          (inst) =>
            inst.parentId === i.id &&
            inst.parentType === "income" &&
            inst.yearMonth === yearMonth,
        );
        events.push({
          type: "income",
          ...i,
          amount: instance?.actualAmount ?? i.amount,
        });
      });

    // Savings - check recurring vs one-time
    savings
      .filter((s) => {
        if (s.isRecurring) {
          const instance = recurringInstances.find(
            (inst) =>
              inst.parentId === s.id &&
              inst.parentType === "savings" &&
              inst.yearMonth === yearMonth,
          );

          if (instance) {
            if (instance.status === "assigned" && instance.assignedDate) {
              return instance.assignedDate === dateStr;
            }
            return false;
          }

          // No instance yet - if fixed day, show on adjusted day
          if (s.dateType === "fixed" && s.dayOfMonth) {
            const adjustedDay = getAdjustedDay(s.dayOfMonth, year, month);
            return adjustedDay === day;
          }

          return false;
        } else {
          // One-time savings
          return s.date === dateStr;
        }
      })
      .forEach((s) => {
        const instance = recurringInstances.find(
          (inst) =>
            inst.parentId === s.id &&
            inst.parentType === "savings" &&
            inst.yearMonth === yearMonth,
        );
        events.push({
          type: "savings",
          ...s,
          amount: instance?.actualAmount ?? s.amount,
        });
      });

    return events;
  };

  // Helper to get the start of the week for a given date
  const getWeekStart = (date, weekStartDay = 1) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const currentDay = d.getDay();
    const diff = (currentDay - weekStartDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };

  // Helper to format date as YYYY-MM-DD
  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Helper to get spent amount for a specific week
  const getWeekSpent = (weekStartDate) => {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return freeExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= weekStartDate && d <= weekEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // Helper to get budget for a specific week
  const getWeekBudget = (weekStartDate) => {
    const weekStartStr = formatDateStr(weekStartDate);
    const customBudget = weeklyBudgets.find(
      (wb) => wb.weekStart === weekStartStr,
    );
    return customBudget?.amount ?? (settings?.weeklyBudget || 0);
  };

  const calculateDashboard = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayDate = now.getDate();

    // Filter for current month
    const thisMonthFree = freeExpenses.filter((e) => isInCurrentMonth(e.date));
    const thisMonthForecasts = forecasts.filter((f) =>
      isInCurrentMonth(f.date),
    );
    const thisMonthSavings = savings.filter((s) => isInCurrentMonth(s.date));

    // --- CURRENT BALANCE (what has actually happened up to today) ---
    // Income received (recurring that has passed + one-time that has passed)
    const incomeReceived = incomes.reduce((sum, i) => {
      if (i.isRecurring) {
        if (hasDayPassed(i.dayOfMonth)) return sum + i.amount;
      } else {
        if (hasDatePassed(i.date) && isInCurrentMonth(i.date))
          return sum + i.amount;
      }
      return sum;
    }, 0);

    // Fixed expenses paid (day has passed)
    const fixedPaid = fixedExpenses
      .filter((e) => e.active !== false && hasDayPassed(e.dayOfMonth))
      .reduce((sum, e) => sum + e.amount, 0);

    // Free expenses made (date has passed)
    const freePaid = thisMonthFree
      .filter((e) => hasDatePassed(e.date))
      .reduce((sum, e) => sum + e.amount, 0);

    // Forecasts completed
    const forecastsPaid = thisMonthForecasts
      .filter((f) => f.status === "completed" || hasDatePassed(f.date))
      .reduce((sum, f) => sum + f.amount, 0);

    // Savings made (date has passed)
    const savingsMade = thisMonthSavings
      .filter((s) => hasDatePassed(s.date))
      .reduce((sum, s) => sum + s.amount, 0);

    const currentBalance =
      incomeReceived - savingsMade - fixedPaid - freePaid - forecastsPaid;

    // --- MONTH-END FORECAST (estimation for end of month) ---
    // Total expected income
    const totalIncome = incomes.reduce((sum, i) => {
      if (i.isRecurring) return sum + i.amount;
      if (isInCurrentMonth(i.date)) return sum + i.amount;
      return sum;
    }, 0);

    // Total fixed expenses
    const totalFixed = fixedExpenses
      .filter((e) => e.active !== false)
      .reduce((sum, e) => sum + e.amount, 0);

    // Total forecasts (pending)
    const totalForecasts = thisMonthForecasts
      .filter((f) => f.status === "pending")
      .reduce((sum, f) => sum + f.amount, 0);

    // Total savings this month
    const totalSavings = thisMonthSavings.reduce((sum, s) => sum + s.amount, 0);

    // --- WEEKLY BUDGETS FOR THIS MONTH ---
    // A week belongs to the month where it STARTS
    // Calculate total weekly budgets + any overspending
    const getWeeksInMonth = (year, month, weekStartDay) => {
      const weeks = [];
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);

      // Find the first week that starts in this month
      let weekStart = getWeekStart(firstOfMonth, weekStartDay);

      // If the week started in previous month, move to next week
      if (
        weekStart.getMonth() < month ||
        (weekStart.getMonth() === 11 &&
          month === 0 &&
          weekStart.getFullYear() < year)
      ) {
        weekStart.setDate(weekStart.getDate() + 7);
      }
      // Handle year boundary
      if (weekStart.getFullYear() < year) {
        weekStart.setDate(weekStart.getDate() + 7);
      }

      // Collect all weeks that START in this month
      while (
        weekStart.getMonth() === month &&
        weekStart.getFullYear() === year
      ) {
        weeks.push(new Date(weekStart));
        weekStart.setDate(weekStart.getDate() + 7);
      }

      return weeks;
    };

    const weeksThisMonth = getWeeksInMonth(
      currentYear,
      currentMonth,
      settings?.weekStartDay ?? 1,
    );

    let totalWeeklyBudgets = 0;
    let totalOverspending = 0;
    let totalWeeklySpent = 0;

    weeksThisMonth.forEach((weekStartDate) => {
      const weekBudget = getWeekBudget(weekStartDate);
      const weekSpent = getWeekSpent(weekStartDate);

      totalWeeklyBudgets += weekBudget;
      totalWeeklySpent += weekSpent;

      // If overspent, add the excess
      if (weekSpent > weekBudget) {
        totalOverspending += weekSpent - weekBudget;
      }
    });

    const totalWeeklyRemaining = totalWeeklyBudgets - totalWeeklySpent;

    const monthEndForecast =
      totalIncome -
      totalSavings -
      totalFixed -
      totalForecasts -
      totalWeeklyBudgets -
      totalOverspending;

    // Weekly budget calculation - based on current running week
    const currentWeekStart = getWeekStart(now, settings?.weekStartDay ?? 1);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const weeklySpent = freeExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= currentWeekStart && d <= currentWeekEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    // Get custom budget for current week or use default
    const weekStartStr = formatDateStr(currentWeekStart);
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
    };
  };

  const dashboard = calculateDashboard();

  // Calculate recurring items for current month
  const recurringItems = getRecurringItemsForMonth(
    fixedExpenses,
    incomes,
    savings,
    recurringInstances,
    year,
    month,
  );
  const pendingCount = getPendingAssignmentsCount(recurringItems);

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setModal({ type: "dayActions", data: { day } });
  };

  const closeModal = () => {
    setModal({ type: null, data: null });
    setSelectedDay(null);
    loadAllData();
  };

  // Delete handlers
  const handleDelete = async (type, id) => {
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
    }
    loadAllData();
  };

  // Edit handler - opens edit modal
  const handleEdit = (type, item) => {
    setModal({
      type: `edit${type.charAt(0).toUpperCase() + type.slice(1)}`,
      data: item,
    });
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const eventColors = {
    fixed: "bg-purple-900/40 text-purple-200",
    forecast: "bg-orange-700/30 text-orange-200",
    free: "bg-red-900/40 text-red-200",
    income: "bg-blue-900/40 text-blue-200",
    savings: "bg-emerald-900/40 text-emerald-200",
  };

  // Get day names starting from weekStartDay
  const getDayNames = () => {
    const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    for (let i = 0; i < 7; i++) {
      result.push(allDays[(weekStartDay + i) % 7]);
    }
    return result;
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-text">
        Whizzfin
      </h1>

      {/* Calendar Navigation */}
      <CalendarNavigation
        month={month}
        year={year}
        monthNames={monthNames}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      {/* Main Dashboard */}
      <MainDashboard data={dashboard} />

      {/* Calendar with Budget sidebar */}
      <div className="flex mb-4 gap-2">
        {/* Calendar Grid */}
        <div className="flex-1 border border-border rounded-xl overflow-hidden">
          <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr>
                {getDayNames().map((d, i) => {
                  const actualDay = (weekStartDay + i) % 7;
                  const isWeekend = actualDay === 0 || actualDay === 6;
                  return (
                    <th
                      key={d}
                      className={`p-2 border-b border-r border-border text-sm font-bold 
                        last:border-r-0
                        ${isWeekend ? "bg-red-900/10" : "bg-surface"}`}
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
                        const actualDay = (weekStartDay + di) % 7;
                        const isWeekend = actualDay === 0 || actualDay === 6;

                        return (
                          <td
                            key={di}
                            className={`
                              border-b border-r border-border p-1 align-top h-24  text-xs transition-colors
                              last:border-r-0
                              ${!day ? "bg-surface/50" : "cursor-pointer hover:bg-blue-3"}
                              ${isToday ? "bg-blue-2" : isWeekend && day ? "bg-red-900/10" : ""}
                              ${isLastRow ? "border-b-0" : ""}
                            `}
                            onClick={() => day && handleDayClick(day)}
                          >
                            {day ? (
                              <div className="flex flex-col h-full">
                                <div
                                  className={`font-bold nr-300 mb-1 ${isToday ? "text-blue-8" : ""}`}
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

        {/* Budget sidebar */}
        <div className="flex flex-col w-16">
          <div className="h-[39px] flex items-center justify-center"></div>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map(
            (_, wi) => {
              const weekDays = calendarDays.slice(wi * 7, (wi + 1) * 7);
              const firstDayOfWeek = weekDays.find((d) => d !== null);
              const weekStartDate = firstDayOfWeek
                ? getWeekStart(
                    new Date(year, month, firstDayOfWeek),
                    weekStartDay,
                  )
                : null;
              const weekSpent = weekStartDate ? getWeekSpent(weekStartDate) : 0;
              const weekBudget = weekStartDate
                ? getWeekBudget(weekStartDate)
                : settings?.weeklyBudget || 0;
              const weekRemaining = weekBudget - weekSpent;

              return (
                <div
                  key={wi}
                  className="h-24 flex items-center justify-center text-center text-xs cursor-pointer hover:bg-blue-3 transition-colors rounded-xl"
                  onClick={() =>
                    weekStartDate &&
                    setModal({
                      type: "weeklyBudget",
                      data: {
                        weekStart: formatDateStr(weekStartDate),
                        currentBudget: weekBudget,
                      },
                    })
                  }
                >
                  {weekStartDate && (
                    <div
                      className={` nr-500 text-lg font-bold ${weekRemaining < 0 ? "text-red-400" : "text-text-muted"}`}
                    >
                      {weekRemaining.toFixed(0)}€
                      <div className="text-text-muted nr-400 font-normal text-[10px]">
                        /{weekBudget}€
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Input Dashboard */}
      <InputDashboard
        data={dashboard}
        onOpenModal={(type) => setModal({ type })}
        pendingCount={pendingCount}
      />

      {/* Day Actions Modal */}
      <DayActionsModal
        isOpen={modal.type === "dayActions"}
        onClose={closeModal}
        day={modal.data?.day}
        month={month}
        year={year}
        monthNames={monthNames}
        events={modal.data?.day ? getEventsForDay(modal.data.day) : []}
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
          year={year}
          month={month}
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
          year={year}
          month={month}
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
          year={year}
          month={month}
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
      />
    </div>
  );
}

// FORM COMPONENTS

function WeeklyBudgetForm({ weekStart, currentBudget, defaultBudget, onSave }) {
  const [amount, setAmount] = useState(currentBudget || defaultBudget);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if custom budget exists for this week
    const existing = await db.weeklyBudgets
      .where("weekStart")
      .equals(weekStart)
      .first();

    if (amount === defaultBudget) {
      // If set to default, remove custom budget
      if (existing) {
        await db.weeklyBudgets.delete(existing.id);
      }
    } else {
      // Save custom budget
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
