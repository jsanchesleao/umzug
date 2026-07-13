import { useEffect, useMemo, useState } from "react";
import { updateAction } from "../data/actions";
import type { Action, ActionStatus, Apartment } from "../types";
import ActionRow from "./ActionRow";

interface UnresolvedActionsPanelProps {
  actions: Action[];
  apartments: Apartment[];
}

const COLLAPSE_STORAGE_KEY = "umzug:unresolvedPanelCollapsed";

function UnresolvedActionsPanel({ actions, apartments }: UnresolvedActionsPanelProps) {
  const [collapsed, setCollapsed] = useState(
    () => sessionStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );

  useEffect(() => {
    sessionStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const titleById = useMemo(() => new Map(apartments.map((a) => [a.id, a.title])), [apartments]);

  async function handleStatusChange(actionId: string, status: ActionStatus) {
    await updateAction(actionId, { status });
  }

  return (
    <section className="unresolved-panel">
      <button
        type="button"
        className="unresolved-panel-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span>Unresolved Actions ({actions.length})</span>
        <span className="unresolved-panel-caret">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="unresolved-panel-body">
          {actions.length === 0 && <p className="empty-column">No unresolved actions.</p>}
          {actions.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              apartmentTitle={titleById.get(action.apartmentId)}
              onStatusChange={(status) => handleStatusChange(action.id, status)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default UnresolvedActionsPanel;
