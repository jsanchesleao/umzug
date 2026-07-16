import { useState } from "react";
import Modal from "./Modal";
import NoteCard from "./NoteCard";
import TextNoteModal from "./TextNoteModal";
import NoteSketchPad from "./NoteSketchPad";
import type { DashboardNoteKind, FloatingNoteBase } from "../types";

export interface FloatingNoteCreateInput {
  kind: DashboardNoteKind;
  text: string | null;
  blob: Blob | null;
  x: number;
  y: number;
}

interface FloatingNotesModalProps {
  notes: FloatingNoteBase[];
  onClose: () => void;
  onCreate: (input: FloatingNoteCreateInput) => Promise<void>;
  onUpdateText: (id: string, text: string) => Promise<void>;
  onUpdateSketch: (id: string, blob: Blob) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function nextPosition(count: number) {
  return { x: 24 + (count % 6) * 28, y: 24 + Math.floor(count / 6) * 28 };
}

function FloatingNotesModal({
  notes,
  onClose,
  onCreate,
  onUpdateText,
  onUpdateSketch,
  onDelete,
}: FloatingNotesModalProps) {
  const [creating, setCreating] = useState<"text" | "sketch" | null>(null);

  return (
    <Modal title="Floating Notes" onClose={onClose} variant="fullscreen">
      <div className="modal-actions">
        <button type="button" className="btn btn-sm" onClick={() => setCreating("text")}>
          + Text note
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setCreating("sketch")}>
          + Sketch note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="empty-column">No floating notes yet.</p>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSubmitText={(text) => onUpdateText(note.id, text)}
              onSubmitSketch={(blob) => onUpdateSketch(note.id, blob)}
              onDelete={() => onDelete(note.id)}
            />
          ))}
        </div>
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
    </Modal>
  );
}

export default FloatingNotesModal;
