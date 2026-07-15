import { useLiveQuery } from "dexie-react-hooks";
import NoteCard from "./NoteCard";
import CollapsibleSection from "./CollapsibleSection";
import { listDashboardNotes } from "../data/dashboardNotes";

function NotesPanel() {
  const notes = useLiveQuery(() => listDashboardNotes(), []);

  return (
    <CollapsibleSection
      className="dashboard-card"
      entityId="dashboard"
      cardKey="notes"
      title="Notes"
    >
      {notes && notes.length === 0 && <p className="empty-column">No notes yet.</p>}
      {notes && notes.length > 0 && (
        <div className="notes-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

export default NotesPanel;
