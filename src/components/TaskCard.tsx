import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../types";
import type { Task, TaskStatus } from "../types";
import { countUnresolvedTaskActionsForTask } from "../data/taskActions";
import StatusMenu from "./StatusMenu";

interface TaskCardProps {
  task: Task;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const unresolvedCount = useLiveQuery(
    () => countUnresolvedTaskActionsForTask(task.id),
    [task.id],
  );

  return (
    <article
      className="apartment-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="apartment-card-header">
        <div className="apartment-card-title-group">
          <Link to={`/tasks/${task.id}`} className="apartment-card-title">
            {task.title}
          </Link>
          {task.description && <div className="apartment-card-address">{task.description}</div>}
        </div>
        <StatusMenu
          currentStatus={task.status}
          statuses={TASK_STATUSES}
          labels={TASK_STATUS_LABELS}
          onSelect={(status) => onStatusChange(task, status)}
        />
      </div>

      {Boolean(unresolvedCount) && (
        <span className="badge badge-unresolved" title="Unresolved actions">
          {unresolvedCount}
        </span>
      )}
    </article>
  );
}

export default TaskCard;
