import { useState } from "react";
import { APARTMENT_STATUSES } from "../types";
import type { ApartmentStatus } from "../types";
import StatusFilterMenu from "./StatusFilterMenu";
import { APARTMENT_SORT_OPTIONS, APARTMENT_SORT_LABELS } from "../utils/apartmentSort";
import type { ApartmentSortOption } from "../utils/apartmentSort";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onlyUnresolved: boolean;
  onOnlyUnresolvedChange: (value: boolean) => void;
  statusFilter: ApartmentStatus[];
  onStatusFilterChange: (statuses: ApartmentStatus[]) => void;
  sortBy: ApartmentSortOption;
  onSortByChange: (value: ApartmentSortOption) => void;
  showStatusAndSort: boolean;
}

function FilterBar({
  search,
  onSearchChange,
  onlyUnresolved,
  onOnlyUnresolvedChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  showStatusAndSort,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleStatusToggle(status: ApartmentStatus, checked: boolean) {
    // An empty filter means "all statuses", so expand it before toggling one off.
    const base = statusFilter.length === 0 ? [...APARTMENT_STATUSES] : statusFilter;
    const next = checked ? [...base, status] : base.filter((s) => s !== status);
    onStatusFilterChange(next.length === APARTMENT_STATUSES.length ? [] : next);
  }

  return (
    <div className="filter-bar">
      <button
        type="button"
        className="filter-toggle-btn"
        aria-label="Toggle filters"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        Filters
      </button>

      <div className={mobileOpen ? "filter-fields open" : "filter-fields"}>
        <input
          type="search"
          className="filter-search"
          placeholder="Search address or notes…"
          aria-label="Search apartments"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={onlyUnresolved}
            onChange={(e) => onOnlyUnresolvedChange(e.target.checked)}
          />
          Overdue / unresolved only
        </label>

        {showStatusAndSort && (
          <>
            <StatusFilterMenu statusFilter={statusFilter} onToggle={handleStatusToggle} />

            <div className="form-field filter-sort">
              <select
                id="apartments-sort"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as ApartmentSortOption)}
              >
                {APARTMENT_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {APARTMENT_SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
