import { lazy, Suspense, useRef, useState } from "react";
import Modal from "./Modal";
import ImportCollisionDialog from "./ImportCollisionDialog";
import FullBackupSendModal from "./FullBackupSendModal";
import FullBackupReceiveModal from "./FullBackupReceiveModal";

// Lazy-loaded so the Firebase SDK is only fetched when this optional feature
// is actually used, instead of ballooning the app-shell bundle for everyone.
const FirebaseSyncModal = lazy(() => import("./FirebaseSyncModal"));
import { useSettings } from "../settings/useSettings";
import { useVault } from "../documents/useVault";
import { downloadJson, type CollisionResolution } from "../data/importExport";
import {
  buildFullBackup,
  countCollisions,
  describeFullBackupOutcome,
  detectFullBackupCollisions,
  importFullBackup,
  parseFullBackupPayload,
  type ExportedBackup,
} from "../data/fullBackup";
import {
  CURRENCY_CODES,
  CURRENCY_LABELS,
  DATE_FORMAT_LABELS,
  DATE_FORMAT_OPTIONS,
  THEME_MODES,
  THEME_MODE_LABELS,
} from "../types";
import type { CurrencyCode, DateFormatOption, ThemeMode } from "../types";

interface OptionsModalProps {
  onClose: () => void;
  initialBackupReceiveCode?: string;
}

type BackupStatus = { type: "error" | "success"; message: string } | null;

interface PendingBackupImport {
  backup: ExportedBackup;
  collisionCount: number;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function OptionsModal({ onClose, initialBackupReceiveCode }: OptionsModalProps) {
  const { settings, updateSettings } = useSettings();
  const vault = useVault();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>(null);
  const [pendingImport, setPendingImport] = useState<PendingBackupImport | null>(null);
  const [backupModal, setBackupModal] = useState<"send" | "receive" | null>(
    initialBackupReceiveCode ? "receive" : null,
  );
  const [firebaseSyncOpen, setFirebaseSyncOpen] = useState(false);

  const vaultForExport =
    vault.status === "unlocked" && vault.index ? { index: vault.index, getBytes: vault.getBytes } : undefined;
  const vaultForImport = vault.status === "unlocked" ? { addFiles: vault.addFiles } : undefined;

  async function handleExportAll() {
    const backup = await buildFullBackup({
      includePhotos: true,
      includeSketches: true,
      documents: vaultForExport,
    });
    downloadJson(`umzug-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
    const counts = `${pluralize(backup.apartments.length, "apartment")}, ${pluralize(backup.tasks.length, "task")}, ${pluralize(backup.dashboardNotes.length, "note")}`;
    setBackupStatus({
      type: "success",
      message: vaultForExport
        ? `Exported ${counts}, ${pluralize(backup.documents.length, "document")}.`
        : `Exported ${counts}. Documents skipped — unlock the vault to include them.`,
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBackupStatus(null);
    try {
      const text = await file.text();
      const backup = parseFullBackupPayload(text);
      const collisions = await detectFullBackupCollisions(backup);
      const collisionCount = countCollisions(collisions);
      if (collisionCount > 0) {
        setPendingImport({ backup, collisionCount });
        return;
      }

      const outcome = await importFullBackup(backup, "copy", vaultForImport);
      setBackupStatus({ type: "success", message: describeFullBackupOutcome(outcome) });
    } catch (error) {
      setBackupStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  async function handleResolveCollisions(resolution: CollisionResolution) {
    if (!pendingImport) return;
    try {
      const outcome = await importFullBackup(pendingImport.backup, resolution, vaultForImport);
      setBackupStatus({ type: "success", message: describeFullBackupOutcome(outcome) });
    } catch (error) {
      setBackupStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      setPendingImport(null);
    }
  }

  return (
    <Modal title="Options" onClose={onClose}>
      <div className="form-field">
        <label htmlFor="option-theme">Theme</label>
        <select
          id="option-theme"
          value={settings.theme}
          onChange={(e) => updateSettings({ theme: e.target.value as ThemeMode })}
        >
          {THEME_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {THEME_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="option-currency">Currency</label>
        <select
          id="option-currency"
          value={settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="option-date-format">Date format</label>
        <select
          id="option-date-format"
          value={settings.dateFormat}
          onChange={(e) => updateSettings({ dateFormat: e.target.value as DateFormatOption })}
        >
          {DATE_FORMAT_OPTIONS.map((format) => (
            <option key={format} value={format}>
              {DATE_FORMAT_LABELS[format]}
            </option>
          ))}
        </select>
      </div>

      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={settings.sketchIgnoreTouch}
          onChange={(e) => updateSettings({ sketchIgnoreTouch: e.target.checked })}
        />
        Ignore touch input while sketching (palm rejection)
      </label>

      <hr />

      <h3>Backup</h3>
      <p>Export or transfer everything — apartments, tasks, notes, and vault documents — at once.</p>

      <div className="options-backup-actions">
        <button type="button" className="btn" onClick={handleExportAll}>
          Export all data
        </button>
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
          Import from file
        </button>
        <button type="button" className="btn" onClick={() => setBackupModal("send")}>
          Send to another device
        </button>
        <button type="button" className="btn" onClick={() => setBackupModal("receive")}>
          Receive from another device
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Import a full backup from a JSON file"
        onChange={handleFileChange}
      />

      <hr />

      <h3>Cloud backup</h3>
      <p>Back up or restore apartments, tasks, and notes via a Google-signed-in Firebase account (photos aren't included).</p>
      <div className="options-backup-actions">
        <button type="button" className="btn" onClick={() => setFirebaseSyncOpen(true)}>
          Cloud backup (Google)
        </button>
      </div>

      {backupStatus && (
        <div className={backupStatus.type === "error" ? "banner banner-error" : "banner banner-success"}>
          {backupStatus.message}
          <button
            type="button"
            className="banner-dismiss"
            aria-label="Dismiss"
            onClick={() => setBackupStatus(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>

      {pendingImport && (
        <ImportCollisionDialog
          count={pendingImport.collisionCount}
          entityLabel="item"
          onResolve={handleResolveCollisions}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {backupModal === "send" && <FullBackupSendModal onClose={() => setBackupModal(null)} />}
      {backupModal === "receive" && (
        <FullBackupReceiveModal initialCode={initialBackupReceiveCode} onClose={() => setBackupModal(null)} />
      )}
      {firebaseSyncOpen && (
        <Suspense fallback={null}>
          <FirebaseSyncModal onClose={() => setFirebaseSyncOpen(false)} />
        </Suspense>
      )}
    </Modal>
  );
}

export default OptionsModal;
