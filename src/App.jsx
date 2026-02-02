import { useState, useEffect } from "react";
import db from "./db/database";
import Modal from "./components/Modal";

import MainDashboard from "./components/MainDashboard";
import InputDashboard from "./components/InputDashboard";
import CalendarNavigation from "./components/CalendarNavigation";
import DayActionsModal from "./components/DayActionsModal";

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modal, setModal] = useState({ type: null, data: null });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [currentDate]);

  const loadAllData = async () => {
    const [set, cats, free, fixed, fore, inc, sav] = await Promise.all([
      db.settings.get(1),
      db.categories.toArray(),
      db.freeExpenses.toArray(),
      db.fixedExpenses.toArray(),
      db.forecasts.toArray(),
      db.incomes.toArray(),
      db.savings.toArray(),
    ]);
    setSettings(set);
    setCategories(cats);
    setFreeExpenses(free);
    setFixedExpenses(fixed);
    setForecasts(fore);
    setIncomes(inc);
    setSavings(sav);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const rawFirstDay = new Date(year, month, 1).getDay();
  const firstDayOfMonth = rawFirstDay === 0 ? 6 : rawFirstDay - 1;
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

    fixedExpenses
      .filter((e) => e.dayOfMonth === day && e.active !== false)
      .forEach((e) => {
        events.push({ type: "fixed", ...e });
      });
    forecasts
      .filter((f) => f.date === dateStr)
      .forEach((f) => {
        events.push({ type: "forecast", ...f });
      });
    freeExpenses
      .filter((e) => e.date === dateStr)
      .forEach((e) => {
        events.push({ type: "free", ...e });
      });
    incomes
      .filter((i) =>
        i.isRecurring ? i.dayOfMonth === day : i.date === dateStr,
      )
      .forEach((i) => {
        events.push({ type: "income", ...i });
      });
    savings
      .filter((s) => s.date === dateStr)
      .forEach((s) => {
        events.push({ type: "savings", ...s });
      });

    return events;
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

    // Total free expenses this month
    const totalFreeExpenses = thisMonthFree.reduce(
      (sum, e) => sum + e.amount,
      0,
    );

    // Total savings this month
    const totalSavings = thisMonthSavings.reduce((sum, s) => sum + s.amount, 0);

    const monthEndForecast =
      totalIncome -
      totalSavings -
      totalFixed -
      totalForecasts -
      totalFreeExpenses;

    // Weekly budget calculation
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklySpent = freeExpenses
      .filter((e) => new Date(e.date) >= weekAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    const weeklyBudget = settings?.weeklyBudget || 0;
    const weeklyRemaining = weeklyBudget - weeklySpent;

    return {
      currentBalance,
      monthEndForecast,
      totalIncome,
      totalFixed,
      totalForecasts,
      totalFreeExpenses,
      totalSavings,
      weeklySpent,
      weeklyBudget,
      weeklyRemaining,
    };
  };

  const dashboard = calculateDashboard();

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

      {/* Legend
      <div className="flex gap-4 justify-center mb-4 text-xs flex-wrap">
        <span>
          <span className="inline-block w-3 h-3 bg-red-400 rounded mr-1"></span>
          Fixed
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-orange-400 rounded mr-1"></span>
          Forecast
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-blue-400 rounded mr-1"></span>
          Free
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-purple-600 rounded mr-1"></span>
          Income
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-emerald-500 rounded mr-1"></span>
          Savings
        </span>
      </div> */}

      {/* Calendar Grid */}
      <table className="w-full border-separate border-spacing-0 table-fixed mb-4 border border-border rounded-xl overflow-hidden">
        <thead>
          <tr>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <th
                key={d}
                className="p-2 border-b border-r border-border text-sm bg-surface font-bold 
                     last:border-r-0 first:rounded-tl-xl last:rounded-tr-xl"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map(
            (_, wi) => (
              <tr key={wi}>
                {calendarDays.slice(wi * 7, (wi + 1) * 7).map((day, di) => (
                  <td
                    key={di}
                    className={`
              border-b border-r border-border p-1 align-top h-24 text-xs transition-colors
              last:border-r-0 
              ${!day ? "bg-surface/50" : "cursor-pointer hover:bg-blue-2"}
              ${wi === Math.ceil(calendarDays.length / 7) - 1 ? "border-b-0" : ""}
            `}
                    onClick={() => day && handleDayClick(day)}
                  >
                    {day ? (
                      <div className="flex flex-col h-full">
                        <div className="font-bold mb-1">{day}</div>
                        <div className="gap-1 overflow-hidden">
                          {getEventsForDay(day)
                            .slice(0, 3)
                            .map((e, i) => (
                              <div
                                key={i}
                                className={`${eventColors[e.type]} px-1 py-0.25 rounded font-semibold text-[11px] mb-0.75 truncate`}
                              >
                                {e.type === "income" || e.type === "savings"
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
                      // Celda vacía con fondo sutil
                      <div className="h-full w-full" />
                    )}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>

      {/* Input Dashboard */}
      <InputDashboard
        data={dashboard}
        onOpenModal={(type) => setModal({ type })}
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
        />
      </Modal>

      <Modal
        isOpen={modal.type === "fixedExpense"}
        onClose={closeModal}
        title="Add Fixed Expense"
      >
        <FixedExpenseForm categories={categories} onSave={closeModal} />
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
        />
      </Modal>

      <Modal
        isOpen={modal.type === "income"}
        onClose={closeModal}
        title="Add Income"
      >
        <IncomeForm onSave={closeModal} />
      </Modal>

      <Modal
        isOpen={modal.type === "savings"}
        onClose={closeModal}
        title="Add Savings"
      >
        <SavingsForm
          defaultDay={modal.data?.day}
          year={year}
          month={month}
          onSave={closeModal}
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
        />
      </Modal>

      <Modal
        isOpen={modal.type === "editIncome"}
        onClose={closeModal}
        title="Edit Income"
      >
        <IncomeForm onSave={closeModal} editData={modal.data} />
      </Modal>

      <Modal
        isOpen={modal.type === "editSavings"}
        onClose={closeModal}
        title="Edit Savings"
      >
        <SavingsForm
          year={year}
          month={month}
          onSave={closeModal}
          editData={modal.data}
        />
      </Modal>
    </div>
  );
}

// FORM COMPONENTS

export default App;
