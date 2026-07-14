import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { TaskEvent } from "../types";
import { listTaskActionsForEvent } from "../data/taskActions";
import { countTaskActionsForEvent, deleteTaskEventCascade } from "../data/taskEvents";
import TaskActionList from "./TaskActionList";
import TaskEventModal from "./TaskEventModal";
import ConfirmDialog from "./ConfirmDialog";
import { formatDate } from "../utils/date";
import { useSettings } from "../settings/useSettings";

interface TaskEventItemProps {
  event: TaskEvent;
}

function TaskEventItem({ event }: TaskEventItemProps) {
  const { settings } = useSettings();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const actions = useLiveQuery(() => listTaskActionsForEvent(event.id), [event.id]) ?? [];
  const actionCountForDelete = useLiveQuery(
    () => countTaskActionsForEvent(event.id),
    [event.id],
  );

  async function handleDelete() {
    await deleteTaskEventCascade(event.id);
    setConfirmingDelete(false);
  }

  return (
    <div className="timeline-event">
      <div className="timeline-event-header">
        <span className="timeline-event-date">{formatDate(event.date, settings.dateFormat)}</span>
        <span className="timeline-event-short">{event.shortDescription}</span>
        <div className="timeline-event-controls">
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        </div>
      </div>

      {event.longDescription && (
        <details className="timeline-event-details">
          <summary>Details</summary>
          <p>{event.longDescription}</p>
        </details>
      )}

      <details className="timeline-event-actions">
        <summary>Actions ({actions.length})</summary>
        <TaskActionList
          taskId={event.taskId}
          eventId={event.id}
          actions={actions}
          emptyLabel="No actions attached to this event."
        />
      </details>

      {editing && (
        <TaskEventModal event={event} taskId={event.taskId} onClose={() => setEditing(false)} />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete event"
          message={
            actionCountForDelete
              ? `Delete "${event.shortDescription}"? This will also delete ${actionCountForDelete} action${actionCountForDelete === 1 ? "" : "s"} attached to it. This cannot be undone.`
              : `Delete "${event.shortDescription}"? This cannot be undone.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export default TaskEventItem;
