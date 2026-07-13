import { APARTMENT_STATUS_LABELS } from "../types";
import type { ApartmentStatus } from "../types";

interface StatusBadgeProps {
  status: ApartmentStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{APARTMENT_STATUS_LABELS[status]}</span>;
}

export default StatusBadge;
