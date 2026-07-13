import { useLiveQuery } from "dexie-react-hooks";
import { listUnresolvedActionsForApartment, updateAction } from "../data/actions";
import type { ActionStatus } from "../types";
import ActionRow from "./ActionRow";

interface UnresolvedActionsSummaryProps {
  apartmentId: string;
}

function UnresolvedActionsSummary({ apartmentId }: UnresolvedActionsSummaryProps) {
  const actions = useLiveQuery(
    () => listUnresolvedActionsForApartment(apartmentId),
    [apartmentId],
  );

  async function handleStatusChange(actionId: string, status: ActionStatus) {
    await updateAction(actionId, { status });
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

export default UnresolvedActionsSummary;
