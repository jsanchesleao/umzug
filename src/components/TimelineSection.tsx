import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listTimelineEventsForApartment } from "../data/timelineEvents";
import TimelineEventItem from "./TimelineEventItem";
import TimelineEventModal from "./TimelineEventModal";
import CollapsibleSection from "./CollapsibleSection";

interface TimelineSectionProps {
  apartmentId: string;
}

function TimelineSection({ apartmentId }: TimelineSectionProps) {
  const [adding, setAdding] = useState(false);
  const events = useLiveQuery(
    () => listTimelineEventsForApartment(apartmentId),
    [apartmentId],
  );

  return (
    <>
      <CollapsibleSection
        className="case-file-timeline"
        apartmentId={apartmentId}
        cardKey="timeline"
        title="Timeline (oldest first)"
        headerExtra={
          <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
            + Add event
          </button>
        }
      >
        {(events ?? []).map((event) => (
          <TimelineEventItem key={event.id} event={event} />
        ))}
        {events && events.length === 0 && <p className="empty-column">No events yet.</p>}
      </CollapsibleSection>

      {adding && <TimelineEventModal apartmentId={apartmentId} onClose={() => setAdding(false)} />}
    </>
  );
}

export default TimelineSection;
