import { Link } from "react-router-dom";
import { ACTION_STATUSES } from "../types";
import type { ActionStatus, ActionUrgency } from "../types";
import { formatDate, isOverdue } from "../utils/date";
import { useSettings } from "../settings/useSettings";

interface ActionLike {
  id: string;
  description: string;
  dueDate: string;
  urgency: ActionUrgency;
  status: ActionStatus;
}

interface ActionRowProps {
  action: ActionLike;
  entityTitle?: string;
  entityHref?: string;
  onStatusChange: (status: ActionStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ActionRow({ action, entityTitle, entityHref, onStatusChange, onEdit, onDelete }: ActionRowProps) {
  const { settings } = useSettings();
  const overdue = action.status === "Unresolved" && isOverdue(action.dueDate);

  return (
    <div className="action-row">
      <div className="action-row-main">
        <span className={`badge badge-urgency badge-urgency-${action.urgency}`}>
          {action.urgency}
        </span>
        <span className="action-row-description">{action.description}</span>
      </div>

      <div className="action-row-meta">
        {entityTitle && entityHref && (
          <Link to={entityHref} className="action-row-apartment">
            {entityTitle}
          </Link>
        )}
        <span className={overdue ? "action-row-due overdue" : "action-row-due"}>
          Due {formatDate(action.dueDate, settings.dateFormat)}
          {overdue && <span className="overdue-flag"> · Overdue</span>}
        </span>
      </div>

      <div className="action-row-controls">
        <select
          aria-label="Action status"
          value={action.status}
          onChange={(e) => onStatusChange(e.target.value as ActionStatus)}
        >
          {ACTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {onEdit && (
          <button type="button" className="btn btn-sm" onClick={onEdit}>
            Edit
          </button>
        )}
        {onDelete && (
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default ActionRow;
