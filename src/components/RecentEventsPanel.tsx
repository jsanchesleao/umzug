import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/date";
import { useSettings } from "../settings/useSettings";
import CollapsibleSection from "./CollapsibleSection";

export interface RecentEventEntry {
  kind: "apartment" | "task";
  id: string;
  date: string;
  shortDescription: string;
  entityTitle: string;
  entityHref: string;
}

interface RecentEventsPanelProps {
  entries: RecentEventEntry[];
}

const COLLAPSED_COUNT = 3;

function RecentEventsPanel({ entries }: RecentEventsPanelProps) {
  const { settings } = useSettings();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? entries : entries.slice(0, COLLAPSED_COUNT);

  return (
    <CollapsibleSection
      className="dashboard-card"
      entityId="dashboard"
      cardKey="recent-events"
      title="Recent Events"
    >
      <div className="dashboard-row-list">
        {entries.length === 0 && <p className="empty-column">No recent activity.</p>}
        {visible.map((entry) => (
          <Link key={`${entry.kind}-${entry.id}`} to={entry.entityHref} className="recent-event-row">
            <span className="recent-event-row-date">{formatDate(entry.date, settings.dateFormat)}</span>
            <span className="recent-event-row-description">{entry.shortDescription}</span>
            <span className="recent-event-row-entity">{entry.entityTitle}</span>
          </Link>
        ))}
      </div>

      {!expanded && entries.length > COLLAPSED_COUNT && (
        <button type="button" className="dashboard-panel-expand" onClick={() => setExpanded(true)}>
          Show all {entries.length}
        </button>
      )}
    </CollapsibleSection>
  );
}

export default RecentEventsPanel;
