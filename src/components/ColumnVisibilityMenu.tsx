interface ColumnVisibilityMenuProps<T extends string> {
  statuses: T[];
  labels: Record<T, string>;
  hidden: T[];
  onChange: (hidden: T[]) => void;
}

function ColumnVisibilityMenu<T extends string>({
  statuses,
  labels,
  hidden,
  onChange,
}: ColumnVisibilityMenuProps<T>) {
  return (
    <details className="status-menu">
      <summary className="status-menu-trigger" aria-label="Show or hide columns">
        ☷
      </summary>
      <div className="status-menu-list column-visibility-list">
        {statuses.map((status) => (
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
            {labels[status]}
          </label>
        ))}
      </div>
    </details>
  );
}

export default ColumnVisibilityMenu;
