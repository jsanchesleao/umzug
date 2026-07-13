import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import type { Apartment, ApartmentStatus } from "../types";
import { countUnresolvedActionsForApartment } from "../data/actions";
import { formatRent } from "../utils/rent";
import { formatDate, formatDateTime } from "../utils/date";
import { useSettings } from "../settings/useSettings";
import StatusMenu from "./StatusMenu";

interface ApartmentCardProps {
  apartment: Apartment;
  onStatusChange: (apartment: Apartment, newStatus: ApartmentStatus) => void;
}

function ApartmentCard({ apartment, onStatusChange }: ApartmentCardProps) {
  const { settings } = useSettings();
  const unresolvedCount = useLiveQuery(
    () => countUnresolvedActionsForApartment(apartment.id),
    [apartment.id],
  );

  return (
    <article
      className="apartment-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", apartment.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="apartment-card-header">
        <div className="apartment-card-title-group">
          <Link to={`/apartments/${apartment.id}`} className="apartment-card-title">
            {apartment.title}
          </Link>
          {apartment.address && (
            <div className="apartment-card-address">{apartment.address}</div>
          )}
        </div>
        <StatusMenu
          currentStatus={apartment.status}
          onSelect={(status) => onStatusChange(apartment, status)}
        />
      </div>

      <div className="apartment-card-rent">
        <div>Cold rent: {formatRent(apartment.coldRent, settings.currency)}</div>
        <div>Warm rent: {formatRent(apartment.warmRent, settings.currency)}</div>
      </div>
      <div className="apartment-card-entry">
        Entry date: {formatDate(apartment.entryDate, settings.dateFormat)}
      </div>

      {apartment.status === "VisitScheduled" && apartment.visitDate && (
        <div className="apartment-card-visit">
          <div>Visit: {formatDateTime(apartment.visitDate, settings.dateFormat)}</div>
          <div>At: {apartment.visitAddress}</div>
        </div>
      )}

      {Boolean(unresolvedCount) && (
        <span className="badge badge-unresolved" title="Unresolved actions">
          {unresolvedCount}
        </span>
      )}
    </article>
  );
}

export default ApartmentCard;
