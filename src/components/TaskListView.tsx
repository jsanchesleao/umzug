import { Link } from "react-router-dom";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../types";
import type { Task, TaskStatus } from "../types";
import StatusBadge from "./StatusBadge";
import StatusMenu from "./StatusMenu";

interface TaskListViewProps {
  tasks: Task[];
  unresolvedCounts: Map<string, number>;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

function TaskListView({ tasks, unresolvedCounts, onStatusChange }: TaskListViewProps) {
  if (tasks.length === 0) {
    return <p className="empty-column">No tasks match the current filters.</p>;
  }

  return (
    <div className="apartment-list">
      {tasks.map((task) => (
        <article key={task.id} className="apartment-row">
          <div className="apartment-row-main">
            <div className="apartment-row-title-line">
              <Link to={`/tasks/${task.id}`} className="apartment-row-title">
                {task.title}
              </Link>
              {unresolvedCounts.has(task.id) && (
                <span className="badge badge-unresolved" title="Unresolved actions">
                  {unresolvedCounts.get(task.id)}
                </span>
              )}
            </div>
            {task.description && <span className="apartment-row-address">{task.description}</span>}
          </div>

          <div className="apartment-row-meta">
            <StatusBadge status={task.status} label={TASK_STATUS_LABELS[task.status]} />
          </div>

          <StatusMenu
            currentStatus={task.status}
            statuses={TASK_STATUSES}
            labels={TASK_STATUS_LABELS}
            onSelect={(status) => onStatusChange(task, status)}
          />
        </article>
      ))}
    </div>
  );
}

export default TaskListView;
