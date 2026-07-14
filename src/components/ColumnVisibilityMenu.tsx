import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { ApartmentStatus } from "../types";

interface ColumnVisibilityMenuProps {
  hidden: ApartmentStatus[];
  onChange: (hidden: ApartmentStatus[]) => void;
}

function ColumnVisibilityMenu({ hidden, onChange }: ColumnVisibilityMenuProps) {
  return (
    <details className="status-menu">
      <summary className="status-menu-trigger" aria-label="Show or hide columns">
        ☷
      </summary>
      <div className="status-menu-list column-visibility-list">
        {APARTMENT_STATUSES.map((status) => (
          <label key={status} className="case-file-menu-checkbox">
            <input
              type="checkbox"
              checked={!hidden.includes(status)}
              onChange={(e) => {
                onChange(
                  e.target.checked ? hidden.filter((s) => s !== status) : [...hidden, status],
                );
              }}
            />
            {APARTMENT_STATUS_LABELS[status]}
          </label>
        ))}
      </div>
    </details>
  );
}

export default ColumnVisibilityMenu;
