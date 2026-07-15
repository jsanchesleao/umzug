import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/date";
import { useSettings } from "../settings/useSettings";
import CollapsibleSection from "./CollapsibleSection";

export interface VisitEntry {
  apartmentId: string;
  apartmentTitle: string;
  visitAddress: string;
  visitDate: string;
  overdue: boolean;
}

interface UpcomingVisitsPanelProps {
  visits: VisitEntry[];
}

function UpcomingVisitsPanel({ visits }: UpcomingVisitsPanelProps) {
  const { settings } = useSettings();

  return (
    <CollapsibleSection
      className="dashboard-card"
      entityId="dashboard"
      cardKey="upcoming-visits"
      title="Upcoming Visits"
    >
      <div className="dashboard-row-list">
        {visits.length === 0 && <p className="empty-column">No upcoming visits scheduled.</p>}
        {visits.map((visit) => (
          <Link key={visit.apartmentId} to={`/apartments/${visit.apartmentId}`} className="visit-row">
            <span className="visit-row-info">
              <span className="visit-row-title">{visit.apartmentTitle}</span>
              {visit.visitAddress && <span className="visit-row-address">{visit.visitAddress}</span>}
            </span>
            <span className={visit.overdue ? "visit-row-date overdue" : "visit-row-date"}>
              {formatDateTime(visit.visitDate, settings.dateFormat)}
              {visit.overdue && <span className="overdue-flag"> · Overdue</span>}
            </span>
          </Link>
        ))}
      </div>
    </CollapsibleSection>
  );
}

export default UpcomingVisitsPanel;
