import { useState, useEffect } from "react";
import db from "./db/database";
import Modal from "./components/Modal";

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
  const firstDayOfMonth = new Date(year, month, 1).getDay();
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

  const eventColors = {
    fixed: "bg-red-400",
    forecast: "bg-yellow-400",
    free: "bg-blue-400",
    income: "bg-purple-600 text-white",
    savings: "bg-emerald-500 text-white",
  };

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-6">Whizzfin</h1>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Main metrics - larger */}
        <div className="p-4 bg-boxed rounded-lg text-center shadow-sm col-span-2">
          <div className="text-xs text-discret">Current Balance</div>
          <div
            className={`text-3xl font-bold ${dashboard.currentBalance >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {dashboard.currentBalance.toFixed(2)}€
          </div>
          <div className="text-xs text-discret mt-1">
            What you have right now
          </div>
        </div>

        <div className="p-4 bg-boxed rounded-lg text-center shadow-sm col-span-2">
          <div className="text-xs text-discret">Month-End Forecast</div>
          <div
            className={`text-3xl font-bold ${dashboard.monthEndForecast >= 0 ? "text-blue-500" : "text-red-500"}`}
          >
            {dashboard.monthEndForecast.toFixed(2)}€
          </div>
          <div className="text-xs text-discret mt-1">
            Expected at end of month
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="p-4 bg-boxed rounded-lg text-center shadow-sm">
          <div className="text-xs text-discret">Weekly Budget</div>
          <div
            className={`text-2xl font-bold ${dashboard.weeklyRemaining >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {dashboard.weeklyRemaining.toFixed(2)}€
            <span className="text-xs text-discret">
              {" "}
              / {dashboard.weeklyBudget}€
            </span>
          </div>
        </div>
        <div className="p-4 bg-boxed rounded-lg text-center shadow-sm">
          <div className="text-xs text-discret">Monthly Income</div>
          <div className="text-2xl font-bold">
            {dashboard.totalIncome.toFixed(2)}€
          </div>
        </div>
        <div className="p-4 bg-boxed rounded-lg text-center shadow-sm">
          <div className="text-xs text-discret">Fixed Expenses</div>
          <div className="text-2xl font-bold text-red-400">
            {dashboard.totalFixed.toFixed(2)}€
          </div>
        </div>
        <div className="p-4 bg-boxed rounded-lg text-center shadow-sm">
          <div className="text-xs text-discret">Savings</div>
          <div className="text-2xl font-bold text-emerald-500">
            {dashboard.totalSavings.toFixed(2)}€
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="px-2 py-2 text-discret rounded hover:bg-contour"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M15 6l-6 6l6 6" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">
          {monthNames[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="px-2 py-2 text-discret rounded hover:bg-contour"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M9 6l6 6l-6 6" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mb-4 text-xs flex-wrap">
        <span>
          <span className="inline-block w-3 h-3 bg-red-400 rounded mr-1"></span>
          Fixed
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-yellow-400 rounded mr-1"></span>
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
      </div>

      {/* Calendar Grid */}
      <table className="w-full border-separate border-spacing-0 table-fixed mb-6 border border-contour rounded-xl overflow-hidden">
        <thead>
          <tr>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <th
                key={d}
                className={`p-2 border-b border-r border-contour text-sm bg-select font-bold last:border-r-0 ${i === 0 ? "rounded-tl-xl" : ""} ${i === 6 ? "rounded-tr-xl" : ""}`}
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
                    className={`border-b border-r border-contour p-1 align-top h-24 text-xs cursor-pointer hover:bg-select transition-colors last:border-r-0 ${wi === Math.ceil(calendarDays.length / 7) - 1 ? "border-b-0" : ""}`}
                    onClick={() => day && handleDayClick(day)}
                  >
                    {day && (
                      <div className="flex flex-col h-full">
                        <div className="font-bold mb-1">{day}</div>
                        <div className="flex-1 overflow-hidden">
                          {getEventsForDay(day)
                            .slice(0, 3)
                            .map((e, i) => (
                              <div
                                key={i}
                                className={`${eventColors[e.type]} px-1 rounded text-[10px] mb-0.5 truncate`}
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
                    )}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setModal({ type: "freeExpense" })}
        >
          + Free Expense
        </button>
        <button
          className="px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500"
          onClick={() => setModal({ type: "fixedExpense" })}
        >
          + Fixed Expense
        </button>
        <button
          className="px-4 py-2 bg-yellow-400 rounded hover:bg-yellow-500"
          onClick={() => setModal({ type: "forecast" })}
        >
          + Forecast
        </button>
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          onClick={() => setModal({ type: "income" })}
        >
          + Income
        </button>
        <button
          className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
          onClick={() => setModal({ type: "savings" })}
        >
          + Savings
        </button>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={() => setModal({ type: "categories" })}
        >
          Categories
        </button>
        <button
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          onClick={() => setModal({ type: "settings" })}
        >
          Settings
        </button>
      </div>

      {/* MODALS */}

      {/* Day Actions Modal */}
      <Modal
        isOpen={modal.type === "dayActions"}
        onClose={closeModal}
        title={`${monthNames[month]} ${modal.data?.day}, ${year}`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() =>
                setModal({
                  type: "freeExpense",
                  data: { day: modal.data?.day },
                })
              }
            >
              + Free
            </button>
            <button
              className="flex-1 px-4 py-2 bg-yellow-400 rounded"
              onClick={() =>
                setModal({ type: "forecast", data: { day: modal.data?.day } })
              }
            >
              + Forecast
            </button>
            <button
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded"
              onClick={() =>
                setModal({ type: "savings", data: { day: modal.data?.day } })
              }
            >
              + Savings
            </button>
          </div>
          <hr className="my-2" />
          <h4 className="font-semibold">Events on this day:</h4>
          {modal.data?.day &&
            getEventsForDay(modal.data.day).map((e, i) => (
              <div
                key={i}
                className={`${eventColors[e.type]} p-3 rounded flex justify-between items-center`}
              >
                <div>
                  <strong>{e.title || e.type}</strong>:{" "}
                  {e.type === "income" || e.type === "savings" ? "+" : "-"}
                  {e.amount}€
                  {e.description && (
                    <div className="text-xs opacity-75">{e.description}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(e.type, e)}
                    className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(e.type, e.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          {modal.data?.day && getEventsForDay(modal.data.day).length === 0 && (
            <p className="text-gray-500">No events</p>
          )}
        </div>
      </Modal>

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

function FreeExpenseForm({
  categories,
  defaultDay,
  year,
  month,
  onSave,
  editData,
}) {
  const defaultDate =
    editData?.date ||
    (defaultDay
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    date: defaultDate,
    categoryId: editData?.categoryId || categories[0]?.id || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.freeExpenses.update(editData.id, data);
    } else {
      await db.freeExpenses.add({
        ...data,
        createdAt: new Date().toISOString(),
      });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="number"
        step="0.01"
        placeholder="Amount (€)"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <select
        value={form.categoryId}
        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        className="w-full p-2 border rounded"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {editData ? "Update" : "Add"} Expense
      </button>
    </form>
  );
}

function FixedExpenseForm({ categories, onSave, editData }) {
  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    dayOfMonth: editData?.dayOfMonth || 1,
    categoryId: editData?.categoryId || categories[0]?.id || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      categoryId: Number(form.categoryId),
      active: true,
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.fixedExpenses.update(editData.id, data);
    } else {
      await db.fixedExpenses.add({
        ...data,
        createdAt: new Date().toISOString(),
      });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="number"
        step="0.01"
        placeholder="Amount (€)"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Title (e.g. Netflix)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="number"
        min="1"
        max="31"
        placeholder="Day of month"
        value={form.dayOfMonth}
        onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <select
        value={form.categoryId}
        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        className="w-full p-2 border rounded"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full p-2 bg-red-400 text-white rounded hover:bg-red-500"
      >
        {editData ? "Update" : "Add"} Fixed Expense
      </button>
    </form>
  );
}

function ForecastForm({
  categories,
  defaultDay,
  year,
  month,
  onSave,
  editData,
}) {
  const defaultDate =
    editData?.date ||
    (defaultDay
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    date: defaultDate,
    categoryId: editData?.categoryId || categories[0]?.id || "",
    deductFrom: editData?.deductFrom || "monthly",
    status: editData?.status || "pending",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.forecasts.update(editData.id, data);
    } else {
      await db.forecasts.add({ ...data, createdAt: new Date().toISOString() });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="number"
        step="0.01"
        placeholder="Estimated amount (€)"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Title (e.g. Haircut)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <select
        value={form.categoryId}
        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        className="w-full p-2 border rounded"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={form.deductFrom}
        onChange={(e) => setForm({ ...form, deductFrom: e.target.value })}
        className="w-full p-2 border rounded"
      >
        <option value="monthly">Deduct from monthly budget</option>
        <option value="weekly">Deduct from weekly budget</option>
      </select>
      {editData && (
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      )}
      <button
        type="submit"
        className="w-full p-2 bg-yellow-400 rounded hover:bg-yellow-500"
      >
        {editData ? "Update" : "Add"} Forecast
      </button>
    </form>
  );
}

function IncomeForm({ onSave, editData }) {
  const [form, setForm] = useState({
    amount: editData?.amount || "",
    title: editData?.title || "",
    description: editData?.description || "",
    date: editData?.date || new Date().toISOString().split("T")[0],
    isRecurring: editData?.isRecurring || false,
    dayOfMonth: editData?.dayOfMonth || 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    const data = {
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.incomes.update(editData.id, data);
    } else {
      await db.incomes.add({ ...data, createdAt: new Date().toISOString() });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="number"
        step="0.01"
        placeholder="Amount (€)"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Title (e.g. Salary)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
        />
        Recurring monthly
      </label>
      {form.isRecurring ? (
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Day of month"
          value={form.dayOfMonth}
          onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
          className="w-full p-2 border rounded"
        />
      ) : (
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full p-2 border rounded"
        />
      )}
      <button
        type="submit"
        className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        {editData ? "Update" : "Add"} Income
      </button>
    </form>
  );
}

function SavingsForm({ defaultDay, year, month, onSave, editData }) {
  const defaultDate =
    editData?.date ||
    (defaultDay
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    amount: editData?.amount || "",
    description: editData?.description || "",
    date: defaultDate,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;

    const data = {
      amount: Number(form.amount),
      description: form.description,
      date: form.date,
      updatedAt: new Date().toISOString(),
    };

    if (editData?.id) {
      await db.savings.update(editData.id, data);
    } else {
      await db.savings.add({ ...data, createdAt: new Date().toISOString() });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="number"
        step="0.01"
        placeholder="Amount (€)"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <button
        type="submit"
        className="w-full p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
      >
        {editData ? "Update" : "Add"} Savings
      </button>
    </form>
  );
}

function CategoriesForm({ categories, onSave }) {
  const [newName, setNewName] = useState("");

  const addCategory = async () => {
    if (!newName.trim()) return;
    await db.categories.add({ name: newName });
    setNewName("");
    onSave();
  };

  const deleteCategory = async (id) => {
    await db.categories.delete(id);
    onSave();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={addCategory}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex justify-between items-center p-2 border-b"
          >
            {c.name}
            <button
              onClick={() => deleteCategory(c.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsForm({ settings, onSave }) {
  const [form, setForm] = useState({
    weeklyBudget: settings?.weeklyBudget || 0,
    weekStartDay: settings?.weekStartDay || 1,
    monthlySavingsTarget: settings?.monthlySavingsTarget || 0,
    overflowStrategy: settings?.overflowStrategy || "next_week",
    surplusStrategy: settings?.surplusStrategy || "savings",
  });

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    await db.settings.put({ id: 1, ...form });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Weekly budget (€)
        </label>
        <input
          type="number"
          value={form.weeklyBudget}
          onChange={(e) =>
            setForm({ ...form, weeklyBudget: Number(e.target.value) })
          }
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Week starts on
        </label>
        <select
          value={form.weekStartDay}
          onChange={(e) =>
            setForm({ ...form, weekStartDay: Number(e.target.value) })
          }
          className="w-full p-2 border rounded"
        >
          {dayNames.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Monthly savings target (€)
        </label>
        <input
          type="number"
          value={form.monthlySavingsTarget}
          onChange={(e) =>
            setForm({ ...form, monthlySavingsTarget: Number(e.target.value) })
          }
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          When you exceed weekly budget
        </label>
        <select
          value={form.overflowStrategy}
          onChange={(e) =>
            setForm({ ...form, overflowStrategy: e.target.value })
          }
          className="w-full p-2 border rounded"
        >
          <option value="next_week">Deduct from next week</option>
          <option value="proportional">Deduct proportionally</option>
          <option value="next_month">Deduct from next month</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          When you have surplus
        </label>
        <select
          value={form.surplusStrategy}
          onChange={(e) =>
            setForm({ ...form, surplusStrategy: e.target.value })
          }
          className="w-full p-2 border rounded"
        >
          <option value="savings">Add to savings</option>
          <option value="next_week">Add to next week</option>
          <option value="distribute">Distribute across weeks</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full p-2 bg-gray-800 text-white rounded hover:bg-gray-900 mt-2"
      >
        Save Settings
      </button>
    </form>
  );
}

export default App;
