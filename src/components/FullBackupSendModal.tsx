import { useEffect, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import { QRCodeSVG } from "qrcode.react";
import Modal from "./Modal";
import { buildPairingLink, createHostPeer, destroyPeer } from "../data/p2p";
import { BACKUP_LINK_PARAM, BACKUP_PEER_PREFIX, type BackupMessage } from "../data/p2pBackup";
import { sendDocuments, type DocTransferMessage } from "../data/p2pDocs";
import { buildFullBackup, describeFullBackupOutcome, type FullBackupOutcome } from "../data/fullBackup";
import { useVault } from "../documents/useVault";
import { joinPath } from "../utils/docPaths";
import { formatBytes } from "../utils/format";
import type { SelectedDocument } from "../utils/docPaths";

interface FullBackupSendModalProps {
  onClose: () => void;
}

type SendState =
  | { phase: "connecting" }
  | { phase: "waiting"; code: string; stale: boolean }
  | { phase: "sending-core" }
  | { phase: "sending-docs"; sent: number; total: number }
  | { phase: "done"; outcome: FullBackupOutcome; documentsSent: number }
  | { phase: "error"; message: string };

function FullBackupSendModal({ onClose }: FullBackupSendModalProps) {
  const vault = useVault();
  const [state, setState] = useState<SendState>({ phase: "connecting" });

  useEffect(() => {
    let cancelled = false;
    let peer: Peer | null = null;
    let conn: DataConnection | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | null = null;
    let coreOutcome: FullBackupOutcome | null = null;

    async function sendDocumentsPhase(connection: DataConnection, outcome: FullBackupOutcome) {
      coreOutcome = outcome;
      const docs: SelectedDocument[] =
        vault.status === "unlocked" && vault.index
          ? vault.index.entries.map((entry) => ({
              entry,
              relativePath: joinPath(entry.folder, entry.name),
            }))
          : [];

      if (docs.length === 0) {
        setState({ phase: "done", outcome, documentsSent: 0 });
        return;
      }

      const total = docs.reduce((sum, doc) => sum + doc.entry.size, 0);
      setState({ phase: "sending-docs", sent: 0, total });
      try {
        await sendDocuments(connection, docs, vault.getBytes, (sent, totalBytes) => {
          if (cancelled) return;
          setState((prev) =>
            prev.phase === "sending-docs" ? { ...prev, sent, total: totalBytes } : prev,
          );
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to prepare documents to send.";
        try {
          connection.send({ type: "doc-error", message } satisfies DocTransferMessage);
        } catch {
          // Connection already gone.
        }
        setState({ phase: "error", message });
      }
    }

    async function acceptConnection(connection: DataConnection) {
      if (conn) {
        // Only the first connection to this share session is accepted.
        connection.close();
        return;
      }
      conn = connection;
      if (staleTimer) clearTimeout(staleTimer);

      connection.on("open", async () => {
        if (cancelled) return;
        setState({ phase: "sending-core" });
        try {
          const backup = await buildFullBackup({ includePhotos: true, includeSketches: true });
          const message: BackupMessage = { type: "payload", data: JSON.stringify(backup) };
          connection.send(message);
        } catch (error) {
          if (cancelled) return;
          setState({
            phase: "error",
            message: error instanceof Error ? error.message : "Failed to prepare data to send.",
          });
        }
      });

      connection.on("data", (data) => {
        if (cancelled) return;
        const message = data as BackupMessage | DocTransferMessage;
        if (message.type === "ack") {
          if (message.canReceiveDocuments) {
            void sendDocumentsPhase(connection, message.outcome);
          } else {
            setState({ phase: "done", outcome: message.outcome, documentsSent: 0 });
          }
        } else if (message.type === "doc-ack") {
          if (coreOutcome) {
            setState({ phase: "done", outcome: coreOutcome, documentsSent: message.count });
          }
        } else if (message.type === "error" || message.type === "doc-error") {
          setState({ phase: "error", message: message.message });
        }
      });

      connection.on("close", () => {
        if (cancelled) return;
        setState((prev) =>
          prev.phase === "done" || prev.phase === "error"
            ? prev
            : { phase: "error", message: "Connection closed before the transfer finished." },
        );
      });

      connection.on("error", () => {
        if (cancelled) return;
        setState({ phase: "error", message: "Connection error during transfer." });
      });
    }

    createHostPeer(BACKUP_PEER_PREFIX)
      .then(({ peer: hostPeer, code }) => {
        if (cancelled) {
          destroyPeer(hostPeer);
          return;
        }
        peer = hostPeer;
        setState({ phase: "waiting", code, stale: false });

        staleTimer = setTimeout(() => {
          setState((prev) => (prev.phase === "waiting" ? { ...prev, stale: true } : prev));
        }, 180_000);

        hostPeer.on("connection", acceptConnection);
        hostPeer.on("error", () => {
          if (cancelled) return;
          setState({ phase: "error", message: "Lost connection to the pairing server." });
        });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setState({ phase: "error", message: error.message });
      });

    return () => {
      cancelled = true;
      if (staleTimer) clearTimeout(staleTimer);
      conn?.close();
      destroyPeer(peer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Send everything" onClose={onClose}>
      {state.phase === "connecting" && <p>Connecting to the pairing server…</p>}

      {state.phase === "waiting" && (
        <>
          <p>Sends every apartment, task, note, and — if the vault is unlocked — every document.</p>
          <div className="p2p-qr">
            <QRCodeSVG value={buildPairingLink(state.code, BACKUP_LINK_PARAM)} size={200} />
          </div>
          <div className="p2p-code-row">
            <code className="p2p-code">{state.code}</code>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => navigator.clipboard.writeText(state.code)}
            >
              Copy code
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                navigator.clipboard.writeText(buildPairingLink(state.code, BACKUP_LINK_PARAM))
              }
            >
              Copy link
            </button>
          </div>
          <p>
            {state.stale
              ? "Still waiting — check that both devices are online and the code matches."
              : "Waiting for the other device to scan or enter this code…"}
          </p>
        </>
      )}

      {state.phase === "sending-core" && <p>Connected — sending apartments, tasks, and notes…</p>}

      {state.phase === "sending-docs" && (
        <>
          <p>Sending documents…</p>
          <div className="doc-progress">
            <div
              className="doc-progress-fill"
              style={{ width: `${state.total > 0 ? (state.sent / state.total) * 100 : 100}%` }}
            />
          </div>
          <p className="doc-progress-label">
            {formatBytes(state.sent)} of {formatBytes(state.total)}
          </p>
        </>
      )}

      {state.phase === "done" && (
        <p>
          Sent — {describeFullBackupOutcome(state.outcome)}{" "}
          {state.documentsSent > 0
            ? `${state.documentsSent} document${state.documentsSent === 1 ? "" : "s"} delivered.`
            : ""}
        </p>
      )}
      {state.phase === "error" && <div className="banner banner-error">{state.message}</div>}

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {state.phase === "done" || state.phase === "error" ? "Close" : "Cancel"}
        </button>
      </div>
    </Modal>
  );
}

export default FullBackupSendModal;
