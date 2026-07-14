import Modal from "./Modal";
import TimelineEventForm from "./TimelineEventForm";
import { createTaskEvent, updateTaskEvent } from "../data/taskEvents";
import type { TaskEvent } from "../types";
import {
  emptyTimelineEventFormValues,
  timelineEventToFormValues,
} from "../utils/timelineEventForm";

interface TaskEventModalProps {
  taskId: string;
  event?: TaskEvent;
  onClose: () => void;
}

function TaskEventModal({ taskId, event, onClose }: TaskEventModalProps) {
  const isEdit = Boolean(event);

  async function handleSubmit(patch: {
    date: string;
    shortDescription: string;
    longDescription: string | null;
  }) {
    if (event) {
      await updateTaskEvent(event.id, patch);
    } else {
      await createTaskEvent({ ...patch, taskId });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? "Edit Event" : "Add Event"} onClose={onClose}>
      <TimelineEventForm
        initialValues={event ? timelineEventToFormValues(event) : emptyTimelineEventFormValues()}
        submitLabel={isEdit ? "Save changes" : "Add event"}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

export default TaskEventModal;
