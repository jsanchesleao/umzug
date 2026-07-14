import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { ApartmentStatus } from "../types";

interface StatusFilterMenuProps {
  statusFilter: ApartmentStatus[];
  onToggle: (status: ApartmentStatus, checked: boolean) => void;
}

function StatusFilterMenu({ statusFilter, onToggle }: StatusFilterMenuProps) {
  const label = statusFilter.length === 0 ? "All" : String(statusFilter.length);

  return (
    <details className="status-menu">
      <summary
        className="status-menu-trigger filter-status-trigger"
        aria-label="Filter by status"
      >
        Status: {label}
      </summary>
      <div className="status-menu-list column-visibility-list">
        {APARTMENT_STATUSES.map((status) => (
          <label key={status} className="case-file-menu-checkbox">
            <input
              type="checkbox"
              checked={statusFilter.length === 0 || statusFilter.includes(status)}
              onChange={(e) => onToggle(status, e.target.checked)}
            />
            {APARTMENT_STATUS_LABELS[status]}
          </label>
        ))}
      </div>
    </details>
  );
}

export default StatusFilterMenu;
