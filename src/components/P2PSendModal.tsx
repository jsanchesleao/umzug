import { useEffect, useRef, useState } from "react";
import type { DataConnection, Peer } from "peerjs";
import { QRCodeSVG } from "qrcode.react";
import Modal from "./Modal";
import {
  buildApartmentExport,
  buildAllApartmentsExport,
  describeOutcome,
  type ImportOutcome,
} from "../data/importExport";
import { buildPairingLink, createHostPeer, destroyPeer } from "../data/p2p";
import type { P2PMessage } from "../data/p2p";

type Scope = { scope: "apartment"; apartmentId: string } | { scope: "all" };

interface P2PSendModalProps {
  onClose: () => void;
}

type SendState =
  | { phase: "connecting" }
  | { phase: "waiting"; code: string; stale: boolean }
  | { phase: "sending"; code: string }
  | { phase: "done"; outcome: ImportOutcome }
  | { phase: "error"; message: string };

function P2PSendModal(props: P2PSendModalProps & Scope) {
  const { onClose, scope } = props;
  const [state, setState] = useState<SendState>({ phase: "connecting" });
  const [includePhotos, setIncludePhotos] = useState(scope === "apartment");
  const includePhotosRef = useRef(includePhotos);

  useEffect(() => {
    includePhotosRef.current = includePhotos;
  }, [includePhotos]);

  useEffect(() => {
    let cancelled = false;
    let peer: Peer | null = null;
    let conn: DataConnection | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | null = null;

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
        setState((prev) =>
          prev.phase === "waiting" ? { phase: "sending", code: prev.code } : prev,
        );
        try {
          const exported =
            scope === "apartment"
              ? await buildApartmentExport(props.apartmentId, includePhotosRef.current)
              : await buildAllApartmentsExport(includePhotosRef.current);
          const message: P2PMessage = { type: "payload", data: JSON.stringify(exported) };
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
        const message = data as P2PMessage;
        if (message.type === "ack") {
          setState({ phase: "done", outcome: message.outcome });
        } else if (message.type === "error") {
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

    createHostPeer()
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

  const title = scope === "apartment" ? "Send this apartment" : "Send all apartments";

  return (
    <Modal title={title} onClose={onClose}>
      {state.phase === "connecting" && <p>Connecting to the pairing server…</p>}

      {(state.phase === "waiting" || state.phase === "sending") && (
        <>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={includePhotos}
              disabled={state.phase === "sending"}
              onChange={(e) => setIncludePhotos(e.target.checked)}
            />
            Include photos & sketches
          </label>

          <div className="p2p-qr">
            <QRCodeSVG value={buildPairingLink(state.code)} size={200} />
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
              onClick={() => navigator.clipboard.writeText(buildPairingLink(state.code))}
            >
              Copy link
            </button>
          </div>

          {state.phase === "waiting" && (
            <p>
              {state.stale
                ? "Still waiting — check that both devices are online and the code matches."
                : "Waiting for the other device to scan or enter this code…"}
            </p>
          )}
          {state.phase === "sending" && <p>Connected — sending data…</p>}
        </>
      )}

      {state.phase === "done" && <p>Sent — {describeOutcome(state.outcome)}</p>}
      {state.phase === "error" && (
        <div className="banner banner-error">{state.message}</div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {state.phase === "done" || state.phase === "error" ? "Close" : "Cancel"}
        </button>
      </div>
    </Modal>
  );
}

export default P2PSendModal;
