import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listTimelineEventsForApartment } from "../data/timelineEvents";
import TimelineEventItem from "./TimelineEventItem";
import TimelineEventModal from "./TimelineEventModal";

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
    <section className="case-file-timeline">
      <div className="section-header">
        <h2>Timeline (oldest first)</h2>
        <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
          + Add event
        </button>
      </div>

      {(events ?? []).map((event) => (
        <TimelineEventItem key={event.id} event={event} />
      ))}
      {events && events.length === 0 && <p className="empty-column">No events yet.</p>}

      {adding && <TimelineEventModal apartmentId={apartmentId} onClose={() => setAdding(false)} />}
    </section>
  );
}

export default TimelineSection;
