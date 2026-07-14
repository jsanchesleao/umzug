import { useEffect, useState } from "react";
import type { ActionStatus, ActionUrgency } from "../types";
import ActionRow from "./ActionRow";

export interface UnresolvedEntry {
  kind: "apartment" | "task";
  id: string;
  description: string;
  dueDate: string;
  urgency: ActionUrgency;
  status: ActionStatus;
  entityTitle: string;
  entityHref: string;
}

interface UnresolvedActionsPanelProps {
  entries: UnresolvedEntry[];
  onStatusChange: (entry: UnresolvedEntry, status: ActionStatus) => void;
}

const COLLAPSE_STORAGE_KEY = "umzug:unresolvedPanelCollapsed";

function UnresolvedActionsPanel({ entries, onStatusChange }: UnresolvedActionsPanelProps) {
  const [collapsed, setCollapsed] = useState(
    () => sessionStorage.getItem(COLLAPSE_STORAGE_KEY) === "1",
  );

  useEffect(() => {
    sessionStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <section className="unresolved-panel">
      <button
        type="button"
        className="unresolved-panel-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span>Unresolved Actions ({entries.length})</span>
        <span className="unresolved-panel-caret">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="unresolved-panel-body">
          {entries.length === 0 && <p className="empty-column">No unresolved actions.</p>}
          {entries.map((entry) => (
            <ActionRow
              key={`${entry.kind}-${entry.id}`}
              action={entry}
              entityTitle={entry.entityTitle}
              entityHref={entry.entityHref}
              onStatusChange={(status) => onStatusChange(entry, status)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default UnresolvedActionsPanel;
