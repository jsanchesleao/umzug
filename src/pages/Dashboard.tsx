import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import UnresolvedActionsPanel from "../components/UnresolvedActionsPanel";
import type { UnresolvedEntry } from "../components/UnresolvedActionsPanel";
import { listApartments } from "../data/apartments";
import { getUnresolvedActions, updateAction } from "../data/actions";
import { listTasks } from "../data/tasks";
import { getUnresolvedTaskActions, updateTaskAction } from "../data/taskActions";
import { sortByUrgencyThenDueDate } from "../utils/actionSort";
import type { ActionStatus } from "../types";

function Dashboard() {
  const apartments = useLiveQuery(() => listApartments(), []);
  const unresolvedActions = useLiveQuery(() => getUnresolvedActions(), []);
  const tasks = useLiveQuery(() => listTasks(), []);
  const unresolvedTaskActions = useLiveQuery(() => getUnresolvedTaskActions(), []);

  const entries = useMemo(() => {
    const apartmentTitleById = new Map((apartments ?? []).map((a) => [a.id, a.title]));
    const taskTitleById = new Map((tasks ?? []).map((t) => [t.id, t.title]));

    const apartmentEntries: UnresolvedEntry[] = (unresolvedActions ?? []).map((action) => ({
      kind: "apartment",
      id: action.id,
      description: action.description,
      dueDate: action.dueDate,
      urgency: action.urgency,
      status: action.status,
      entityTitle: apartmentTitleById.get(action.apartmentId) ?? "Unknown apartment",
      entityHref: `/apartments/${action.apartmentId}`,
    }));

    const taskEntries: UnresolvedEntry[] = (unresolvedTaskActions ?? []).map((action) => ({
      kind: "task",
      id: action.id,
      description: action.description,
      dueDate: action.dueDate,
      urgency: action.urgency,
      status: action.status,
      entityTitle: taskTitleById.get(action.taskId) ?? "Unknown task",
      entityHref: `/tasks/${action.taskId}`,
    }));

    return sortByUrgencyThenDueDate([...apartmentEntries, ...taskEntries]);
  }, [apartments, unresolvedActions, tasks, unresolvedTaskActions]);

  async function handleStatusChange(entry: UnresolvedEntry, status: ActionStatus) {
    if (entry.kind === "apartment") {
      await updateAction(entry.id, { status });
    } else {
      await updateTaskAction(entry.id, { status });
    }
  }

  return (
    <main className="dashboard page">
      <h1>Dashboard</h1>
      <UnresolvedActionsPanel entries={entries} onStatusChange={handleStatusChange} />
    </main>
  );
}

export default Dashboard;
