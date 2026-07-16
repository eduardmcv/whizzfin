import { useState, useEffect, useMemo, useCallback } from "react";
import db from "./db/database";
import Modal from "./components/Modal";

import MainDashboard from "./components/MainDashboard";
import InputDashboard from "./components/InputDashboard";
import CalendarNavigation from "./components/CalendarNavigation";
import DayActionsModal from "./components/DayActionsModal";
import RulesPanel from "./components/RulesPanel";

import TransactionForm from "./components/forms/TransactionForm";
import CategoriesForm from "./components/forms/CategoriesForm";
import SettingsForm from "./components/forms/SettingsForm";
import WeeklyBudgetForm from "./components/forms/WeeklyBudgetForm";

import {
  formatYearMonth,
  toDateStr,
  todayStr,
  getMonthOccurrences,
  isProjected,
  needsAttention,
  materializeMonth,
  skipMonth,
} from "./lib/rules";

const MONTH_NAMES = [
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

const EVENT_COLORS = {
  fixed: "bg-purple-900/40 text-purple-200",
  forecast: "bg-orange-700/30 text-orange-200",
  casual: "bg-red-900/40 text-red-200",
  income: "bg-blue-900/40 text-blue-200",
  savings: "bg-emerald-900/40 text-emerald-200",
};

const colorKeyOf = (e) => (e.type === "expense" ? e.kind : e.type);

// One banner per type on each calendar day, amounts summed.
const GROUP_ORDER = ["income", "savings", "fixed", "forecast", "casual"];
const groupEvents = (events) => {
  const sums = {};
  events.forEach((e) => {
    const k = colorKeyOf(e);
    if (!sums[k]) sums[k] = { key: k, total: 0, allProjected: true };
    sums[k].total += Number(e.amount);
    if (!e.projected) sums[k].allProjected = false;
  });
  return GROUP_ORDER.filter((k) => sums[k]).map((k) => sums[k]);
};

const fmtAmount = (n) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");

// Calendar geometry (px) used to position the weekly budget circles.
const CAL_HEADER_H = 38;
const CAL_ROW_H = 96; // h-24

function App() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rules, setRules] = useState([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modal, setModal] = useState({ type: null, data: null });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const yearMonth = formatYearMonth(year, month);
  const today = todayStr();

  const loadAllData = useCallback(async () => {
    const [set, cats, txs, rls, weekBud] = await Promise.all([
      db.settings.get(1),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.rules.toArray(),
      db.weeklyBudgets.toArray(),
    ]);
    setSettings(set);
    setCategories(cats);
    setTransactions(txs);
    setRules(rls);
    setWeeklyBudgets(weekBud);
  }, []);

  // Materialize due auto-rules for the viewed month, then load.
  // Safe against double-execution: the unique [ruleId+yearMonth] index
  // makes generation idempotent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await materializeMonth(db, year, month);
      if (!cancelled) await loadAllData();
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, loadAllData]);

  // ---------------------------
  // Derived month data
  // ---------------------------
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.yearMonth === yearMonth),
    [transactions, yearMonth],
  );

  const occurrences = useMemo(
    () => getMonthOccurrences(rules, monthTransactions, year, month),
    [rules, monthTransactions, year, month],
  );

  const projections = useMemo(
    () => occurrences.filter(isProjected),
    [occurrences],
  );

  const pendingRules = occurrences.filter(needsAttention).length;

  // Events per day: real transactions + projected rule occurrences.
  const eventsByDate = useMemo(() => {
    const map = {};
    const push = (date, event) => {
      if (!map[date]) map[date] = [];
      map[date].push(event);
    };
    monthTransactions.forEach((t) => push(t.date, t));
    projections.forEach((occ) => {
      if (!occ.date) return; // manual presets have no date yet
      push(occ.date, {
        type: occ.rule.type,
        kind: occ.rule.type === "expense" ? "fixed" : null,
        title: occ.rule.title,
        amount: occ.amount,
        ruleId: occ.rule.id,
        projected: true,
      });
    });
    return map;
  }, [monthTransactions, projections]);

  const getEventsForDay = (day) =>
    eventsByDate[toDateStr(year, month, day)] || [];

  // ---------------------------
  // Week + budget helpers
  // ---------------------------
  const weekStartDay = settings?.weekStartDay ?? 1;

  const getWeekStart = (date, startDay = 1) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = (d.getDay() - startDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };

  const formatDateStr = (date) =>
    toDateStr(date.getFullYear(), date.getMonth(), date.getDate());

  const getWeekBudget = (weekStartDate) => {
    const weekStartStr = formatDateStr(weekStartDate);
    const custom = weeklyBudgets.find((wb) => wb.weekStart === weekStartStr);
    return custom?.amount ?? (settings?.weeklyBudget || 0);
  };

  // Casual expenses + forecasts marked "weekly" count against the week.
  const getWeekSpent = (weekStartDate) => {
    const startStr = formatDateStr(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    const endStr = formatDateStr(end);

    return transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          (t.kind === "casual" ||
            (t.kind === "forecast" && t.deductFrom === "weekly")) &&
          t.date >= startStr &&
          t.date <= endStr,
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // ---------------------------
  // Dashboard
  // ---------------------------
  const dashboard = useMemo(() => {
    const signOf = (t) => (t.type === "income" ? 1 : -1);

    // Current balance: only facts up to today.
    const currentBalance = monthTransactions
      .filter((t) => t.date <= today)
      .reduce((sum, t) => sum + signOf(t) * t.amount, 0);

    // Projected rule occurrences that haven't materialized yet.
    const projectedByType = { income: 0, expense: 0, savings: 0 };
    projections.forEach((occ) => {
      projectedByType[occ.rule.type] += occ.amount;
    });

    const sumTx = (pred) =>
      monthTransactions.filter(pred).reduce((s, t) => s + t.amount, 0);

    const totalIncome =
      sumTx((t) => t.type === "income") + projectedByType.income;
    const totalSavings =
      sumTx((t) => t.type === "savings") + projectedByType.savings;
    const totalFixed =
      sumTx((t) => t.type === "expense" && t.kind === "fixed") +
      projectedByType.expense;
    const totalExpenses =
      sumTx((t) => t.type === "expense") + projectedByType.expense;

    // Pending forecasts that come out of the monthly balance
    // (weekly ones are already inside the weekly budgets).
    const totalForecasts = sumTx(
      (t) =>
        t.type === "expense" &&
        t.kind === "forecast" &&
        t.deductFrom !== "weekly" &&
        t.date > today,
    );
    const paidForecasts = sumTx(
      (t) =>
        t.type === "expense" &&
        t.kind === "forecast" &&
        t.deductFrom !== "weekly" &&
        t.date <= today,
    );

    // Weeks belonging to the viewed month (week belongs to the month it starts in)
    const weeks = [];
    let ws = getWeekStart(new Date(year, month, 1), weekStartDay);
    if (ws.getMonth() !== month || ws.getFullYear() !== year) {
      ws.setDate(ws.getDate() + 7);
    }
    while (ws.getMonth() === month && ws.getFullYear() === year) {
      weeks.push(new Date(ws));
      ws.setDate(ws.getDate() + 7);
    }

    let totalWeeklyBudgets = 0;
    let totalWeeklySpent = 0;
    let totalOverspending = 0;
    weeks.forEach((weekStart) => {
      const budget = getWeekBudget(weekStart);
      const spent = getWeekSpent(weekStart);
      totalWeeklyBudgets += budget;
      totalWeeklySpent += spent;
      if (spent > budget) totalOverspending += spent - budget;
    });

    const monthEndForecast =
      totalIncome -
      totalSavings -
      totalFixed -
      totalForecasts -
      paidForecasts -
      totalWeeklyBudgets -
      totalOverspending;

    return {
      currentBalance,
      monthEndForecast,
      totalIncome,
      totalExpenses,
      totalFixed,
      totalForecasts,
      totalSavings,
      totalWeeklyBudgets,
      totalWeeklyRemaining: totalWeeklyBudgets - totalWeeklySpent,
      totalOverspending,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthTransactions, projections, weeklyBudgets, settings, year, month]);

  // ---------------------------
  // Calendar layout
  // ---------------------------
  const rawFirstDay = new Date(year, month, 1).getDay();
  const firstDayOfMonth = (rawFirstDay - weekStartDay + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);
  const weekCount = Math.ceil(calendarDays.length / 7);

  const getDayNames = () => {
    const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, i) => allDays[(weekStartDay + i) % 7]);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // ---------------------------
  // Handlers
  // ---------------------------
  const closeModal = () => {
    setModal({ type: null, data: null });
    loadAllData();
  };

  const handleEditEvent = (event) => {
    setModal({ type: "editTransaction", data: event });
  };

  const handleDeleteEvent = async (event) => {
    if (event.ruleId != null) {
      const rule = rules.find((r) => r.id === event.ruleId);
      if (
        !confirm(
          "This entry was generated by a rule. Deleting it skips the rule for this month (you can undo it from the Rules panel).",
        )
      )
        return;
      if (rule) {
        await skipMonth(db, rule, event.yearMonth);
      } else {
        await db.transactions.delete(event.id);
      }
    } else {
      if (!confirm("Delete this entry?")) return;
      await db.transactions.delete(event.id);
    }
    loadAllData();
  };

  const addModalType = {
    addIncome: "income",
    addExpense: "expense",
    addSavings: "savings",
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8 text-text">
        Whizzfin
      </h1>

      <CalendarNavigation
        month={month}
        year={year}
        monthNames={MONTH_NAMES}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      <MainDashboard data={dashboard} />

      {/* Calendar + floating weekly budget circles */}
      <div className="relative mb-6">
        <div className="border border-border rounded-xl overflow-hidden">
          <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr>
                {getDayNames().map((d, i) => {
                  const actualDay = (weekStartDay + i) % 7;
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
              {Array.from({ length: weekCount }).map((_, wi) => {
                const weekDays = calendarDays.slice(wi * 7, (wi + 1) * 7);
                const isLastRow = wi === weekCount - 1;

                return (
                  <tr key={wi}>
                    {weekDays.map((day, di) => {
                      const isToday =
                        day && toDateStr(year, month, day) === today;
                      const actualDay = (weekStartDay + di) % 7;
                      const isSunday = actualDay === 0;
                      const groups = day
                        ? groupEvents(getEventsForDay(day))
                        : [];

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
                          onClick={() =>
                            day && setModal({ type: "dayActions", data: { day } })
                          }
                        >
                          {day ? (
                            <div className="flex flex-col h-full">
                              <div
                                className={`font-bold nr-300 mb-1 text-center ${isToday ? "text-blue-8" : ""}`}
                              >
                                {day}
                              </div>

                              <div className="gap-1 overflow-hidden">
                                {groups.slice(0, 3).map((g) => (
                                  <div
                                    key={g.key}
                                    className={`${EVENT_COLORS[g.key]} px-1 py-0.25 rounded nr-300 text-[11px] mb-0.75 truncate ${
                                      g.allProjected ? "opacity-60" : ""
                                    }`}
                                  >
                                    {g.key === "income" ? "+" : "-"}
                                    {fmtAmount(g.total)}€
                                  </div>
                                ))}

                                {groups.length > 3 && (
                                  <div className="text-gray-400 text-[10px] mt-1">
                                    +{groups.length - 3} more
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
              })}
            </tbody>
          </table>
        </div>

        {/* Weekly budget circles: half over the calendar edge */}
        {Array.from({ length: weekCount }).map((_, wi) => {
          const weekDays = calendarDays.slice(wi * 7, (wi + 1) * 7);
          const firstDayOfWeek = weekDays.find((d) => d !== null);
          if (!firstDayOfWeek) return null;
          const weekStartDate = getWeekStart(
            new Date(year, month, firstDayOfWeek),
            weekStartDay,
          );
          const weekBudget = getWeekBudget(weekStartDate);
          const weekRemaining = weekBudget - getWeekSpent(weekStartDate);
          const negative = weekRemaining < 0;

          return (
            <button
              key={wi}
              onClick={() =>
                setModal({
                  type: "weeklyBudget",
                  data: {
                    weekStart: formatDateStr(weekStartDate),
                    currentBudget: weekBudget,
                  },
                })
              }
              title={`Weekly budget: ${weekBudget}€`}
              className={`absolute z-10 w-12 h-12 rounded-full flex items-center justify-center
                nr-500 text-xs font-bold cursor-pointer backdrop-blur-md border transition-colors
                ${
                  negative
                    ? "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
                    : "bg-white/[0.04] border-white/10 text-gray-11 hover:bg-white/10"
                }`}
              style={{
                top: `${CAL_HEADER_H + wi * CAL_ROW_H + CAL_ROW_H / 2}px`,
                right: 0,
                transform: "translate(45%, -50%)",
              }}
            >
              {fmtAmount(Math.round(weekRemaining))}€
            </button>
          );
        })}
      </div>

      <InputDashboard
        data={dashboard}
        onOpenModal={(type, data) => setModal({ type, data })}
        pendingRules={pendingRules}
      />

      <DayActionsModal
        isOpen={modal.type === "dayActions"}
        onClose={closeModal}
        day={modal.data?.day}
        month={month}
        year={year}
        monthNames={MONTH_NAMES}
        events={modal.data?.day ? getEventsForDay(modal.data.day) : []}
        eventColors={EVENT_COLORS}
        onOpenModal={(type, data) => setModal({ type, data })}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Add transaction modals */}
      {Object.entries(addModalType).map(([modalType, txType]) => (
        <Modal
          key={modalType}
          isOpen={modal.type === modalType}
          onClose={closeModal}
          title={`Add ${txType === "income" ? "Income" : txType === "expense" ? "Expense" : "Savings"}`}
        >
          <TransactionForm
            type={txType}
            categories={categories}
            defaultDay={modal.data?.day}
            year={year}
            month={month}
            onSave={closeModal}
            onCategoriesChanged={loadAllData}
          />
        </Modal>
      ))}

      {/* Edit transaction */}
      <Modal
        isOpen={modal.type === "editTransaction"}
        onClose={closeModal}
        title="Edit entry"
      >
        {modal.data && (
          <TransactionForm
            type={modal.data.type}
            categories={categories}
            year={year}
            month={month}
            editData={modal.data}
            onSave={closeModal}
            onCategoriesChanged={loadAllData}
          />
        )}
      </Modal>

      {/* Edit rule */}
      <Modal
        isOpen={modal.type === "editRule"}
        onClose={closeModal}
        title="Edit rule"
      >
        {modal.data && (
          <TransactionForm
            type={modal.data.type}
            categories={categories}
            year={year}
            month={month}
            editRule={modal.data}
            onSave={closeModal}
            onCategoriesChanged={loadAllData}
          />
        )}
      </Modal>

      <Modal
        isOpen={modal.type === "categories"}
        onClose={closeModal}
        title="Manage Categories"
      >
        <CategoriesForm
          categories={categories}
          onSave={closeModal}
          onChanged={loadAllData}
        />
      </Modal>

      <Modal
        isOpen={modal.type === "settings"}
        onClose={closeModal}
        title="Settings"
      >
        <SettingsForm settings={settings} onSave={closeModal} />
      </Modal>

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

      <RulesPanel
        isOpen={modal.type === "rules"}
        onClose={closeModal}
        rules={rules}
        transactions={transactions}
        categories={categories}
        year={year}
        month={month}
        onUpdate={loadAllData}
        onEditRule={(rule) => setModal({ type: "editRule", data: rule })}
      />
    </div>
  );
}

export default App;
