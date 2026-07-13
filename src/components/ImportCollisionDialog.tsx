import Modal from "./Modal";
import type { CollisionResolution } from "../data/importExport";

interface ImportCollisionDialogProps {
  count: number;
  onResolve: (resolution: CollisionResolution) => void;
  onCancel: () => void;
}

function ImportCollisionDialog({ count, onResolve, onCancel }: ImportCollisionDialogProps) {
  return (
    <Modal title="Apartment already exists" onClose={onCancel}>
      <p>
        {count === 1
          ? "1 apartment in this file already exists in your data."
          : `${count} apartments in this file already exist in your data.`}{" "}
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
