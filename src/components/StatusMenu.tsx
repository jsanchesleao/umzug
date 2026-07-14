interface StatusMenuProps<T extends string> {
  currentStatus: T;
  statuses: T[];
  labels: Record<T, string>;
  onSelect: (status: T) => void;
}

function StatusMenu<T extends string>({ currentStatus, statuses, labels, onSelect }: StatusMenuProps<T>) {
  return (
    <details className="status-menu">
      <summary className="status-menu-trigger" aria-label="Move to another status">
        ⇄
      </summary>
      <div className="status-menu-list">
        {statuses.filter((s) => s !== currentStatus).map((status) => (
          <button
            key={status}
            type="button"
            className="status-menu-option"
            onClick={() => onSelect(status)}
          >
            {labels[status]}
          </button>
        ))}
      </div>
    </details>
  );
}

export default StatusMenu;
