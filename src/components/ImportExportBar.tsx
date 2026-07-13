import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildAllApartmentsExport,
  describeOutcome,
  detectCollisions,
  downloadJson,
  importApartments,
  parseImportPayload,
  type CollisionResolution,
  type ExportedApartment,
} from "../data/importExport";
import ImportCollisionDialog from "./ImportCollisionDialog";
import P2PSendModal from "./P2PSendModal";
import P2PReceiveModal from "./P2PReceiveModal";

type Status = { type: "error" | "success"; message: string } | null;

interface PendingImport {
  apartments: ExportedApartment[];
  collisionCount: number;
}

function ImportExportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [p2pModal, setP2PModal] = useState<"send" | "receive" | null>(null);
  const [initialPairingCode, setInitialPairingCode] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  // A scanned QR code deep-links back into the app with ?p2p=<code>; open the
  // Receive modal pre-filled with it and strip the param so a reload/back
  // navigation doesn't reopen it.
  useEffect(() => {
    const code = searchParams.get("p2p");
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external system (the URL) on mount, not deriving render state
      setInitialPairingCode(code);
      setP2PModal("receive");
      setSearchParams((params) => {
        params.delete("p2p");
        return params;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExportAll() {
    const apartments = await buildAllApartmentsExport(includePhotos);
    downloadJson(`umzug-export-${new Date().toISOString().slice(0, 10)}.json`, apartments);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus(null);
    try {
      const text = await file.text();
      const apartments = parseImportPayload(text);
      if (apartments.length === 0) {
        setStatus({ type: "error", message: "File contains no apartments." });
        return;
      }

      const collidingIds = await detectCollisions(apartments);
      if (collidingIds.length > 0) {
        setPendingImport({ apartments, collisionCount: collidingIds.length });
        return;
      }

      const outcome = await importApartments(apartments, "copy");
      setStatus({ type: "success", message: describeOutcome(outcome) });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  async function handleResolveCollisions(resolution: CollisionResolution) {
    if (!pendingImport) return;
    try {
      const outcome = await importApartments(pendingImport.apartments, resolution);
      setStatus({ type: "success", message: describeOutcome(outcome) });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      setPendingImport(null);
    }
  }

  return (
    <div className="import-export-bar">
      <details className="status-menu" ref={menuRef}>
        <summary className="status-menu-trigger" aria-label="Import and export actions">
          ☰
        </summary>
        <div className="status-menu-list dashboard-menu-list">
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              handleExportAll();
              closeMenu();
            }}
          >
            Export all
          </button>
          <label className="case-file-menu-checkbox">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
            />
            Include photos & sketches
          </label>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              fileInputRef.current?.click();
              closeMenu();
            }}
          >
            Import
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              setP2PModal("send");
              closeMenu();
            }}
          >
            Send (all)
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              setInitialPairingCode(undefined);
              setP2PModal("receive");
              closeMenu();
            }}
          >
            Receive
          </button>
        </div>
      </details>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Import apartments from JSON file"
        onChange={handleFileChange}
      />

      {status && (
        <div className={status.type === "error" ? "banner banner-error" : "banner banner-success"}>
          {status.message}
          <button
            type="button"
            className="banner-dismiss"
            aria-label="Dismiss"
            onClick={() => setStatus(null)}
          >
            ×
          </button>
        </div>
      )}

      {pendingImport && (
        <ImportCollisionDialog
          count={pendingImport.collisionCount}
          onResolve={handleResolveCollisions}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {p2pModal === "send" && (
        <P2PSendModal scope="all" onClose={() => setP2PModal(null)} />
      )}
      {p2pModal === "receive" && (
        <P2PReceiveModal initialCode={initialPairingCode} onClose={() => setP2PModal(null)} />
      )}
    </div>
  );
}

export default ImportExportBar;
