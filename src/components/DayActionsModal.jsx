import Modal from "./Modal";
import EventCard from "./EventCard";

function DayActionsModal({
  isOpen,
  onClose,
  day,
  month,
  year,
  fullDate, // Optional: full Date object for week view
  monthNames,
  events,
  eventColors,
  onOpenModal,
  onEdit,
  onDelete,
}) {
  // Use fullDate if provided (from week view), otherwise use day/month/year
  const displayYear = fullDate ? fullDate.getFullYear() : year;
  const displayMonth = fullDate ? fullDate.getMonth() : month;
  const displayDay = fullDate ? fullDate.getDate() : day;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${monthNames[displayMonth]} ${displayDay}, ${displayYear}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() =>
              onOpenModal("freeExpense", { day: displayDay, fullDate })
            }
          >
            + Free
          </button>
          <button
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            onClick={() =>
              onOpenModal("forecast", { day: displayDay, fullDate })
            }
          >
            + Forecast
          </button>
          <button
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            onClick={() =>
              onOpenModal("savings", { day: displayDay, fullDate })
            }
          >
            + Savings
          </button>
        </div>
        <hr className="my-2 border-border" />
        <h4 className="font-semibold text-text">Events on this day:</h4>
        {events.length > 0 ? (
          events.map((e, i) => (
            <EventCard
              key={i}
              event={e}
              eventColors={eventColors}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        ) : (
          <p className="text-text-muted">No events</p>
        )}
      </div>
    </Modal>
  );
}

export default DayActionsModal;
