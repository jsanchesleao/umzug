import { useRef } from "react";
import type { DocumentEntry } from "../documents/types";
import { formatBytes } from "../utils/format";

interface DocumentRowProps {
  entry: DocumentEntry;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onOpen: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DocumentRow({
  entry,
  selected,
  onToggleSelected,
  onOpen,
  onDownload,
  onEdit,
  onDelete,
}: DocumentRowProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  function withClose(action: () => void) {
    return () => {
      closeMenu();
      action();
    };
  }

  return (
    <li className={selected ? "doc-row doc-row-selected" : "doc-row"}>
      <input
        type="checkbox"
        className="doc-row-checkbox"
        aria-label={`Select ${entry.name}`}
        checked={selected}
        onChange={(e) => onToggleSelected(e.target.checked)}
      />
      <button type="button" className="doc-row-main" onClick={onOpen}>
        <span className="doc-row-icon" aria-hidden="true">
          {entry.mimeType === "application/pdf" ? "📄" : "🖼"}
        </span>
        <span className="doc-row-text">
          <span className="doc-row-name">{entry.name}</span>
          {entry.description && <span className="doc-row-desc">{entry.description}</span>}
        </span>
        <span className="doc-row-size">{formatBytes(entry.size)}</span>
      </button>
      <div className="doc-row-actions">
        <button type="button" className="btn btn-sm" onClick={onDownload}>
          Download
        </button>
        <button type="button" className="btn btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
      <details className="status-menu doc-row-menu" ref={menuRef}>
        <summary className="status-menu-trigger" aria-label={`Actions for ${entry.name}`}>
          ⋮
        </summary>
        <div className="status-menu-list">
          <button type="button" className="status-menu-option" onClick={withClose(onDownload)}>
            Download
          </button>
          <button type="button" className="status-menu-option" onClick={withClose(onEdit)}>
            Edit
          </button>
          <button
            type="button"
            className="status-menu-option danger"
            onClick={withClose(onDelete)}
          >
            Delete
          </button>
        </div>
      </details>
    </li>
  );
}

export default DocumentRow;
