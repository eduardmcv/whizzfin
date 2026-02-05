import { useState } from "react";
import db from "../db/database";
import { formatYearMonth } from "../lib/recurring";

function WeekView({
  weekStartDay,
  settings,
  freeExpenses,
  forecasts,
  fixedExpenses,
  incomes,
  savings,
  weeklyBudgets,
  weeklyBudgetAssignments,
  recurringInstances,
  eventColors,
  onDayClick,
  onEditWeeklyBudget,
  onReload,
  currentWeekStart,
  onWeekChange,
  getEventsForDate,
}) {
  const [showAssignmentMenu, setShowAssignmentMenu] = useState(false);

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Get week end
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Build 7 days array
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  // Check if week crosses months
  const startsInMonth = currentWeekStart.getMonth();
  const endsInMonth = weekEnd.getMonth();
  const crossesMonths = startsInMonth !== endsInMonth;

  // Get assignment for this week
  const weekStartStr = formatDateStr(currentWeekStart);
  const assignment = weeklyBudgetAssignments.find(
    (a) => a.weekStart === weekStartStr,
  );

  // Calculate week budget and spent
  const getWeekBudget = () => {
    const customBudget = weeklyBudgets.find(
      (wb) => wb.weekStart === weekStartStr,
    );
    return customBudget?.amount ?? (settings?.weeklyBudget || 0);
  };

  const getWeekSpent = () => {
    const weekEndTime = new Date(currentWeekStart);
    weekEndTime.setDate(weekEndTime.getDate() + 6);
    weekEndTime.setHours(23, 59, 59, 999);

    const freeSpent = freeExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= currentWeekStart && d <= weekEndTime;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const forecastSpent = forecasts
      .filter((f) => {
        if (f.deductFrom !== "weekly") return false;
        const d = new Date(f.date);
        return d >= currentWeekStart && d <= weekEndTime;
      })
      .reduce((sum, f) => sum + f.amount, 0);

    return freeSpent + forecastSpent;
  };

  const weekBudget = getWeekBudget();
  const weekSpent = getWeekSpent();
  const weekRemaining = weekBudget - weekSpent;

  // Navigation
  const prevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    onWeekChange(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    onWeekChange(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = (currentDay - weekStartDay + 7) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    onWeekChange(start);
  };

  // Month assignment
  const handleAssignMonth = async (targetMonth) => {
    const existing = await db.weeklyBudgetAssignments
      .where("weekStart")
      .equals(weekStartStr)
      .first();

    if (existing) {
      await db.weeklyBudgetAssignments.update(existing.id, {
        assignedMonth: targetMonth,
      });
    } else {
      await db.weeklyBudgetAssignments.add({
        weekStart: weekStartStr,
        assignedMonth: targetMonth,
      });
    }

    setShowAssignmentMenu(false);
    onReload();
  };

  const getMonthName = (date) => {
    const names = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${names[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatWeekRange = () => {
    const startDay = currentWeekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = currentWeekStart.toLocaleDateString("en", {
      month: "short",
    });
    const endMonth = weekEnd.toLocaleDateString("en", { month: "short" });

    if (startsInMonth === endsInMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col gap-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <span className="text-xl">←</span>
        </button>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={goToCurrentWeek}
            className="text-xl font-bold text-text hover:text-blue-6 transition-colors"
          >
            {formatWeekRange()}
          </button>

          {/* Cross-month indicator */}
          {crossesMonths && (
            <div className="relative">
              <button
                onClick={() => setShowAssignmentMenu(!showAssignmentMenu)}
                className="text-xs px-3 py-1 bg-amber-900/30 text-amber-300 rounded-full hover:bg-amber-900/50 transition-colors"
              >
                {assignment
                  ? `Budget → ${assignment.assignedMonth}`
                  : "Cross-month · Assign budget"}
              </button>

              {showAssignmentMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-surface border border-border rounded-lg shadow-lg z-20 min-w-[180px]">
                  <div className="p-2 text-xs text-text-muted border-b border-border text-center">
                    Assign this week's budget to:
                  </div>
                  <button
                    onClick={() =>
                      handleAssignMonth(
                        formatYearMonth(
                          currentWeekStart.getFullYear(),
                          currentWeekStart.getMonth(),
                        ),
                      )
                    }
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-3 transition-colors"
                  >
                    {getMonthName(currentWeekStart)}
                  </button>
                  <button
                    onClick={() =>
                      handleAssignMonth(
                        formatYearMonth(
                          weekEnd.getFullYear(),
                          weekEnd.getMonth(),
                        ),
                      )
                    }
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-3 transition-colors"
                  >
                    {getMonthName(weekEnd)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={nextWeek}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <span className="text-xl">→</span>
        </button>
      </div>

      {/* Budget Header */}
      <div
        className="flex items-center justify-center gap-4 p-4 bg-surface/50 rounded-xl cursor-pointer hover:bg-surface transition-colors"
        onClick={() => onEditWeeklyBudget(weekStartStr, weekBudget)}
      >
        <div className="text-center">
          <div className="text-xs text-text-muted mb-1">Weekly Budget</div>
          <div className="flex items-baseline gap-2 justify-center">
            <span
              className={`text-3xl nr-600 font-bold ${
                weekRemaining < 0 ? "text-red-400" : "text-text"
              }`}
            >
              {weekRemaining.toFixed(0)}€
            </span>
            <span className="text-text-muted">/ {weekBudget}€</span>
          </div>
          <div className="text-xs text-text-muted mt-1">
            Spent: {weekSpent.toFixed(0)}€
          </div>
        </div>
      </div>

      {/* Days Grid - 7 vertical columns */}
      <div className="grid grid-cols-7 gap-1 border border-border rounded-xl overflow-hidden">
        {days.map((day, i) => {
          const dateStr = formatDateStr(day);
          const dayOfMonth = day.getDate();
          const isSunday = day.getDay() === 0;
          const todayClass = isToday(day);

          // Get events for this date
          const dayEvents = getEventsForDate(dateStr);

          return (
            <div
              key={i}
              className={`
                flex flex-col min-h-[280px]
                ${todayClass ? "bg-blue-2" : isSunday ? "bg-red-900/10" : "bg-background"}
                ${i < 6 ? "border-r border-border" : ""}
                cursor-pointer hover:bg-blue-3 transition-colors
              `}
              onClick={() => onDayClick(day)}
            >
              {/* Day Header */}
              <div
                className={`
                  p-2 text-center border-b border-border
                  ${todayClass ? "bg-blue-3" : "bg-surface/50"}
                `}
              >
                <div
                  className={`text-xs font-medium ${
                    todayClass ? "text-blue-8" : "text-text-muted"
                  }`}
                >
                  {dayNames[day.getDay()]}
                </div>
                <div
                  className={`text-2xl nr-500 font-bold ${
                    todayClass ? "text-blue-8" : "text-text"
                  }`}
                >
                  {dayOfMonth}
                </div>
              </div>

              {/* Events */}
              <div className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
                {dayEvents.map((e, idx) => (
                  <div
                    key={idx}
                    className={`${eventColors[e.type]} px-2 py-1.5 rounded text-xs nr-400`}
                  >
                    <div className="font-medium truncate">
                      {e.type === "income" || e.type === "savings" ? "+" : "-"}
                      {e.amount}€
                    </div>
                    {e.name && (
                      <div className="text-[10px] opacity-80 truncate">
                        {e.name}
                      </div>
                    )}
                  </div>
                ))}

                {dayEvents.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-text-muted/30 text-xs">
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekView;
