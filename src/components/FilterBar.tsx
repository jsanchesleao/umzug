import { useState } from "react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onlyUnresolved: boolean;
  onOnlyUnresolvedChange: (value: boolean) => void;
}

function FilterBar({
  search,
  onSearchChange,
  onlyUnresolved,
  onOnlyUnresolvedChange,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
      </div>
    </div>
  );
}

export default FilterBar;
