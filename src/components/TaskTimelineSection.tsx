import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listTaskEventsForTask } from "../data/taskEvents";
import TaskEventItem from "./TaskEventItem";
import TaskEventModal from "./TaskEventModal";
import CollapsibleSection from "./CollapsibleSection";

interface TaskTimelineSectionProps {
  taskId: string;
}

function TaskTimelineSection({ taskId }: TaskTimelineSectionProps) {
  const [adding, setAdding] = useState(false);
  const events = useLiveQuery(() => listTaskEventsForTask(taskId), [taskId]);

  return (
    <>
      <CollapsibleSection
        className="case-file-timeline"
        entityId={taskId}
        cardKey="timeline"
        title="Timeline"
        headerExtra={
          <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
            + Add event
          </button>
        }
      >
        {(events ?? []).map((event) => (
          <TaskEventItem key={event.id} event={event} />
        ))}
        {events && events.length === 0 && <p className="empty-column">No events yet.</p>}
      </CollapsibleSection>

      {adding && <TaskEventModal taskId={taskId} onClose={() => setAdding(false)} />}
    </>
  );
}

export default TaskTimelineSection;
