function CalendarNavigation({
  month,
  year,
  monthNames,
  onPrevMonth,
  onNextMonth,
}) {
  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <button
        onClick={onPrevMonth}
        className="px-2 py-2 text-text-muted rounded hover:bg-blue-3"
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
      <h2 className="text-text-muted text-xl font-semibold">
        {monthNames[month]} {year}
      </h2>
      <button
        onClick={onNextMonth}
        className="px-2 py-2 text-text-muted rounded hover:bg-blue-3"
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
  );
}

export default CalendarNavigation;
