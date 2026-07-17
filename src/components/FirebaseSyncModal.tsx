import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import Modal from "./Modal";
import ImportCollisionDialog from "./ImportCollisionDialog";
import {
  downloadBackup,
  isFirestoreSizeLimitError,
  onFirebaseAuthChange,
  signInWithGoogle,
  signOutOfFirebase,
  uploadBackup,
} from "../data/firebaseSync";
import {
  buildFullBackup,
  countCollisions,
  describeFullBackupOutcome,
  detectFullBackupCollisions,
  importFullBackup,
  parseFullBackupPayload,
  type ExportedBackup,
} from "../data/fullBackup";
import type { CollisionResolution } from "../data/importExport";

interface FirebaseSyncModalProps {
  onClose: () => void;
}

type SyncPhase =
  | { kind: "idle"; lastBackupAt: Date | null }
  | { kind: "signing-in" }
  | { kind: "backing-up" }
  | { kind: "restoring" }
  | { kind: "collision"; backup: ExportedBackup; collisionCount: number }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

function formatTimestamp(date: Date): string {
  return date.toLocaleString();
}

function FirebaseSyncModal({ onClose }: FirebaseSyncModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<SyncPhase>({ kind: "idle", lastBackupAt: null });

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onFirebaseAuthChange((nextUser) => {
      if (cancelled) return;
      setUser(nextUser);
      setPhase({ kind: "idle", lastBackupAt: null });
      if (!nextUser) return;

      downloadBackup(nextUser.uid)
        .then((result) => {
          if (cancelled) return;
          setPhase((prev) => (prev.kind === "idle" ? { kind: "idle", lastBackupAt: result?.updatedAt ?? null } : prev));
        })
        .catch(() => {
          // Leave lastBackupAt as null — this is only informational.
        });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function handleSignIn() {
    setPhase({ kind: "signing-in" });
    try {
      await signInWithGoogle();
      // onFirebaseAuthChange fires next, setting `user` and resetting phase to "idle".
    } catch (error) {
      setPhase({ kind: "error", message: error instanceof Error ? error.message : "Sign-in failed." });
    }
  }

  async function handleSignOut() {
    await signOutOfFirebase();
  }

  async function handleBackUp() {
    if (!user) return;
    setPhase({ kind: "backing-up" });
    try {
      let sketchesIncluded = true;
      const backup = await buildFullBackup({ includePhotos: false, includeSketches: true });
      try {
        await uploadBackup(user.uid, backup);
      } catch (error) {
        if (!isFirestoreSizeLimitError(error)) throw error;
        sketchesIncluded = false;
        const smallerBackup = await buildFullBackup({ includePhotos: false, includeSketches: false });
        await uploadBackup(user.uid, smallerBackup);
      }
      setPhase({
        kind: "done",
        message: sketchesIncluded
          ? `Backed up as of ${formatTimestamp(new Date())}.`
          : `Backed up as of ${formatTimestamp(new Date())}. Sketches were left out — the backup was too large to store.`,
      });
    } catch (error) {
      setPhase({ kind: "error", message: error instanceof Error ? error.message : "Backup failed." });
    }
  }

  async function handleRestore() {
    if (!user) return;
    setPhase({ kind: "restoring" });
    try {
      const result = await downloadBackup(user.uid);
      if (!result) {
        setPhase({ kind: "error", message: "No cloud backup found for this account." });
        return;
      }
      const backup = parseFullBackupPayload(result.text);
      const collisions = await detectFullBackupCollisions(backup);
      const collisionCount = countCollisions(collisions);
      if (collisionCount > 0) {
        setPhase({ kind: "collision", backup, collisionCount });
        return;
      }
      const outcome = await importFullBackup(backup, "copy");
      setPhase({ kind: "done", message: describeFullBackupOutcome(outcome) });
    } catch (error) {
      setPhase({ kind: "error", message: error instanceof Error ? error.message : "Restore failed." });
    }
  }

  async function handleResolveCollisions(resolution: CollisionResolution, keepExistingMedia: boolean) {
    if (phase.kind !== "collision") return;
    try {
      const outcome = await importFullBackup(phase.backup, resolution, undefined, keepExistingMedia);
      const message =
        resolution === "overwrite" && keepExistingMedia
          ? `${describeFullBackupOutcome(outcome)} Existing photos and sketches were kept.`
          : describeFullBackupOutcome(outcome);
      setPhase({ kind: "done", message });
    } catch (error) {
      setPhase({ kind: "error", message: error instanceof Error ? error.message : "Restore failed." });
    }
  }

  const busy = phase.kind === "backing-up" || phase.kind === "restoring";

  return (
    <Modal title="Cloud backup" onClose={onClose}>
      {!user && (
        <>
          <p>
            Sign in with Google to back up or restore your apartments, tasks, and notes via the cloud.
            Photos aren't included.
          </p>
          {phase.kind === "error" && <div className="banner banner-error">{phase.message}</div>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSignIn}
            disabled={phase.kind === "signing-in"}
          >
            {phase.kind === "signing-in" ? "Signing in…" : "Sign in with Google"}
          </button>
        </>
      )}

      {user && (
        <>
          <p>Signed in as {user.email ?? user.displayName ?? "your Google account"}.</p>
          {phase.kind === "idle" && (
            <p>
              {phase.lastBackupAt
                ? `Last cloud backup: ${formatTimestamp(phase.lastBackupAt)}.`
                : "No cloud backup yet."}
            </p>
          )}
          {phase.kind === "backing-up" && <p>Backing up…</p>}
          {phase.kind === "restoring" && <p>Restoring…</p>}
          {phase.kind === "done" && <p>{phase.message}</p>}
          {phase.kind === "error" && <div className="banner banner-error">{phase.message}</div>}

          {phase.kind !== "collision" && (
            <div className="options-backup-actions">
              <button type="button" className="btn btn-primary" onClick={handleBackUp} disabled={busy}>
                Back up now
              </button>
              <button type="button" className="btn" onClick={handleRestore} disabled={busy}>
                Restore from cloud
              </button>
              <button type="button" className="btn" onClick={handleSignOut} disabled={busy}>
                Sign out
              </button>
            </div>
          )}

          {phase.kind === "collision" && (
            <ImportCollisionDialog
              count={phase.collisionCount}
              entityLabel="item"
              showKeepMediaOption
              onResolve={handleResolveCollisions}
              onCancel={onClose}
            />
          )}
        </>
      )}

      {phase.kind !== "collision" && (
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}

export default FirebaseSyncModal;
