function Dashboard({ data }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      {/* Main metrics */}

      <div className="p-4 bg-surface/50  rounded-lg text-center shadow-sm col-span-2">
        <div className="text-xs text-text-muted">Month-End Forecast</div>
        <div
          className={`text-3xl nr-700 font-bold ${data.monthEndForecast >= 0 ? "text-text" : "text-red-500"}`}
        >
          {data.monthEndForecast.toFixed(2)}€
        </div>
      </div>

      <div className="p-4 bg-blue-2 border-blue-6 border rounded-lg text-center shadow-sm col-span-2">
        <div className="text-xs text-text-muted">Weekly Budget</div>
        <div
          className={`text-3xl nr-700 font-bold ${data.weeklyRemaining >= 0 ? "text-text" : "text-red-500"}`}
        >
          {data.weeklyRemaining.toFixed(2)}€
          <span className="text-sm font-normal text-text-muted">
            {" "}
            / {data.weeklyBudget}€
          </span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
