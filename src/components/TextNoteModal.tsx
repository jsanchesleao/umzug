import { useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import type { NoteLike } from "../types";

interface TextNoteModalProps {
  note?: NoteLike;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function TextNoteModal({ note, onClose, onSubmit, onDelete }: TextNoteModalProps) {
  const [text, setText] = useState(note?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    await onDelete();
    onClose();
  }

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete note?"
        message="This note will be permanently deleted."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <Modal title={note ? "Edit Note" : "New Note"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            autoFocus
            placeholder="Write a note..."
          />
        </div>
        <div className="modal-actions">
          {note && onDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !text.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TextNoteModal;
