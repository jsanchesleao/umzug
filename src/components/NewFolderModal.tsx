import { useState } from "react";
import Modal from "./Modal";
import { validateFolderName } from "../utils/folderForm";

interface NewFolderModalProps {
  title: string;
  submitLabel: string;
  initialName?: string;
  /** Names already taken among the folder's future siblings. */
  siblingNames: string[];
  onSubmit: (name: string) => Promise<void> | void;
  onClose: () => void;
}

function NewFolderModal({
  title,
  submitLabel,
  initialName = "",
  siblingNames,
  onSubmit,
  onClose,
}: NewFolderModalProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateFolderName(name, siblingNames);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the folder.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="folder-name">Folder name</label>
          <input
            id="folder-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <span className="field-error">{error}</span>}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NewFolderModal;
