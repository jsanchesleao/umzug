import { Peer, type DataConnection } from "peerjs";
import type { ImportOutcome } from "./importExport";

const PEER_ID_PREFIX = "umzug-";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_HOST_RETRIES = 5;

export type P2PMessage =
  | { type: "payload"; data: string }
  | { type: "ack"; outcome: ImportOutcome }
  | { type: "error"; message: string };

export function generatePairingCode(length = CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function buildPairingLink(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}?p2p=${code}`;
}

/**
 * Accepts a bare pairing code or a pasted/scanned pairing link and returns
 * the normalized code, or null if the input doesn't look like either.
 */
export function parsePairingInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("p2p");
    if (!fromQuery) return null;
    candidate = fromQuery;
  } catch {
    // Not a URL — treat the raw input as a bare code.
  }

  const normalized = candidate.trim().toUpperCase();
  if (normalized.length !== CODE_LENGTH) return null;
  if (![...normalized].every((char) => CODE_ALPHABET.includes(char))) return null;
  return normalized;
}

/**
 * Creates a Peer registered under a short, human-typeable ID so it can be
 * dialed by a guest that scanned the QR code or typed the code manually.
 * Retries with a fresh code if the ID happens to already be taken by another
 * live Umzug session on the shared public broker.
 */
export function createHostPeer(): Promise<{ peer: Peer; code: string }> {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    function tryCreate() {
      attempt++;
      const code = generatePairingCode();
      const peer = new Peer(PEER_ID_PREFIX + code);

      function onOpen() {
        peer.off("error", onError);
        resolve({ peer, code });
      }

      function onError(error: { type: string }) {
        peer.off("open", onOpen);
        peer.destroy();
        if (error.type === "unavailable-id" && attempt < MAX_HOST_RETRIES) {
          tryCreate();
        } else {
          reject(new Error("Couldn't start pairing. Please try again."));
        }
      }

      peer.once("open", onOpen);
      peer.once("error", onError);
    }

    tryCreate();
  });
}

/** Creates a Peer with a server-assigned ID — used by the receiving side, which only ever dials out. */
export function createGuestPeer(): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    peer.once("open", () => resolve(peer));
    peer.once("error", (error) => reject(error));
  });
}

export function destroyPeer(peer: Peer | null | undefined): void {
  if (peer && !peer.destroyed) {
    peer.destroy();
  }
}

export function connectToHost(peer: Peer, code: string): DataConnection {
  return peer.connect(PEER_ID_PREFIX + code, { reliable: true });
}
