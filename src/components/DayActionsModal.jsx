import Modal from "./Modal";
import EventCard from "./EventCard";

function DayActionsModal({
  isOpen,
  onClose,
  day,
  month,
  year,
  monthNames,
  events,
  eventColors,
  onOpenModal,
  onEdit,
  onDelete,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${monthNames[month]} ${day}, ${year}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer transition-colors"
            onClick={() => onOpenModal("addIncome", { day })}
          >
            + Income
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 cursor-pointer transition-colors"
            onClick={() => onOpenModal("addExpense", { day })}
          >
            + Expense
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer transition-colors"
            onClick={() => onOpenModal("addSavings", { day })}
          >
            + Savings
          </button>
        </div>
        <hr className="my-2 border-border" />
        <h4 className="font-semibold text-text">Events on this day:</h4>
        {events.length > 0 ? (
          events.map((e, i) => (
            <EventCard
              key={e.id ?? `p-${i}`}
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
