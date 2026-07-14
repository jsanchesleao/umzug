import { useState } from "react";
import { updateTaskAction, deleteTaskAction } from "../data/taskActions";
import { sortByUrgencyThenDueDate } from "../utils/actionSort";
import type { TaskAction, ActionStatus } from "../types";
import ActionRow from "./ActionRow";
import TaskActionModal from "./TaskActionModal";
import ConfirmDialog from "./ConfirmDialog";

interface TaskActionListProps {
  taskId: string;
  eventId: string | null;
  actions: TaskAction[];
  emptyLabel?: string;
}

function TaskActionList({ taskId, eventId, actions, emptyLabel = "No actions yet." }: TaskActionListProps) {
  const [adding, setAdding] = useState(false);
  const [editingAction, setEditingAction] = useState<TaskAction | null>(null);
  const [deletingAction, setDeletingAction] = useState<TaskAction | null>(null);

  const sorted = sortByUrgencyThenDueDate(actions);

  async function handleStatusChange(action: TaskAction, status: ActionStatus) {
    await updateTaskAction(action.id, { status });
  }

  async function handleDelete() {
    if (!deletingAction) return;
    await deleteTaskAction(deletingAction.id);
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
        <TaskActionModal taskId={taskId} eventId={eventId} onClose={() => setAdding(false)} />
      )}

      {editingAction && (
        <TaskActionModal
          taskId={taskId}
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

export default TaskActionList;
