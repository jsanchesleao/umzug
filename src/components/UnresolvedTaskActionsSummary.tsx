import { useLiveQuery } from "dexie-react-hooks";
import { listUnresolvedTaskActionsForTask, updateTaskAction } from "../data/taskActions";
import type { ActionStatus } from "../types";
import ActionRow from "./ActionRow";

interface UnresolvedTaskActionsSummaryProps {
  taskId: string;
}

function UnresolvedTaskActionsSummary({ taskId }: UnresolvedTaskActionsSummaryProps) {
  const actions = useLiveQuery(
    () => listUnresolvedTaskActionsForTask(taskId),
    [taskId],
  );

  async function handleStatusChange(actionId: string, status: ActionStatus) {
    await updateTaskAction(actionId, { status });
  }

  if (!actions || actions.length === 0) {
    return (
      <section className="case-file-unresolved">
        <h2>Unresolved Actions</h2>
        <p className="empty-column">No unresolved actions.</p>
      </section>
    );
  }

  return (
    <section className="case-file-unresolved">
      <h2>Unresolved Actions ({actions.length})</h2>
      {actions.map((action) => (
        <ActionRow
          key={action.id}
          action={action}
          onStatusChange={(status) => handleStatusChange(action.id, status)}
        />
      ))}
    </section>
  );
}

export default UnresolvedTaskActionsSummary;
