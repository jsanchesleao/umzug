import { useState } from "react";
import CollapsibleSection from "./CollapsibleSection";
import TextNoteModal from "./TextNoteModal";
import NoteSketchPad from "./NoteSketchPad";
import FloatingNotesModal from "./FloatingNotesModal";
import type { FloatingNoteCreateInput } from "./FloatingNotesModal";
import type { FloatingNoteBase } from "../types";

interface FloatingNotesSectionProps {
  entityId: string;
  notes: FloatingNoteBase[];
  onCreate: (input: FloatingNoteCreateInput) => Promise<void>;
  onUpdateText: (id: string, text: string) => Promise<void>;
  onUpdateSketch: (id: string, blob: Blob) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function nextPosition(count: number) {
  return { x: 24 + (count % 6) * 28, y: 24 + Math.floor(count / 6) * 28 };
}

function FloatingNotesSection({
  entityId,
  notes,
  onCreate,
  onUpdateText,
  onUpdateSketch,
  onDelete,
}: FloatingNotesSectionProps) {
  const [creating, setCreating] = useState<"text" | "sketch" | null>(null);
  const [listOpen, setListOpen] = useState(false);

  return (
    <CollapsibleSection
      className="case-file-floating-notes"
      entityId={entityId}
      cardKey="floating-notes"
      title="Floating Notes"
      headerExtra={
        <div className="case-file-floating-notes-actions">
          <button type="button" className="btn btn-sm" onClick={() => setCreating("text")}>
            + Text
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setCreating("sketch")}>
            + Sketch
          </button>
        </div>
      }
    >
      {notes.length === 0 ? (
        <p className="empty-column">No floating notes yet.</p>
      ) : (
        <button type="button" className="btn btn-sm" onClick={() => setListOpen(true)}>
          View all ({notes.length})
        </button>
      )}

      {creating === "text" && (
        <TextNoteModal
          onClose={() => setCreating(null)}
          onSubmit={(text) => onCreate({ kind: "text", text, blob: null, ...nextPosition(notes.length) })}
        />
      )}
      {creating === "sketch" && (
        <NoteSketchPad
          onClose={() => setCreating(null)}
          onSubmit={(blob) => onCreate({ kind: "sketch", text: null, blob, ...nextPosition(notes.length) })}
        />
      )}

      {listOpen && (
        <FloatingNotesModal
          notes={notes}
          onClose={() => setListOpen(false)}
          onCreate={onCreate}
          onUpdateText={onUpdateText}
          onUpdateSketch={onUpdateSketch}
          onDelete={onDelete}
        />
      )}
    </CollapsibleSection>
  );
}

export default FloatingNotesSection;
