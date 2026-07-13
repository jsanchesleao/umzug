import { Link } from "react-router-dom";
import { ACTION_STATUSES } from "../types";
import type { Action, ActionStatus } from "../types";
import { isOverdue } from "../utils/date";

interface ActionRowProps {
  action: Action;
  apartmentAddress?: string;
  onStatusChange: (status: ActionStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ActionRow({ action, apartmentAddress, onStatusChange, onEdit, onDelete }: ActionRowProps) {
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
        {apartmentAddress && (
          <Link to={`/apartments/${action.apartmentId}`} className="action-row-apartment">
            {apartmentAddress}
          </Link>
        )}
        <span className={overdue ? "action-row-due overdue" : "action-row-due"}>
          Due {action.dueDate}
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
