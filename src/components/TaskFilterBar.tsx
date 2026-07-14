import { useState } from "react";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../types";
import type { TaskStatus } from "../types";
import StatusFilterMenu from "./StatusFilterMenu";
import { TASK_SORT_OPTIONS, TASK_SORT_LABELS } from "../utils/taskSort";
import type { TaskSortOption } from "../utils/taskSort";

interface TaskFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onlyUnresolved: boolean;
  onOnlyUnresolvedChange: (value: boolean) => void;
  statusFilter: TaskStatus[];
  onStatusFilterChange: (statuses: TaskStatus[]) => void;
  sortBy: TaskSortOption;
  onSortByChange: (value: TaskSortOption) => void;
  showStatusAndSort: boolean;
}

function TaskFilterBar({
  search,
  onSearchChange,
  onlyUnresolved,
  onOnlyUnresolvedChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  showStatusAndSort,
}: TaskFilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleStatusToggle(status: TaskStatus, checked: boolean) {
    // An empty filter means "all statuses", so expand it before toggling one off.
    const base = statusFilter.length === 0 ? [...TASK_STATUSES] : statusFilter;
    const next = checked ? [...base, status] : base.filter((s) => s !== status);
    onStatusFilterChange(next.length === TASK_STATUSES.length ? [] : next);
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
          placeholder="Search title or description…"
          aria-label="Search tasks"
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
            <StatusFilterMenu
              statuses={TASK_STATUSES}
              labels={TASK_STATUS_LABELS}
              statusFilter={statusFilter}
              onToggle={handleStatusToggle}
            />

            <div className="form-field filter-sort">
              <select
                id="tasks-sort"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as TaskSortOption)}
              >
                {TASK_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {TASK_SORT_LABELS[option]}
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

export default TaskFilterBar;
