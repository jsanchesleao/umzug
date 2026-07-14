import Modal from "./Modal";
import type { CollisionResolution } from "../data/importExport";

interface ImportCollisionDialogProps {
  count: number;
  entityLabel?: string;
  onResolve: (resolution: CollisionResolution) => void;
  onCancel: () => void;
}

function ImportCollisionDialog({
  count,
  entityLabel = "apartment",
  onResolve,
  onCancel,
}: ImportCollisionDialogProps) {
  return (
    <Modal title={`${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} already exists`} onClose={onCancel}>
      <p>
        {count === 1
          ? `1 ${entityLabel} in this file already exists in your data.`
          : `${count} ${entityLabel}s in this file already exist in your data.`}{" "}
        How should they be imported?
      </p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onResolve("overwrite")}>
          Overwrite existing
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onResolve("copy")}
          autoFocus
        >
          Import as copies
        </button>
      </div>
    </Modal>
  );
}

export default ImportCollisionDialog;
