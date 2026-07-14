import { useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import QrScanner from "qr-scanner";
import Modal from "./Modal";
import ImportCollisionDialog from "./ImportCollisionDialog";
import { describeOutcome, type CollisionResolution, type ImportOutcome } from "../data/importExport";
import {
  detectTaskCollisions,
  importTasks,
  parseTaskImportPayload,
  type ExportedTask,
} from "../data/taskImportExport";
import { connectToHost, createGuestPeer, destroyPeer, parsePairingInput } from "../data/p2p";
import type { P2PMessage } from "../data/p2p";

const PEER_PREFIX = "umzugtask-";
const LINK_PARAM = "p2ptask";

interface TaskP2PReceiveModalProps {
  initialCode?: string;
  onClose: () => void;
}

type ReceiveState =
  | { phase: "scan"; error: string | null }
  | { phase: "manual"; error: string | null }
  | { phase: "connecting" }
  | { phase: "receiving" }
  | { phase: "collision"; tasks: ExportedTask[]; collisionCount: number }
  | { phase: "done"; outcome: ImportOutcome }
  | { phase: "error"; message: string };

function TaskP2PReceiveModal({ initialCode, onClose }: TaskP2PReceiveModalProps) {
  const [state, setState] = useState<ReceiveState>(
    initialCode ? { phase: "connecting" } : { phase: "scan", error: null },
  );
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const connectedRef = useRef(false);

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
        const conn = connectToHost(peer, code, PEER_PREFIX);
        connRef.current = conn;

        conn.on("open", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          setState({ phase: "receiving" });
        });

        conn.on("data", async (data) => {
          const message = data as P2PMessage;
          if (message.type !== "payload") return;

          try {
            const tasks = parseTaskImportPayload(message.data);
            const collidingIds = await detectTaskCollisions(tasks);
            if (collidingIds.length > 0) {
              setState({ phase: "collision", tasks, collisionCount: collidingIds.length });
              return;
            }
            const outcome = await importTasks(tasks, "copy");
            conn.send({ type: "ack", outcome } satisfies P2PMessage);
            setState({ phase: "done", outcome });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Received invalid data.";
            conn.send({ type: "error", message: errorMessage } satisfies P2PMessage);
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
        const code = parsePairingInput(result.data, LINK_PARAM);
        if (code) connectWithCode(code);
      },
      { returnDetailedScanResult: true },
    );

    scanner.start().catch(() => {
      setState({
        phase: "manual",
        error: "Camera unavailable — enter the code instead.",
      });
    });

    return () => {
      scanner.destroy();
    };
  }, [state.phase]);

  async function handleResolveCollisions(resolution: CollisionResolution) {
    if (state.phase !== "collision") return;
    const conn = connRef.current;
    try {
      const outcome = await importTasks(state.tasks, resolution);
      conn?.send({ type: "ack", outcome } satisfies P2PMessage);
      setState({ phase: "done", outcome });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      conn?.send({ type: "error", message } satisfies P2PMessage);
      setState({ phase: "error", message });
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = parsePairingInput(manualInput, LINK_PARAM);
    if (!code) {
      setState({ phase: "manual", error: "Enter a valid pairing code or link." });
      return;
    }
    connectWithCode(code);
  }

  return (
    <Modal title="Receive tasks" onClose={onClose}>
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
            <label htmlFor="task-p2p-manual-code">Pairing code or link</label>
            <input
              id="task-p2p-manual-code"
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
      {state.phase === "receiving" && <p>Connected — waiting for data…</p>}
      {state.phase === "done" && <p>Received — {describeOutcome(state.outcome)}</p>}
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
          entityLabel="task"
          onResolve={handleResolveCollisions}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}

export default TaskP2PReceiveModal;
