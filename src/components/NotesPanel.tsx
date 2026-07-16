import { useLiveQuery } from "dexie-react-hooks";
import NoteCard from "./NoteCard";
import CollapsibleSection from "./CollapsibleSection";
import { deleteDashboardNote, listDashboardNotes, updateDashboardNote } from "../data/dashboardNotes";

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
            <NoteCard
              key={note.id}
              note={note}
              onSubmitText={(text) => updateDashboardNote(note.id, { text })}
              onSubmitSketch={(blob) => updateDashboardNote(note.id, { blob })}
              onDelete={() => deleteDashboardNote(note.id)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

export default NotesPanel;
