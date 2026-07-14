import { useState } from "react";
import Modal from "./Modal";
import { useVault } from "../documents/useVault";
import {
  entryToFormValues,
  validateDocumentForm,
  type DocumentFormErrors,
} from "../utils/documentForm";
import { listEntriesInFolder, uniqueName } from "../utils/docPaths";
import type { DocumentEntry } from "../documents/types";

interface DocumentEditModalProps {
  entry: DocumentEntry;
  onClose: () => void;
}

function DocumentEditModal({ entry, onClose }: DocumentEditModalProps) {
  const { mutateIndex } = useVault();
  const [values, setValues] = useState(() => entryToFormValues(entry));
  const [errors, setErrors] = useState<DocumentFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateDocumentForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await mutateIndex((index) => {
        const siblings = listEntriesInFolder(index, entry.folder)
          .filter((e) => e.id !== entry.id)
          .map((e) => e.name);
        const name = uniqueName(values.name.trim(), siblings);
        return {
          ...index,
          entries: index.entries.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  name,
                  description: values.description.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : e,
          ),
        };
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save changes.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit document" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="doc-edit-name">Name</label>
          <input
            id="doc-edit-name"
            type="text"
            autoFocus
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="doc-edit-description">Description</label>
          <textarea
            id="doc-edit-description"
            rows={3}
            value={values.description}
            onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        {submitError && <div className="banner banner-error">{submitError}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default DocumentEditModal;
