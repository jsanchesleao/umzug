import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { TimelineEvent } from "../types";
import { listActionsForEvent } from "../data/actions";
import { countActionsForEvent, deleteTimelineEventCascade } from "../data/timelineEvents";
import ActionList from "./ActionList";
import TimelineEventModal from "./TimelineEventModal";
import ConfirmDialog from "./ConfirmDialog";
import { formatDate } from "../utils/date";
import { useSettings } from "../settings/useSettings";

interface TimelineEventItemProps {
  event: TimelineEvent;
}

function TimelineEventItem({ event }: TimelineEventItemProps) {
  const { settings } = useSettings();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const actions = useLiveQuery(() => listActionsForEvent(event.id), [event.id]) ?? [];
  const actionCountForDelete = useLiveQuery(
    () => countActionsForEvent(event.id),
    [event.id],
  );

  async function handleDelete() {
    await deleteTimelineEventCascade(event.id);
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
        <ActionList
          apartmentId={event.apartmentId}
          eventId={event.id}
          actions={actions}
          emptyLabel="No actions attached to this event."
        />
      </details>

      {editing && (
        <TimelineEventModal event={event} apartmentId={event.apartmentId} onClose={() => setEditing(false)} />
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

export default TimelineEventItem;
