import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import TasksKanbanBoard from "../components/TasksKanbanBoard";
import TaskListView from "../components/TaskListView";
import TaskModal from "../components/TaskModal";
import TaskFilterBar from "../components/TaskFilterBar";
import { listTasks, updateTask } from "../data/tasks";
import { getUnresolvedTaskActions } from "../data/taskActions";
import { sortTasks } from "../utils/taskSort";
import type { TaskSortOption } from "../utils/taskSort";
import type { Task, TaskStatus } from "../types";

type ViewMode = "list" | "kanban";

function Tasks() {
  const tasks = useLiveQuery(() => listTasks(), []);
  const unresolvedTaskActions = useLiveQuery(() => getUnresolvedTaskActions(), []);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [sortBy, setSortBy] = useState<TaskSortOption>("updatedAt");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const unresolvedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const action of unresolvedTaskActions ?? []) {
      counts.set(action.taskId, (counts.get(action.taskId) ?? 0) + 1);
    }
    return counts;
  }, [unresolvedTaskActions]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (tasks ?? []).filter((task) => {
      if (onlyUnresolved && !unresolvedCounts.has(task.id)) return false;
      if (viewMode === "list" && statusFilter.length > 0 && !statusFilter.includes(task.status)) {
        return false;
      }
      if (query) {
        const matches =
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [tasks, search, onlyUnresolved, unresolvedCounts, viewMode, statusFilter]);

  const sortedTasks = useMemo(() => sortTasks(filteredTasks, sortBy), [filteredTasks, sortBy]);

  async function handleStatusChange(task: Task, newStatus: TaskStatus) {
    if (newStatus === task.status) return;
    await updateTask(task.id, { status: newStatus });
  }

  return (
    <main className="apartments-page page">
      <h1>Tasks</h1>

      <TaskFilterBar
        search={search}
        onSearchChange={setSearch}
        onlyUnresolved={onlyUnresolved}
        onOnlyUnresolvedChange={setOnlyUnresolved}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        showStatusAndSort={viewMode === "list"}
      />

      <div className="apartments-view-toggle" role="tablist" aria-label="View mode">
        <button
          type="button"
          className={viewMode === "list" ? "view-toggle-btn active" : "view-toggle-btn"}
          aria-pressed={viewMode === "list"}
          onClick={() => setViewMode("list")}
        >
          List
        </button>
        <button
          type="button"
          className={viewMode === "kanban" ? "view-toggle-btn active" : "view-toggle-btn"}
          aria-pressed={viewMode === "kanban"}
          onClick={() => setViewMode("kanban")}
        >
          Kanban
        </button>
      </div>

      {viewMode === "list" ? (
        <TaskListView
          tasks={sortedTasks}
          unresolvedCounts={unresolvedCounts}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TasksKanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} />
      )}

      <button
        type="button"
        className="fab"
        aria-label="Add task"
        onClick={() => setAdding(true)}
      >
        +
      </button>

      {adding && <TaskModal onClose={() => setAdding(false)} />}
    </main>
  );
}

export default Tasks;
