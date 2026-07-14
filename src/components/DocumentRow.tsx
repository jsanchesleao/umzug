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
    </li>
  );
}

export default DocumentRow;
