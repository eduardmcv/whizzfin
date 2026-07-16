const PLUS_ICON = (
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
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
  </svg>
);

function Card({ onClick, topText, mainText, mainClass, iconBg, icon, span }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer group relative overflow-hidden p-4 bg-surface rounded-lg text-center shadow-sm ${span}`}
    >
      <div className="text-xs text-text-muted">{topText}</div>
      <div className={`text-xl font-semibold ${mainClass}`}>{mainText}</div>
      <div
        className={`absolute -bottom-1.5 -right-1.5 p-2 ${iconBg} rounded-4xl
        transition-all duration-300 ease-in-out
        group-hover:bottom-0 group-hover:right-0`}
      >
        {icon}
      </div>
    </button>
  );
}

function InputDashboard({ data, onOpenModal, pendingRules }) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="grid grid-cols-6 gap-4">
        {/* Add buttons */}
        <Card
          span="col-span-2"
          onClick={() => onOpenModal("addIncome")}
          topText="Income"
          mainText={
            <span className="nr-500 text-blue-300">
              {data.totalIncome.toFixed(2)}€
            </span>
          }
          iconBg="bg-blue-9"
          icon={PLUS_ICON}
        />

        <Card
          span="col-span-2"
          onClick={() => onOpenModal("addExpense")}
          topText="Expenses"
          mainText={
            <span className="nr-500 text-red-300">
              {data.totalExpenses.toFixed(2)}€
            </span>
          }
          iconBg="bg-red-500"
          icon={PLUS_ICON}
        />

        <Card
          span="col-span-2"
          onClick={() => onOpenModal("addSavings")}
          topText="Savings"
          mainText={
            <span className="nr-500 text-emerald-300">
              {data.totalSavings.toFixed(2)}€
            </span>
          }
          iconBg="bg-emerald-600"
          icon={PLUS_ICON}
        />

        {/* Weekly budgets summary */}
        <button
          onClick={() => onOpenModal("settings")}
          className="cursor-pointer group relative overflow-hidden p-4 bg-red-950/30 border-red-900/50 border rounded-lg text-center shadow-sm col-span-3"
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
        </button>

        {/* Rules */}
        <Card
          span="col-span-3"
          onClick={() => onOpenModal("rules")}
          topText={
            pendingRules > 0
              ? `${pendingRules} pending`
              : "Automations"
          }
          mainText={
            <span className="text-gray-11 flex items-center justify-center gap-2">
              Rules
              {pendingRules > 0 && (
                <span className="text-xs bg-orange-700/50 text-orange-200 rounded-full px-2 py-0.5">
                  {pendingRules}
                </span>
              )}
            </span>
          }
          iconBg="bg-gray-4"
          icon={
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
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3" />
              <path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3" />
            </svg>
          }
        />

        {/* Categories */}
        <Card
          span="col-span-3"
          onClick={() => onOpenModal("categories")}
          topText="Manage"
          mainText={<span className="text-gray-11">Categories</span>}
          iconBg="bg-gray-4"
          icon={
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
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 4h6v6h-6z" />
              <path d="M14 4h6v6h-6z" />
              <path d="M4 14h6v6h-6z" />
              <path d="M14 14h6v6h-6z" />
            </svg>
          }
        />

        {/* Settings */}
        <Card
          span="col-span-3"
          onClick={() => onOpenModal("settings")}
          topText="Configure"
          mainText={<span className="text-gray-11">Settings</span>}
          iconBg="bg-gray-4"
          icon={
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
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
              <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

export default InputDashboard;
