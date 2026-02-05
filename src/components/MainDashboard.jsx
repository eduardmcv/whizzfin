function Dashboard({ data }) {
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

  const monthLabel =
    data.dashYear && data.dashMonth !== undefined
      ? `${monthNames[data.dashMonth]} ${data.dashYear}`
      : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      {/* Main metrics */}

      <div className="p-4 bg-surface/50  rounded-lg text-center shadow-sm col-span-2">
        <div className="text-xs text-text-muted">Current Balance</div>
        <div
          className={`text-3xl nr-600 font-bold ${data.currentBalance >= 0 ? "text-text" : "text-red-500"}`}
        >
          {data.currentBalance.toFixed(2)}€
        </div>
      </div>

      <div className="p-4 bg-blue-2 border-blue-6 border rounded-lg text-center shadow-sm col-span-2">
        <div className="text-xs text-text-muted">
          {monthLabel ? `${monthLabel} Forecast` : "Month-End Forecast"}
        </div>
        <div
          className={`text-3xl nr-600 font-bold ${data.monthEndForecast >= 0 ? "text-text" : "text-red-500"}`}
        >
          {data.monthEndForecast.toFixed(2)}€
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
