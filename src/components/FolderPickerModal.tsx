import { useState } from "react";
import Modal from "./Modal";
import { useVault } from "../documents/useVault";
import { isSameOrDescendant, joinPath, listAllFolders, parentPath, pathName } from "../utils/docPaths";
import { validateFolderName } from "../utils/folderForm";

interface FolderPickerModalProps {
  title: string;
  confirmLabel: string;
  /** Folders whose entire subtrees are not valid destinations (e.g. a folder being moved). */
  excludeSubtreeOf?: string[];
  onPick: (path: string) => void;
  onClose: () => void;
}

/**
 * Picks a virtual folder, with on-the-fly creation. Newly typed folders only
 * become real once the caller persists the picked path (via ensureFolder /
 * moveInIndex / addDocument), so cancelling leaves no trace.
 */
function FolderPickerModal({
  title,
  confirmLabel,
  excludeSubtreeOf = [],
  onPick,
  onClose,
}: FolderPickerModalProps) {
  const { index } = useVault();
  const [selected, setSelected] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existing = index ? listAllFolders(index) : [];
  const options = [...new Set([...existing, ...created])]
    .sort()
    .filter((path) => !excludeSubtreeOf.some((root) => isSameOrDescendant(path, root)));

  function handleCreate() {
    const siblings = options.filter((path) => parentPath(path) === selected).map(pathName);
    const validationError = validateFolderName(newName, siblings);
    if (validationError) {
      setError(validationError);
      return;
    }
    const path = joinPath(selected, newName.trim());
    setCreated((prev) => [...prev, path]);
    setSelected(path);
    setNewName("");
    setError(null);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <ul className="folder-picker-list">
        <li>
          <button
            type="button"
            className={selected === "" ? "folder-picker-option selected" : "folder-picker-option"}
            onClick={() => setSelected("")}
          >
            📁 Documents (top level)
          </button>
        </li>
        {options.map((path) => (
          <li key={path}>
            <button
              type="button"
              className={
                selected === path ? "folder-picker-option selected" : "folder-picker-option"
              }
              style={{ paddingLeft: `${(path.split("/").length - 1) * 1.25 + 0.5}rem` }}
              onClick={() => setSelected(path)}
            >
              📁 {pathName(path)}
            </button>
          </li>
        ))}
      </ul>

      <div className="form-field">
        <label htmlFor="folder-picker-new">New subfolder</label>
        <div className="folder-picker-new-row">
          <input
            id="folder-picker-new"
            type="text"
            value={newName}
            placeholder="Name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <button type="button" className="btn btn-sm" onClick={handleCreate}>
            Add
          </button>
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onPick(selected)}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default FolderPickerModal;
