import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { deleteTaskCascade, getTask, updateTask } from "../data/tasks";
import { listTaskActionsForTask } from "../data/taskActions";
import { buildTaskExport } from "../data/taskImportExport";
import { downloadJson } from "../data/importExport";
import TaskModal from "../components/TaskModal";
import TaskP2PSendModal from "../components/TaskP2PSendModal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import StatusMenu from "../components/StatusMenu";
import UnresolvedTaskActionsSummary from "../components/UnresolvedTaskActionsSummary";
import TaskActionList from "../components/TaskActionList";
import TaskTimelineSection from "../components/TaskTimelineSection";
import CollapsibleSection from "../components/CollapsibleSection";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../types";
import type { TaskStatus } from "../types";

function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const task = useLiveQuery(() => (id ? getTask(id) : undefined), [id]);
  const directActions = useLiveQuery(async () => {
    if (!id) return [];
    const all = await listTaskActionsForTask(id);
    return all.filter((action) => action.eventId === null);
  }, [id]);

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sendingP2P, setSendingP2P] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [syncedTaskId, setSyncedTaskId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  // Reset the description draft whenever a (new) task record loads, unless the
  // user already has unsaved edits in progress. Adjusting state during render
  // (rather than in an effect) avoids an extra cascading render.
  if (task && task.id !== syncedTaskId) {
    setSyncedTaskId(task.id);
    setDescription(task.description);
    setDescriptionDirty(false);
  }

  if (!task) {
    return (
      <main className="case-file">
        <p>Task not found.</p>
        <Link to="/tasks">← Back to tasks</Link>
      </main>
    );
  }

  async function handleSaveDescription() {
    setSavingDescription(true);
    try {
      await updateTask(task!.id, { description });
      setDescriptionDirty(false);
    } finally {
      setSavingDescription(false);
    }
  }

  async function handleStatusChange(status: TaskStatus) {
    if (status === task!.status) return;
    await updateTask(task!.id, { status });
  }

  async function handleDelete() {
    await deleteTaskCascade(task!.id);
    navigate("/tasks");
  }

  async function handleExport() {
    const exported = await buildTaskExport(task!.id);
    const slug = task!.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "task";
    downloadJson(`umzug-task-${slug}.json`, exported);
  }

  return (
    <main className="case-file">
      <Link to="/tasks" className="back-link">
        ← Back to tasks
      </Link>

      <div className="case-file-grid">
        <div className="case-file-col-left">
          <header className="case-file-header">
            <div className="case-file-title-row">
              <div className="case-file-title-group">
                <h1 className="case-file-title-group-heading">{task.title}</h1>
                <StatusBadge status={task.status} label={TASK_STATUS_LABELS[task.status]} />
                <StatusMenu
                  currentStatus={task.status}
                  statuses={TASK_STATUSES}
                  labels={TASK_STATUS_LABELS}
                  onSelect={handleStatusChange}
                />
              </div>

              <details className="status-menu" ref={menuRef}>
                <summary className="status-menu-trigger" aria-label="Task actions">
                  ⋮
                </summary>
                <div className="status-menu-list case-file-menu-list">
                  <button
                    type="button"
                    className="status-menu-option"
                    onClick={() => {
                      setEditing(true);
                      closeMenu();
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="status-menu-option"
                    onClick={() => {
                      handleExport();
                      closeMenu();
                    }}
                  >
                    Export this task
                  </button>
                  <button
                    type="button"
                    className="status-menu-option"
                    onClick={() => {
                      setSendingP2P(true);
                      closeMenu();
                    }}
                  >
                    Send this task
                  </button>
                  <button
                    type="button"
                    className="status-menu-option danger"
                    onClick={() => {
                      setConfirmingDelete(true);
                      closeMenu();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </details>
            </div>

            <UnresolvedTaskActionsSummary taskId={task.id} />
          </header>

          <CollapsibleSection
            className="case-file-notes"
            entityId={task.id}
            cardKey="description"
            title="Description"
          >
            <textarea
              rows={6}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionDirty(true);
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveDescription}
              disabled={!descriptionDirty || savingDescription}
            >
              {savingDescription ? "Saving…" : "Save description"}
            </button>
          </CollapsibleSection>

          <TaskTimelineSection taskId={task.id} />
        </div>

        <div className="case-file-col-right">
          <CollapsibleSection
            className="case-file-actions-section"
            entityId={task.id}
            cardKey="actions"
            title="Actions"
          >
            <TaskActionList
              taskId={task.id}
              eventId={null}
              actions={directActions ?? []}
              emptyLabel="No actions on this task yet."
            />
          </CollapsibleSection>
        </div>
      </div>

      {editing && <TaskModal task={task} onClose={() => setEditing(false)} />}

      {sendingP2P && (
        <TaskP2PSendModal scope="task" taskId={task.id} onClose={() => setSendingP2P(false)} />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete ${task.title}? This will also delete its timeline events and actions. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}

export default TaskDetail;
