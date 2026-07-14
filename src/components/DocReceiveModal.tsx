import { useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import QrScanner from "qr-scanner";
import Modal from "./Modal";
import FolderPickerModal from "./FolderPickerModal";
import { connectToHost, createGuestPeer, destroyPeer, parsePairingInput } from "../data/p2p";
import { createDocReceiver, DOC_LINK_PARAM, DOC_PEER_PREFIX } from "../data/p2pDocs";
import { useVault } from "../documents/useVault";
import { isAcceptedDocType } from "../documents/types";
import { joinPath, pathName } from "../utils/docPaths";
import { formatBytes } from "../utils/format";

interface DocReceiveModalProps {
  initialCode?: string;
  onClose: () => void;
}

type ReceiveState =
  | { phase: "destination" }
  | { phase: "scan"; error: string | null }
  | { phase: "manual"; error: string | null }
  | { phase: "connecting" }
  | { phase: "receiving"; received: number; total: number; count: number }
  | { phase: "done"; count: number }
  | { phase: "error"; message: string };

function DocReceiveModal({ initialCode, onClose }: DocReceiveModalProps) {
  const { addFiles } = useVault();
  const [state, setState] = useState<ReceiveState>({ phase: "destination" });
  const [manualInput, setManualInput] = useState("");
  const [destination, setDestination] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const connectedRef = useRef(false);
  // The receiver callbacks are wired up once on connect and would close over
  // stale state, so they read the destination from this ref.
  const destRef = useRef("");

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
        const conn = connectToHost(peer, code, DOC_PEER_PREFIX);
        connRef.current = conn;

        conn.on("open", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setState({ phase: "receiving", received: 0, total: 0, count: 0 });
        });

        createDocReceiver(conn, {
          onManifest: (docs, totalBytes) => {
            setState({ phase: "receiving", received: 0, total: totalBytes, count: docs.length });
          },
          onDocComplete: async (meta, bytes) => {
            if (!isAcceptedDocType(meta.mimeType)) {
              throw new Error(`"${meta.name}" is not a PDF or image and was refused.`);
            }
            await addFiles(
              [
                {
                  name: pathName(meta.name) || "document",
                  type: meta.mimeType,
                  bytes,
                  description: meta.description,
                },
              ],
              joinPath(destRef.current, meta.folder),
            );
          },
          onProgress: (received, total) => {
            setState((prev) =>
              prev.phase === "receiving" ? { ...prev, received, total } : prev,
            );
          },
          onAllPersisted: (count) => {
            setState({ phase: "done", count });
          },
          onError: (message) => {
            setState({ phase: "error", message });
          },
        });

        conn.on("close", () => {
          setState((prev) =>
            prev.phase === "done" || prev.phase === "error"
              ? prev
              : { phase: "error", message: "Connection closed before the transfer finished." },
          );
        });

        conn.on("error", () => {
          setState((prev) =>
            prev.phase === "done" || prev.phase === "error"
              ? prev
              : { phase: "error", message: "Connection error during transfer." },
          );
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
    return () => {
      connRef.current?.close();
      destroyPeer(peerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state.phase !== "scan" || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const code = parsePairingInput(result.data, DOC_LINK_PARAM);
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

  function handlePickDestination(path: string) {
    destRef.current = path;
    setDestination(path);
    if (initialCode) {
      connectWithCode(initialCode);
    } else {
      setState({ phase: "scan", error: null });
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = parsePairingInput(manualInput, DOC_LINK_PARAM);
    if (!code) {
      setState({ phase: "manual", error: "Enter a valid pairing code or link." });
      return;
    }
    connectWithCode(code);
  }

  if (state.phase === "destination") {
    return (
      <FolderPickerModal
        title="Receive documents into…"
        confirmLabel="Receive here"
        onPick={handlePickDestination}
        onClose={onClose}
      />
    );
  }

  const destinationLabel = destination === "" ? "Documents" : pathName(destination);

  return (
    <Modal title="Receive documents" onClose={onClose}>
      {state.phase === "scan" && (
        <>
          <p>Point the camera at the pairing QR code shown on the sending device.</p>
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
            <label htmlFor="doc-manual-code">Pairing code or link</label>
            <input
              id="doc-manual-code"
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

      {state.phase === "receiving" && (
        <>
          <p>
            {state.count > 0
              ? `Receiving ${state.count} document${state.count === 1 ? "" : "s"} into "${destinationLabel}"…`
              : "Connected — waiting for documents…"}
          </p>
          <div className="doc-progress">
            <div
              className="doc-progress-fill"
              style={{
                width: `${state.total > 0 ? (state.received / state.total) * 100 : 0}%`,
              }}
            />
          </div>
          {state.total > 0 && (
            <p className="doc-progress-label">
              {formatBytes(state.received)} of {formatBytes(state.total)}
            </p>
          )}
        </>
      )}

      {state.phase === "done" && (
        <p>
          Received {state.count} document{state.count === 1 ? "" : "s"} into "{destinationLabel}".
        </p>
      )}
      {state.phase === "error" && <div className="banner banner-error">{state.message}</div>}

      {state.phase !== "manual" && (
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {state.phase === "done" || state.phase === "error" ? "Close" : "Cancel"}
          </button>
        </div>
      )}
    </Modal>
  );
}

export default DocReceiveModal;
