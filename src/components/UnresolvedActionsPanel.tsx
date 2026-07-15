import type { ActionStatus, ActionUrgency } from "../types";
import ActionRow from "./ActionRow";
import CollapsibleSection from "./CollapsibleSection";

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

function UnresolvedActionsPanel({ entries, onStatusChange }: UnresolvedActionsPanelProps) {
  return (
    <CollapsibleSection
      className="dashboard-card"
      entityId="dashboard"
      cardKey="unresolved-actions"
      title={`Actions (${entries.length})`}
    >
      <div className="action-list">
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
    </CollapsibleSection>
  );
}

export default UnresolvedActionsPanel;
