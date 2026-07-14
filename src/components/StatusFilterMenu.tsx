interface StatusFilterMenuProps<T extends string> {
  statuses: T[];
  labels: Record<T, string>;
  statusFilter: T[];
  onToggle: (status: T, checked: boolean) => void;
}

function StatusFilterMenu<T extends string>({
  statuses,
  labels,
  statusFilter,
  onToggle,
}: StatusFilterMenuProps<T>) {
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
        {statuses.map((status) => (
          <label key={status} className="case-file-menu-checkbox">
            <input
              type="checkbox"
              checked={statusFilter.length === 0 || statusFilter.includes(status)}
              onChange={(e) => onToggle(status, e.target.checked)}
            />
            {labels[status]}
          </label>
        ))}
      </div>
    </details>
  );
}

export default StatusFilterMenu;
