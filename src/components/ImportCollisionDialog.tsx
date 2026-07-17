import { useState } from "react";
import Modal from "./Modal";
import type { CollisionResolution } from "../data/importExport";

interface ImportCollisionDialogProps {
  count: number;
  entityLabel?: string;
  /** Backups that don't reliably carry photos/sketches (cloud backup, full-backup transfers) can offer to preserve the local ones instead of erasing them on overwrite. */
  showKeepMediaOption?: boolean;
  onResolve: (resolution: CollisionResolution, keepExistingMedia: boolean) => void;
  onCancel: () => void;
}

function ImportCollisionDialog({
  count,
  entityLabel = "apartment",
  showKeepMediaOption = false,
  onResolve,
  onCancel,
}: ImportCollisionDialogProps) {
  const [keepExistingMedia, setKeepExistingMedia] = useState(true);

  return (
    <Modal title={`${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} already exists`} onClose={onCancel}>
      <p>
        {count === 1
          ? `1 ${entityLabel} in this file already exists in your data.`
          : `${count} ${entityLabel}s in this file already exist in your data.`}{" "}
        How should they be imported?
      </p>
      {showKeepMediaOption && (
        <label className="case-file-menu-checkbox">
          <input
            type="checkbox"
            checked={keepExistingMedia}
            onChange={(e) => setKeepExistingMedia(e.target.checked)}
          />
          Keep existing photos and sketches when overwriting
        </label>
      )}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => onResolve("overwrite", keepExistingMedia)}
        >
          Overwrite existing
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onResolve("copy", keepExistingMedia)}
          autoFocus
        >
          Import as copies
        </button>
      </div>
    </Modal>
  );
}

export default ImportCollisionDialog;
