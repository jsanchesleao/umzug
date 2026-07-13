import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { ApartmentStatus } from "../types";

interface StatusMenuProps {
  currentStatus: ApartmentStatus;
  onSelect: (status: ApartmentStatus) => void;
}

function StatusMenu({ currentStatus, onSelect }: StatusMenuProps) {
  return (
    <details className="status-menu">
      <summary className="status-menu-trigger" aria-label="Move to another status">
        ⇄
      </summary>
      <div className="status-menu-list">
        {APARTMENT_STATUSES.filter((s) => s !== currentStatus).map((status) => (
          <button
            key={status}
            type="button"
            className="status-menu-option"
            onClick={() => onSelect(status)}
          >
            {APARTMENT_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </details>
  );
}

export default StatusMenu;
