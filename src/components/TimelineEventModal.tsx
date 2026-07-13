import Modal from "./Modal";
import TimelineEventForm from "./TimelineEventForm";
import { createTimelineEvent, updateTimelineEvent } from "../data/timelineEvents";
import type { TimelineEvent } from "../types";
import {
  emptyTimelineEventFormValues,
  timelineEventToFormValues,
} from "../utils/timelineEventForm";

interface TimelineEventModalProps {
  apartmentId: string;
  event?: TimelineEvent;
  onClose: () => void;
}

function TimelineEventModal({ apartmentId, event, onClose }: TimelineEventModalProps) {
  const isEdit = Boolean(event);

  async function handleSubmit(patch: {
    date: string;
    shortDescription: string;
    longDescription: string | null;
  }) {
    if (event) {
      await updateTimelineEvent(event.id, patch);
    } else {
      await createTimelineEvent({ ...patch, apartmentId });
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

export default TimelineEventModal;
