function InputDashboard({ data, onOpenModal }) {
  return (
    <div className="grid grid-cols-6 md:grid-cols-6 gap-4 mb-8">
      {/* Income - Blue */}
      <button
        onClick={() => onOpenModal("income")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm col-span-3"
      >
        <div className="text-xs text-text-muted">Monthly Income</div>
        <div className="nr-500 text-xl font-semibold text-blue-300">
          {data.totalIncome.toFixed(2)}€
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-blue-9 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
        </div>
      </button>

      {/* Savings - Emerald */}
      <button
        onClick={() => onOpenModal("savings")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm col-span-3"
      >
        <div className="text-xs text-text-muted">Savings</div>
        <div className="nr-500 text-xl font-semibold text-emerald-300">
          {data.totalSavings.toFixed(2)}€
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-emerald-600 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
        </div>
      </button>

      {/* Forecast - Orange */}
      <button
        onClick={() => onOpenModal("forecast")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm col-span-2"
      >
        <div className="text-xs text-text-muted">Forecasts</div>
        <div className="nr-500 text-xl font-semibold text-orange-300">
          {data.totalForecasts.toFixed(2)}€
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-orange-500 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
        </div>
      </button>

      {/* Fixed Expenses - Purple */}
      <button
        onClick={() => onOpenModal("fixedExpense")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm col-span-2"
      >
        <div className="text-xs text-text-muted">Fixed Expenses</div>
        <div className="nr-500 text-xl font-semibold text-purple-400">
          {data.totalFixed.toFixed(2)}€
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-purple-500 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
        </div>
      </button>

      {/* Weekly Budgets - Red - Similar to main dashboard style */}
      <button
        onClick={() => onOpenModal("freeExpense")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-red-950/30 border-red-900/50 border rounded-lg text-center shadow-sm col-span-2"
      >
        <div className="text-xs text-text-muted">Weekly Budgets</div>
        <div
          className={`nr-500 text-xl font-semibold ${data.totalWeeklyRemaining >= 0 ? "text-text" : "text-red-400"}`}
        >
          {data.totalWeeklyRemaining.toFixed(2)}€
        </div>
        <div className="nr-500 text-xs text-text-muted">
          / {data.totalWeeklyBudgets.toFixed(0)}€
        </div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-red-500 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
        </div>
      </button>

      {/* Categories - Gray */}
      <button
        onClick={() => onOpenModal("categories")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm col-span-2"
      >
        <div className="text-xs text-text-muted">Manage</div>
        <div className="text-xl font-semibold text-gray-11">Categories</div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-gray-4 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 4h6v6h-6z" />
            <path d="M14 4h6v6h-6z" />
            <path d="M4 14h6v6h-6z" />
            <path d="M14 14h6v6h-6z" />
          </svg>
        </div>
      </button>

      {/* Settings - Gray */}
      <button
        onClick={() => onOpenModal("settings")}
        className="cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm col-span-2"
      >
        <div className="text-xs text-text-muted">Configure</div>
        <div className="text-xl font-semibold text-gray-11">Settings</div>
        <div
          className="absolute -bottom-1.5 -right-1.5 p-2 bg-gray-4 rounded-4xl 
          transition-all duration-300 ease-in-out
          group-hover:bottom-0 group-hover:right-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
            <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
          </svg>
        </div>
      </button>

      {/* Current Balance - No button */}
      <div className="p-4 bg-surface/50 rounded-lg text-center shadow-sm col-span-2">
        <div className="text-xs text-text-muted">Current Balance</div>
        <div
          className={`nr-500 text-xl font-semibold ${data.currentBalance >= 0 ? "text-text" : "text-red-500"}`}
        >
          {data.currentBalance.toFixed(2)}€
        </div>
      </div>
    </div>
  );
}

export default InputDashboard;
