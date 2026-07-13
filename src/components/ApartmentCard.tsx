import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { Apartment, ApartmentStatus } from "../types";
import { countUnresolvedActionsForApartment } from "../data/actions";

interface ApartmentCardProps {
  apartment: Apartment;
  onStatusChange: (apartment: Apartment, newStatus: ApartmentStatus) => void;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function ApartmentCard({ apartment, onStatusChange }: ApartmentCardProps) {
  const unresolvedCount = useLiveQuery(
    () => countUnresolvedActionsForApartment(apartment.id),
    [apartment.id],
  );

  return (
    <article className="apartment-card">
      <div className="apartment-card-header">
        <Link to={`/apartments/${apartment.id}`} className="apartment-card-address">
          {apartment.address}
        </Link>
        {Boolean(unresolvedCount) && (
          <span className="badge badge-unresolved" title="Unresolved actions">
            {unresolvedCount}
          </span>
        )}
      </div>

      <div className="apartment-card-rent">Rent: {apartment.rentCost}</div>
      <div className="apartment-card-entry">Entry date: {apartment.entryDate}</div>

      {apartment.status === "VisitScheduled" && apartment.visitDate && (
        <div className="apartment-card-visit">
          <div>Visit: {formatDateTime(apartment.visitDate)}</div>
          <div>At: {apartment.visitAddress}</div>
        </div>
      )}

      <div className="form-field apartment-card-status">
        <label htmlFor={`status-${apartment.id}`}>Status</label>
        <select
          id={`status-${apartment.id}`}
          value={apartment.status}
          onChange={(e) => onStatusChange(apartment, e.target.value as ApartmentStatus)}
        >
          {APARTMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APARTMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

export default ApartmentCard;
