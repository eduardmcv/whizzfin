function EventCard({ event, eventColors, onEdit, onDelete }) {
  const isPositive = event.type === "income";
  const colorKey = event.type === "expense" ? event.kind : event.type;

  return (
    <div
      className={`${eventColors[colorKey]} p-3.5 rounded-lg flex justify-between items-center gap-3 ${
        event.projected ? "opacity-70 border border-dashed border-current" : ""
      }`}
    >
      <div className="min-w-0">
        <strong>{event.title || colorKey}</strong>:{" "}
        {isPositive ? "+" : "-"}
        {Number(event.amount).toFixed(2)}€
        {event.ruleId != null && (
          <span className="ml-2 text-[10px] uppercase tracking-wide opacity-75">
            rule
          </span>
        )}
        {event.projected && (
          <span className="ml-2 text-[10px] uppercase tracking-wide opacity-75">
            upcoming
          </span>
        )}
        {event.description && (
          <div className="text-xs opacity-75 truncate">{event.description}</div>
        )}
      </div>
      {!event.projected && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onEdit(event)}
            className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(event)}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default EventCard;
