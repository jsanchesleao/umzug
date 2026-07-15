import { useState } from "react";
import type { DragEvent } from "react";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../types";
import type { Task, TaskStatus } from "../types";
import TaskCard from "./TaskCard";
import { useSettings } from "../settings/useSettings";

interface TasksKanbanBoardProps {
  tasks: Task[];
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
}

function TasksKanbanBoard({ tasks, onStatusChange }: TasksKanbanBoardProps) {
  const { settings } = useSettings();
  const visibleStatuses = TASK_STATUSES.filter(
    (status) => !settings.hiddenTaskKanbanColumns.includes(status),
  );
  const columnCount = Math.max(visibleStatuses.length, 3);

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(
    visibleStatuses[0] ?? "ToDo",
  );
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const activeStatus = visibleStatuses.includes(selectedStatus)
    ? selectedStatus
    : (visibleStatuses[0] ?? selectedStatus);

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  function handleDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    setDragOverStatus(null);
    const taskId = event.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (task) onStatusChange(task, status);
  }

  return (
    <div>
      {visibleStatuses.length === 0 ? (
        <p className="empty-column">All columns are hidden. Use the columns menu above to show some.</p>
      ) : (
        <>
          <div className="kanban-tabs">
            {visibleStatuses.map((status) => (
              <button
                key={status}
                type="button"
                className={status === activeStatus ? "kanban-tab active" : "kanban-tab"}
                onClick={() => setSelectedStatus(status)}
              >
                {TASK_STATUS_LABELS[status]} ({byStatus(status).length})
              </button>
            ))}
          </div>

          <div
            className="kanban-board"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {visibleStatuses.map((status) => {
              const columnTasks = byStatus(status);
              return (
                <div
                  key={status}
                  className="kanban-column"
                  data-status={status}
                  data-active={status === activeStatus}
                  data-drag-over={dragOverStatus === status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStatus !== status) setDragOverStatus(status);
                  }}
                  onDragLeave={() => setDragOverStatus((current) => (current === status ? null : current))}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <h2>
                    {TASK_STATUS_LABELS[status]}{" "}
                    <span className="column-count">{columnTasks.length}</span>
                  </h2>
                  <div className="kanban-column-cards">
                    {columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
                    ))}
                    {columnTasks.length === 0 && <p className="empty-column">No tasks</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default TasksKanbanBoard;
