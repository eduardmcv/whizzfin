function EventCard({ event, eventColors, onEdit, onDelete }) {
  const isPositive = event.type === "income" || event.type === "savings";

  return (
    <div
      className={`${eventColors[event.type]} p-3 rounded flex justify-between items-center`}
    >
      <div>
        <strong>{event.title || event.type}</strong>: {isPositive ? "+" : "-"}
        {event.amount}€
        {event.description && (
          <div className="text-xs opacity-75">{event.description}</div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(event.type, event)}
          className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(event.type, event.id)}
          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default EventCard;
