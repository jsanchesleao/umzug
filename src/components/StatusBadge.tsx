interface StatusBadgeProps {
  status: string;
  label: string;
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{label}</span>;
}

export default StatusBadge;
