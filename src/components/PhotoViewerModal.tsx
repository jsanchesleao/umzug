import { useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { deletePhoto, updatePhotoCaption } from "../data/photos";
import type { Photo } from "../types";

interface PhotoViewerModalProps {
  photo: Photo;
  url: string;
  onClose: () => void;
}

function PhotoViewerModal({ photo, url, onClose }: PhotoViewerModalProps) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dirty = caption !== (photo.caption ?? "");

  async function handleSaveCaption() {
    setSaving(true);
    try {
      await updatePhotoCaption(photo.id, caption.trim() === "" ? null : caption);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deletePhoto(photo.id);
    onClose();
  }

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete photo"
        message="Delete this photo? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <Modal title="Photo" onClose={onClose}>
      <img src={url} alt={photo.caption ?? "Apartment photo"} className="photo-viewer-image" />

      <div className="form-field">
        <label htmlFor="photo-caption">Caption</label>
        <input
          id="photo-caption"
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
          Delete
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveCaption}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save caption"}
        </button>
      </div>
    </Modal>
  );
}

export default PhotoViewerModal;
