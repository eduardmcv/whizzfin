import { useState } from "react";
import db from "../db/database";
import { formatYearMonth } from "../lib/recurring";

function PendingAssignmentsModal({
  isOpen,
  onClose,
  recurringItems,
  year,
  month,
  onUpdate,
  onEditTemplate,
}) {
  if (!isOpen) return null;

  const yearMonth = formatYearMonth(year, month);
  const today = new Date().toISOString().split("T")[0];

  // Split items into groups
  const pendingItems = recurringItems.filter(
    (item) => item.status === "pending",
  );
  const assignedItems = recurringItems.filter(
    (item) => item.status === "assigned",
  );
  const skippedItems = recurringItems.filter(
    (item) => item.status === "skipped",
  );

  const handleAssign = async (item, assignedDate, actualAmount) => {
    const instanceData = {
      parentId: item.id,
      parentType: item.parentType,
      yearMonth,
      assignedDate,
      actualAmount: Number(actualAmount),
      status: "assigned",
      updatedAt: new Date().toISOString(),
    };

    if (item.instance?.id) {
      await db.recurringInstances.update(item.instance.id, instanceData);
    } else {
      await db.recurringInstances.add({
        ...instanceData,
        createdAt: new Date().toISOString(),
      });
    }

    onUpdate();
  };

  const handleUnassign = async (item) => {
    // Only allow unassign if instance was manually created (not auto-completed)
    if (item.instance?.id) {
      // If it's a fixed day item, delete the instance to revert to template
      if (item.dateType === "fixed") {
        await db.recurringInstances.delete(item.instance.id);
      } else {
        await db.recurringInstances.update(item.instance.id, {
          assignedDate: null,
          status: "pending",
          updatedAt: new Date().toISOString(),
        });
      }
    }
    onUpdate();
  };

  const handleSkip = async (item) => {
    const instanceData = {
      parentId: item.id,
      parentType: item.parentType,
      yearMonth,
      assignedDate: null,
      actualAmount: 0,
      status: "skipped",
      updatedAt: new Date().toISOString(),
    };

    if (item.instance?.id) {
      await db.recurringInstances.update(item.instance.id, instanceData);
    } else {
      await db.recurringInstances.add({
        ...instanceData,
        createdAt: new Date().toISOString(),
      });
    }

    onUpdate();
  };

  const handleUnskip = async (item) => {
    if (item.instance?.id) {
      if (item.dateType === "fixed") {
        await db.recurringInstances.delete(item.instance.id);
      } else {
        await db.recurringInstances.update(item.instance.id, {
          status: "pending",
          updatedAt: new Date().toISOString(),
        });
      }
      onUpdate();
    }
  };

  const getTypeColor = (parentType) => {
    switch (parentType) {
      case "income":
        return "text-blue-400";
      case "fixedExpense":
        return "text-purple-400";
      case "savings":
        return "text-emerald-400";
      default:
        return "text-text";
    }
  };

  const getTypeLabel = (parentType) => {
    switch (parentType) {
      case "income":
        return "Income";
      case "fixedExpense":
        return "Fixed Expense";
      case "savings":
        return "Savings";
      default:
        return "";
    }
  };

  const hasNoItems =
    pendingItems.length === 0 &&
    assignedItems.length === 0 &&
    skippedItems.length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text">Recurring Items</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {hasNoItems ? (
            <p className="text-text-muted text-center py-8">
              No recurring items for this month.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Pending items first */}
              {pendingItems.length > 0 && (
                <>
                  <p className="text-xs text-text-muted">Pending assignment</p>
                  {pendingItems.map((item) => (
                    <AssignmentCard
                      key={`${item.parentType}-${item.id}`}
                      item={item}
                      today={today}
                      getTypeColor={getTypeColor}
                      getTypeLabel={getTypeLabel}
                      onAssign={handleAssign}
                      onUnassign={handleUnassign}
                      onSkip={handleSkip}
                      onEditTemplate={onEditTemplate}
                    />
                  ))}
                </>
              )}

              {/* Assigned items */}
              {assignedItems.length > 0 && (
                <>
                  {pendingItems.length > 0 && (
                    <div className="border-t border-border mt-2 pt-4" />
                  )}
                  <p className="text-xs text-text-muted">Assigned</p>
                  {assignedItems.map((item) => (
                    <div key={`${item.parentType}-${item.id}`}>
                      <AssignmentCard
                        item={item}
                        today={today}
                        getTypeColor={getTypeColor}
                        getTypeLabel={getTypeLabel}
                        onAssign={handleAssign}
                        onUnassign={handleUnassign}
                        onSkip={handleSkip}
                        onEditTemplate={onEditTemplate}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Skipped items section */}
              {skippedItems.length > 0 && (
                <>
                  <div className="border-t border-border mt-2 pt-4">
                    <p className="text-xs text-text-muted mb-3">
                      Skipped this month
                    </p>
                  </div>
                  {skippedItems.map((item) => (
                    <div
                      key={`${item.parentType}-${item.id}`}
                      className="p-3 bg-surface/30 rounded-lg opacity-40"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-text line-through">
                              {item.title || item.description || "Untitled"}
                            </span>
                            <span
                              className={`text-xs ${getTypeColor(item.parentType)}`}
                            >
                              {getTypeLabel(item.parentType)}
                            </span>
                          </div>
                          <div className="text-sm text-text-muted">
                            {item.baseAmount?.toFixed(2) ||
                              item.amount?.toFixed(2)}
                            €
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onEditTemplate(item)}
                          className="px-3 py-1 text-sm border border-border rounded hover:bg-surface text-text-muted"
                        >
                          Edit template
                        </button>
                        <button
                          onClick={() => handleUnskip(item)}
                          className="px-3 py-1 text-sm border border-border rounded hover:bg-surface text-text-muted"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignmentCard({
  item,
  today,
  getTypeColor,
  getTypeLabel,
  onAssign,
  onUnassign,
  onSkip,
  onEditTemplate,
}) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [date, setDate] = useState(item.assignedDate || today);
  const [amount, setAmount] = useState(
    item.actualAmount || item.baseAmount || item.amount || "",
  );

  const handleSave = () => {
    onAssign(item, date, amount);
    setIsAdjusting(false);
  };

  const handleCancel = () => {
    setDate(item.assignedDate || today);
    setAmount(item.actualAmount || item.baseAmount || item.amount || "");
    setIsAdjusting(false);
  };

  const isAssigned = item.status === "assigned";
  const isPending = item.status === "pending";

  // Check if this instance was manually modified (has an instance record)
  const isManuallyModified = !!item.instance?.id;

  return (
    <div className="p-3 bg-surface rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-text font-medium">
              {item.title || item.description || "Untitled"}
            </span>
            <span className={`text-xs ${getTypeColor(item.parentType)}`}>
              {getTypeLabel(item.parentType)}
            </span>
          </div>
          <div className="text-sm text-text-muted">
            Base: {item.baseAmount?.toFixed(2) || item.amount?.toFixed(2)}€
            {item.dateType === "fixed" && ` · Day ${item.dayOfMonth}`}
            {item.dateType === "unassigned" && ` · Unassigned`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAssigned && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
              Assigned
            </span>
          )}
          {isPending && (
            <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
              Pending
            </span>
          )}
        </div>
      </div>

      {isAdjusting ? (
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 p-2 text-sm border border-border rounded bg-background text-text"
            />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-28 p-2 text-sm border border-border rounded bg-background text-text"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 p-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-sm border border-border rounded hover:bg-surface text-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {/* Show current assignment info if assigned */}
          {isAssigned && (
            <div className="text-sm text-text-muted mb-1">
              {item.assignedDate} · {item.actualAmount?.toFixed(2)}€
              {isManuallyModified && (
                <span className="text-xs text-blue-400 ml-2">(adjusted)</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onEditTemplate(item)}
              className="px-3 py-1.5 text-sm border border-border rounded hover:bg-surface text-text-muted"
            >
              Edit template
            </button>

            {isAssigned ? (
              <>
                <button
                  onClick={() => setIsAdjusting(true)}
                  className="px-3 py-1.5 text-sm border border-border rounded hover:bg-surface text-text-muted"
                >
                  Adjust this month
                </button>
                {isManuallyModified && (
                  <button
                    onClick={() => onUnassign(item)}
                    className="px-3 py-1.5 text-sm border border-border rounded hover:bg-surface text-text-muted"
                  >
                    Reset to template
                  </button>
                )}
                <button
                  onClick={() => onSkip(item)}
                  className="px-3 py-1.5 text-sm border border-red-900 rounded hover:bg-red-950 text-red-400"
                >
                  Skip
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsAdjusting(true)}
                  className="flex-1 p-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Assign
                </button>
                <button
                  onClick={() => onSkip(item)}
                  className="px-3 py-2 text-sm border border-border rounded hover:bg-surface text-text-muted"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingAssignmentsModal;
