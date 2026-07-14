import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useVault } from "../documents/useVault";
import { downloadBlob } from "../utils/zip";
import type { DocumentEntry } from "../documents/types";

interface DocumentViewerModalProps {
  entry: DocumentEntry;
  onClose: () => void;
}

function DocumentViewerModal({ entry, onClose }: DocumentViewerModalProps) {
  const { getBytes } = useVault();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create and revoke the object URL inside one effect (not useMemo) so
  // StrictMode's mount/cleanup/remount can't revoke a URL a fresh render
  // still uses — same pattern as PhotoThumb.
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    getBytes(entry)
      .then((bytes) => {
        if (cancelled) return;
        const decrypted = new Blob([bytes], { type: entry.mimeType });
        objectUrl = URL.createObjectURL(decrypted);
        setBlob(decrypted);
        setUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to decrypt the document.");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-decrypt only when the document changes
  }, [entry.id]);

  return (
    <Modal title={entry.name} onClose={onClose} variant="fullscreen">
      <div className="doc-viewer">
        {error && <div className="banner banner-error">{error}</div>}
        {!url && !error && <p>Decrypting…</p>}
        {url &&
          (entry.mimeType === "application/pdf" ? (
            <iframe src={url} title={entry.name} className="doc-viewer-frame" />
          ) : (
            <img src={url} alt={entry.name} className="doc-viewer-image" />
          ))}
        {entry.description && <p className="doc-viewer-desc">{entry.description}</p>}
      </div>
      <div className="modal-actions">
        <button
          type="button"
          className="btn"
          disabled={!blob}
          onClick={() => blob && downloadBlob(entry.name, blob)}
        >
          Download
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export default DocumentViewerModal;
