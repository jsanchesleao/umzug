import { useState } from "react";
import { updateAction, deleteAction, sortByUrgencyThenDueDate } from "../data/actions";
import type { Action, ActionStatus } from "../types";
import ActionRow from "./ActionRow";
import ActionModal from "./ActionModal";
import ConfirmDialog from "./ConfirmDialog";

interface ActionListProps {
  apartmentId: string;
  eventId: string | null;
  actions: Action[];
  emptyLabel?: string;
}

function ActionList({ apartmentId, eventId, actions, emptyLabel = "No actions yet." }: ActionListProps) {
  const [adding, setAdding] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [deletingAction, setDeletingAction] = useState<Action | null>(null);

  const sorted = sortByUrgencyThenDueDate(actions);

  async function handleStatusChange(action: Action, status: ActionStatus) {
    await updateAction(action.id, { status });
  }

  async function handleDelete() {
    if (!deletingAction) return;
    await deleteAction(deletingAction.id);
    setDeletingAction(null);
  }

  return (
    <div className="action-list">
      {sorted.map((action) => (
        <ActionRow
          key={action.id}
          action={action}
          onStatusChange={(status) => handleStatusChange(action, status)}
          onEdit={() => setEditingAction(action)}
          onDelete={() => setDeletingAction(action)}
        />
      ))}
      {sorted.length === 0 && <p className="action-list-empty">{emptyLabel}</p>}

      <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
        + Add action
      </button>

      {adding && (
        <ActionModal apartmentId={apartmentId} eventId={eventId} onClose={() => setAdding(false)} />
      )}

      {editingAction && (
        <ActionModal
          apartmentId={apartmentId}
          eventId={eventId}
          action={editingAction}
          onClose={() => setEditingAction(null)}
        />
      )}

      {deletingAction && (
        <ConfirmDialog
          title="Delete action"
          message={`Delete "${deletingAction.description}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingAction(null)}
        />
      )}
    </div>
  );
}

export default ActionList;
