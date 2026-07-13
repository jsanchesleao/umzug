import { useRef, useState } from "react";
import {
  buildAllApartmentsExport,
  detectCollisions,
  downloadJson,
  importApartments,
  parseImportPayload,
  type CollisionResolution,
  type ExportedApartment,
  type ImportOutcome,
} from "../data/importExport";
import ImportCollisionDialog from "./ImportCollisionDialog";

type Status = { type: "error" | "success"; message: string } | null;

interface PendingImport {
  apartments: ExportedApartment[];
  collisionCount: number;
}

function describeOutcome(outcome: ImportOutcome): string {
  const parts: string[] = [];
  if (outcome.inserted) parts.push(`${outcome.inserted} imported`);
  if (outcome.copied) parts.push(`${outcome.copied} imported as ${outcome.copied === 1 ? "a copy" : "copies"}`);
  if (outcome.overwritten) parts.push(`${outcome.overwritten} overwritten`);
  return parts.length > 0 ? `${parts.join(", ")}.` : "Nothing to import.";
}

function ImportExportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [includePhotos, setIncludePhotos] = useState(false);

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
      <button type="button" className="btn btn-sm" onClick={handleExportAll}>
        Export all
      </button>
      <label className="filter-checkbox">
        <input
          type="checkbox"
          checked={includePhotos}
          onChange={(e) => setIncludePhotos(e.target.checked)}
        />
        Include photos
      </label>
      <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
        Import
      </button>
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
    </div>
  );
}

export default ImportExportBar;
