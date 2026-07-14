import { useEffect, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import { QRCodeSVG } from "qrcode.react";
import Modal from "./Modal";
import { buildPairingLink, createHostPeer, destroyPeer } from "../data/p2p";
import {
  DOC_LINK_PARAM,
  DOC_PEER_PREFIX,
  sendDocuments,
  type DocTransferMessage,
} from "../data/p2pDocs";
import { useVault } from "../documents/useVault";
import { formatBytes } from "../utils/format";
import type { SelectedDocument } from "../utils/docPaths";

interface DocSendModalProps {
  docs: SelectedDocument[];
  onClose: () => void;
}

type SendState =
  | { phase: "connecting" }
  | { phase: "waiting"; code: string; stale: boolean }
  | { phase: "sending"; code: string; sent: number; total: number }
  | { phase: "done"; count: number }
  | { phase: "error"; message: string };

function DocSendModal({ docs, onClose }: DocSendModalProps) {
  const { getBytes } = useVault();
  const [state, setState] = useState<SendState>({ phase: "connecting" });

  useEffect(() => {
    let cancelled = false;
    let peer: Peer | null = null;
    let conn: DataConnection | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | null = null;

    function acceptConnection(connection: DataConnection) {
      if (conn) {
        // Only the first connection to this share session is accepted.
        connection.close();
        return;
      }
      conn = connection;
      if (staleTimer) clearTimeout(staleTimer);

      connection.on("open", async () => {
        if (cancelled) return;
        const total = docs.reduce((sum, doc) => sum + doc.entry.size, 0);
        setState((prev) =>
          prev.phase === "waiting" ? { phase: "sending", code: prev.code, sent: 0, total } : prev,
        );
        try {
          await sendDocuments(connection, docs, getBytes, (sent, totalBytes) => {
            if (cancelled) return;
            setState((prev) =>
              prev.phase === "sending" ? { ...prev, sent, total: totalBytes } : prev,
            );
          });
        } catch (error) {
          if (cancelled) return;
          const message =
            error instanceof Error ? error.message : "Failed to prepare documents to send.";
          try {
            connection.send({ type: "doc-error", message } satisfies DocTransferMessage);
          } catch {
            // Connection already gone.
          }
          setState({ phase: "error", message });
        }
      });

      connection.on("data", (data) => {
        if (cancelled) return;
        const message = data as DocTransferMessage;
        if (message.type === "doc-ack") {
          setState({ phase: "done", count: message.count });
        } else if (message.type === "doc-error") {
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

    createHostPeer(DOC_PEER_PREFIX)
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

  const docCount = `${docs.length} document${docs.length === 1 ? "" : "s"}`;

  return (
    <Modal title="Send documents" onClose={onClose}>
      {state.phase === "connecting" && <p>Connecting to the pairing server…</p>}

      {state.phase === "waiting" && (
        <>
          <p>
            Ready to send {docCount}. On the receiving device, open Documents, unlock the vault,
            and choose Receive.
          </p>
          <div className="p2p-qr">
            <QRCodeSVG value={buildPairingLink(state.code, DOC_LINK_PARAM)} size={200} />
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
                navigator.clipboard.writeText(buildPairingLink(state.code, DOC_LINK_PARAM))
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

      {state.phase === "sending" && (
        <>
          <p>Sending {docCount}…</p>
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
          Delivered {state.count} document{state.count === 1 ? "" : "s"}.
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

export default DocSendModal;
