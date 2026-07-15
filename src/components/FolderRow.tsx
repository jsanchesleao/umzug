import { useRef } from "react";
import { pathName } from "../utils/docPaths";

interface FolderRowProps {
  path: string;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function FolderRow({ path, selected, onToggleSelected, onOpen, onRename, onDelete }: FolderRowProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function withClose(action: () => void) {
    return () => {
      if (menuRef.current) menuRef.current.open = false;
      action();
    };
  }

  return (
    <li className={selected ? "doc-row doc-row-folder doc-row-selected" : "doc-row doc-row-folder"}>
      <input
        type="checkbox"
        className="doc-row-checkbox"
        aria-label={`Select folder ${pathName(path)}`}
        checked={selected}
        onChange={(e) => onToggleSelected(e.target.checked)}
      />
      <button type="button" className="doc-row-main" onClick={onOpen}>
        <span className="doc-row-icon" aria-hidden="true">
          📁
        </span>
        <span className="doc-row-text">
          <span className="doc-row-name">{pathName(path)}</span>
        </span>
      </button>
      <div className="doc-row-actions">
        <button type="button" className="btn btn-sm" onClick={onRename}>
          Rename
        </button>
        <button type="button" className="btn btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
      <details className="status-menu doc-row-menu" ref={menuRef}>
        <summary className="status-menu-trigger" aria-label={`Actions for folder ${pathName(path)}`}>
          ⋮
        </summary>
        <div className="status-menu-list">
          <button type="button" className="status-menu-option" onClick={withClose(onRename)}>
            Rename
          </button>
          <button type="button" className="status-menu-option danger" onClick={withClose(onDelete)}>
            Delete
          </button>
        </div>
      </details>
    </li>
  );
}

export default FolderRow;
