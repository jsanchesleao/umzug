import { useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import QrScanner from "qr-scanner";
import Modal from "./Modal";
import ImportCollisionDialog from "./ImportCollisionDialog";
import { connectToHost, createGuestPeer, destroyPeer, parsePairingInput } from "../data/p2p";
import { BACKUP_LINK_PARAM, BACKUP_PEER_PREFIX, type BackupMessage } from "../data/p2pBackup";
import { createDocReceiver, type DocTransferMessage } from "../data/p2pDocs";
import {
  countCollisions,
  describeFullBackupOutcome,
  detectFullBackupCollisions,
  importFullBackup,
  parseFullBackupPayload,
  type ExportedBackup,
  type FullBackupOutcome,
} from "../data/fullBackup";
import type { CollisionResolution } from "../data/importExport";
import { useVault } from "../documents/useVault";
import { isAcceptedDocType } from "../documents/types";
import { pathName } from "../utils/docPaths";
import { formatBytes } from "../utils/format";

interface FullBackupReceiveModalProps {
  initialCode?: string;
  onClose: () => void;
}

type ReceiveState =
  | { phase: "scan"; error: string | null }
  | { phase: "manual"; error: string | null }
  | { phase: "connecting" }
  | { phase: "receiving-core" }
  | { phase: "collision"; backup: ExportedBackup; collisionCount: number }
  | { phase: "receiving-docs"; received: number; total: number; count: number }
  | { phase: "done"; outcome: FullBackupOutcome; documentsReceived: number }
  | { phase: "error"; message: string };

function FullBackupReceiveModal({ initialCode, onClose }: FullBackupReceiveModalProps) {
  const vault = useVault();
  const [state, setState] = useState<ReceiveState>(
    initialCode ? { phase: "connecting" } : { phase: "scan", error: null },
  );
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const connectedRef = useRef(false);
  // Callbacks wired up once on connect would close over stale state, so the
  // vault's current unlocked status/addFiles is read from this ref.
  const vaultRef = useRef(vault);
  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);
  const outcomeRef = useRef<FullBackupOutcome | null>(null);

  function wireDocReceiver(conn: DataConnection) {
    createDocReceiver(conn, {
      onManifest: (docs, totalBytes) => {
        setState({ phase: "receiving-docs", received: 0, total: totalBytes, count: docs.length });
      },
      onDocComplete: async (meta, bytes) => {
        if (!isAcceptedDocType(meta.mimeType)) {
          throw new Error(`"${meta.name}" is not a PDF or image and was refused.`);
        }
        await vaultRef.current.addFiles(
          [{ name: pathName(meta.name) || "document", type: meta.mimeType, bytes, description: meta.description }],
          meta.folder,
        );
      },
      onProgress: (received, total) => {
        setState((prev) => (prev.phase === "receiving-docs" ? { ...prev, received, total } : prev));
      },
      onAllPersisted: (count) => {
        setState((prev) =>
          prev.phase === "receiving-docs"
            ? { phase: "done", outcome: outcomeRef.current!, documentsReceived: count }
            : prev,
        );
      },
      onError: (message) => {
        setState({ phase: "error", message });
      },
    });
  }

  async function finishImport(conn: DataConnection, backup: ExportedBackup, resolution: CollisionResolution) {
    try {
      const canReceiveDocuments = vaultRef.current.status === "unlocked";
      const outcome = await importFullBackup(
        backup,
        resolution,
        canReceiveDocuments ? { addFiles: vaultRef.current.addFiles } : undefined,
      );
      outcomeRef.current = outcome;
      conn.send({ type: "ack", outcome, canReceiveDocuments } satisfies BackupMessage);
      if (canReceiveDocuments) {
        setState({ phase: "receiving-docs", received: 0, total: 0, count: 0 });
        wireDocReceiver(conn);
      } else {
        setState({ phase: "done", outcome, documentsReceived: 0 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      conn.send({ type: "error", message } satisfies BackupMessage);
      setState({ phase: "error", message });
    }
  }

  function connectWithCode(code: string) {
    if (connectedRef.current) return;
    connectedRef.current = true;
    setState({ phase: "connecting" });

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      destroyPeer(peerRef.current);
      setState({ phase: "error", message: "Couldn't connect. Check the code and try again." });
    }, 15_000);

    createGuestPeer()
      .then((peer) => {
        peerRef.current = peer;
        const conn = connectToHost(peer, code, BACKUP_PEER_PREFIX);
        connRef.current = conn;

        conn.on("open", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setState({ phase: "receiving-core" });
        });

        conn.on("data", async (data) => {
          const message = data as BackupMessage | DocTransferMessage;
          if (message.type !== "payload") return;

          try {
            const backup = parseFullBackupPayload(message.data);
            const collisions = await detectFullBackupCollisions(backup);
            const collisionCount = countCollisions(collisions);
            if (collisionCount > 0) {
              setState({ phase: "collision", backup, collisionCount });
              return;
            }
            await finishImport(conn, backup, "copy");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Received invalid data.";
            conn.send({ type: "error", message: errorMessage } satisfies BackupMessage);
            setState({ phase: "error", message: errorMessage });
          }
        });

        conn.on("close", () => {
          setState((prev) =>
            prev.phase === "done" || prev.phase === "error"
              ? prev
              : { phase: "error", message: "Connection closed before the transfer finished." },
          );
        });

        conn.on("error", () => {
          setState({ phase: "error", message: "Connection error during transfer." });
        });
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        setState({ phase: "error", message: "Couldn't reach the pairing server." });
      });
  }

  useEffect(() => {
    if (initialCode) connectWithCode(initialCode);
    return () => {
      connRef.current?.close();
      destroyPeer(peerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.phase !== "scan" || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const code = parsePairingInput(result.data, BACKUP_LINK_PARAM);
        if (code) connectWithCode(code);
      },
      { returnDetailedScanResult: true },
    );

    scanner.start().catch(() => {
      setState({ phase: "manual", error: "Camera unavailable — enter the code instead." });
    });

    return () => {
      scanner.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  async function handleResolveCollisions(resolution: CollisionResolution) {
    if (state.phase !== "collision") return;
    const conn = connRef.current;
    if (!conn) return;
    await finishImport(conn, state.backup, resolution);
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = parsePairingInput(manualInput, BACKUP_LINK_PARAM);
    if (!code) {
      setState({ phase: "manual", error: "Enter a valid pairing code or link." });
      return;
    }
    connectWithCode(code);
  }

  return (
    <Modal title="Receive everything" onClose={onClose}>
      {state.phase === "scan" && (
        <>
          <p>Point the camera at the pairing QR code shown on the other device.</p>
          <video ref={videoRef} className="p2p-video" muted playsInline />
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setState({ phase: "manual", error: null })}
          >
            Enter code instead
          </button>
        </>
      )}

      {state.phase === "manual" && (
        <form onSubmit={handleManualSubmit}>
          {state.error && <div className="banner banner-error">{state.error}</div>}
          <div className="form-field">
            <label htmlFor="backup-manual-code">Pairing code or link</label>
            <input
              id="backup-manual-code"
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setState({ phase: "scan", error: null })}
            >
              Scan QR instead
            </button>
            <button type="submit" className="btn btn-primary">
              Connect
            </button>
          </div>
        </form>
      )}

      {state.phase === "connecting" && <p>Connecting…</p>}
      {state.phase === "receiving-core" && <p>Connected — waiting for data…</p>}

      {state.phase === "receiving-docs" && (
        <>
          <p>
            {state.count > 0
              ? `Receiving ${state.count} document${state.count === 1 ? "" : "s"}…`
              : "Apartments, tasks, and notes received — waiting for documents…"}
          </p>
          {state.total > 0 && (
            <>
              <div className="doc-progress">
                <div
                  className="doc-progress-fill"
                  style={{ width: `${(state.received / state.total) * 100}%` }}
                />
              </div>
              <p className="doc-progress-label">
                {formatBytes(state.received)} of {formatBytes(state.total)}
              </p>
            </>
          )}
        </>
      )}

      {state.phase === "done" && (
        <p>
          Received — {describeFullBackupOutcome(state.outcome)}{" "}
          {state.documentsReceived > 0
            ? `${state.documentsReceived} document${state.documentsReceived === 1 ? "" : "s"} received.`
            : ""}
        </p>
      )}
      {state.phase === "error" && <div className="banner banner-error">{state.message}</div>}

      {state.phase !== "manual" && state.phase !== "collision" && (
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {state.phase === "done" || state.phase === "error" ? "Close" : "Cancel"}
          </button>
        </div>
      )}

      {state.phase === "collision" && (
        <ImportCollisionDialog
          count={state.collisionCount}
          entityLabel="item"
          onResolve={handleResolveCollisions}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}

export default FullBackupReceiveModal;
