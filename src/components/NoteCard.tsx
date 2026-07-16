import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import ConfirmDialog from "./ConfirmDialog";
import TextNoteModal from "./TextNoteModal";
import NoteSketchPad from "./NoteSketchPad";
import type { NoteLike } from "../types";

interface NoteCardProps {
  note: NoteLike;
  onSubmitText: (text: string) => Promise<void>;
  onSubmitSketch: (blob: Blob) => Promise<void>;
  onDelete: () => Promise<void>;
  style?: CSSProperties;
  className?: string;
}

// A stable pseudo-random rotation per note (derived from its id) so cards read as
// hand-placed sticky notes without jittering on every re-render.
function rotationForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const range = 4;
  return (Math.abs(hash) % (range * 2 + 1)) - range;
}

function NoteCard({ note, onSubmitText, onSubmitSketch, onDelete, style, className }: NoteCardProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (note.kind !== "sketch" || !note.blob) return;
    const objectUrl = URL.createObjectURL(note.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external resource (object URL), not deriving render state
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [note.kind, note.blob]);

  async function handleDelete() {
    await onDelete();
    setConfirmingDelete(false);
  }

  return (
    <>
      <div
        className={`note-card note-color-${note.color}${className ? ` ${className}` : ""}`}
        style={{ transform: `rotate(${rotationForId(note.id)}deg)`, ...style }}
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setEditing(true);
        }}
      >
        <button
          type="button"
          className="note-card-delete"
          aria-label="Delete note"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
        >
          ×
        </button>
        {note.kind === "text" ? (
          <p className="note-card-text">{note.text}</p>
        ) : (
          <div className="note-card-sketch-thumb">
            {url && <img src={url} alt="Sketch note" className="sketch-ink" />}
          </div>
        )}
      </div>

      {editing && note.kind === "text" && (
        <TextNoteModal note={note} onClose={() => setEditing(false)} onSubmit={onSubmitText} onDelete={onDelete} />
      )}
      {editing && note.kind === "sketch" && (
        <NoteSketchPad note={note} onClose={() => setEditing(false)} onSubmit={onSubmitSketch} onDelete={onDelete} />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete note?"
          message="This note will be permanently deleted."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}

export default NoteCard;
