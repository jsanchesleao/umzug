import { Link } from "react-router-dom";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { Apartment, ApartmentStatus } from "../types";
import StatusBadge from "./StatusBadge";
import StatusMenu from "./StatusMenu";
import { useSettings } from "../settings/useSettings";
import { formatRent } from "../utils/rent";
import { formatDate } from "../utils/date";

interface ApartmentListViewProps {
  apartments: Apartment[];
  unresolvedCounts: Map<string, number>;
  onStatusChange: (apartment: Apartment, newStatus: ApartmentStatus) => void;
}

function ApartmentListView({ apartments, unresolvedCounts, onStatusChange }: ApartmentListViewProps) {
  const { settings } = useSettings();

  if (apartments.length === 0) {
    return <p className="empty-column">No apartments match the current filters.</p>;
  }

  return (
    <div className="apartment-list">
      {apartments.map((apartment) => (
        <article key={apartment.id} className="apartment-row">
          <div className="apartment-row-main">
            <div className="apartment-row-title-line">
              <Link to={`/apartments/${apartment.id}`} className="apartment-row-title">
                {apartment.title}
              </Link>
              {unresolvedCounts.has(apartment.id) && (
                <span className="badge badge-unresolved" title="Unresolved actions">
                  {unresolvedCounts.get(apartment.id)}
                </span>
              )}
            </div>
            {apartment.address && <span className="apartment-row-address">{apartment.address}</span>}
          </div>

          <StatusBadge status={apartment.status} label={APARTMENT_STATUS_LABELS[apartment.status]} />

          <span className="apartment-row-rent">{formatRent(apartment.coldRent, settings.currency)}</span>

          <span className="apartment-row-date">{formatDate(apartment.entryDate, settings.dateFormat)}</span>

          <StatusMenu
            currentStatus={apartment.status}
            statuses={APARTMENT_STATUSES}
            labels={APARTMENT_STATUS_LABELS}
            onSelect={(status) => onStatusChange(apartment, status)}
          />
        </article>
      ))}
    </div>
  );
}

export default ApartmentListView;
