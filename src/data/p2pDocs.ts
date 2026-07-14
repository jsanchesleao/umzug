import type { DataConnection } from "peerjs";
import type { Bytes, DocumentEntry } from "../documents/types";
import { parentPath, pathName, type SelectedDocument } from "../utils/docPaths";

/**
 * Documents pair on their own peer-ID prefix and deep-link param so an
 * apartment-receive session can never dial into a documents-send session.
 */
export const DOC_PEER_PREFIX = "umzugdoc-";
export const DOC_LINK_PARAM = "p2pdoc";

const CHUNK_SIZE = 256 * 1024;
const BUFFER_HIGH = 1024 * 1024;
const BUFFER_LOW = 512 * 1024;

export interface IncomingDocMeta {
  id: string;
  name: string;
  description: string;
  /** Folder path relative to the sent selection root — the receiver grafts it under its chosen destination. */
  folder: string;
  mimeType: string;
  size: number;
}

export type DocTransferMessage =
  | { type: "doc-manifest"; docs: IncomingDocMeta[]; totalBytes: number }
  | { type: "doc-chunk"; id: string; seq: number; last: boolean; data: ArrayBuffer }
  | { type: "doc-done" }
  | { type: "doc-ack"; count: number }
  | { type: "doc-error"; message: string };

/**
 * Documents cross the wire decrypted (the WebRTC channel is already
 * DTLS-encrypted end-to-end); the receiver re-encrypts them with fresh keys
 * into its own vault, so the two vaults never share key material.
 */

function waitForDrain(conn: DataConnection): Promise<void> {
  const channel = conn.dataChannel;
  if (!channel || channel.bufferedAmount <= BUFFER_HIGH) return Promise.resolve();

  return new Promise((resolve) => {
    channel.bufferedAmountLowThreshold = BUFFER_LOW;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      channel.removeEventListener("bufferedamountlow", finish);
      clearInterval(poll);
      resolve();
    };
    channel.addEventListener("bufferedamountlow", finish);
    // Poll fallback — some browsers are unreliable with bufferedamountlow.
    const poll = setInterval(() => {
      if (channel.bufferedAmount <= BUFFER_LOW || channel.readyState !== "open") finish();
    }, 100);
  });
}

/**
 * Sends the manifest, then each document's plaintext in 256 KiB chunks with
 * backpressure, then doc-done. Decrypts one document at a time so peak memory
 * is bounded by the largest document, not the whole selection.
 */
export async function sendDocuments(
  conn: DataConnection,
  docs: SelectedDocument[],
  getBytes: (entry: DocumentEntry) => Promise<Bytes>,
  onProgress: (sentBytes: number, totalBytes: number) => void,
): Promise<void> {
  const manifest: IncomingDocMeta[] = docs.map(({ entry, relativePath }) => ({
    id: entry.id,
    name: pathName(relativePath),
    description: entry.description,
    folder: parentPath(relativePath),
    mimeType: entry.mimeType,
    size: entry.size,
  }));
  const totalBytes = docs.reduce((sum, doc) => sum + doc.entry.size, 0);
  conn.send({ type: "doc-manifest", docs: manifest, totalBytes } satisfies DocTransferMessage);

  let sent = 0;
  for (const { entry } of docs) {
    const bytes = await getBytes(entry);
    for (let offset = 0; ; offset += CHUNK_SIZE) {
      const end = Math.min(offset + CHUNK_SIZE, bytes.length);
      const chunk = bytes.slice(offset, end);
      await waitForDrain(conn);
      conn.send({
        type: "doc-chunk",
        id: entry.id,
        seq: offset / CHUNK_SIZE,
        last: end >= bytes.length,
        data: chunk.buffer,
      } satisfies DocTransferMessage);
      sent += chunk.length;
      onProgress(sent, totalBytes);
      if (end >= bytes.length) break;
    }
  }

  conn.send({ type: "doc-done" } satisfies DocTransferMessage);
}

export interface DocReceiverHandlers {
  onManifest: (docs: IncomingDocMeta[], totalBytes: number) => void;
  /** Called once per completed document; persist it here (encrypt + index). */
  onDocComplete: (meta: IncomingDocMeta, bytes: Bytes) => Promise<void>;
  onProgress: (receivedBytes: number, totalBytes: number) => void;
  /** Fires after doc-done once every onDocComplete resolved; the ack has been sent. */
  onAllPersisted: (count: number) => void;
  onError: (message: string) => void;
}

function toUint8(data: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function concatChunks(parts: Uint8Array[]): Bytes {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Wires the receiving side of the document protocol onto an open connection. */
export function createDocReceiver(conn: DataConnection, handlers: DocReceiverHandlers): void {
  const metas = new Map<string, IncomingDocMeta>();
  const chunks = new Map<string, Uint8Array[]>();
  let totalBytes = 0;
  let received = 0;
  let persisted = 0;
  let persistQueue: Promise<void> = Promise.resolve();
  let failed = false;

  function fail(message: string) {
    if (failed) return;
    failed = true;
    try {
      conn.send({ type: "doc-error", message } satisfies DocTransferMessage);
    } catch {
      // Connection already gone — nothing to notify.
    }
    handlers.onError(message);
  }

  conn.on("data", (raw) => {
    if (failed) return;
    const message = raw as DocTransferMessage;

    switch (message.type) {
      case "doc-manifest": {
        totalBytes = message.totalBytes;
        for (const doc of message.docs) metas.set(doc.id, doc);
        handlers.onManifest(message.docs, message.totalBytes);
        break;
      }
      case "doc-chunk": {
        const meta = metas.get(message.id);
        if (!meta) {
          fail("Received data for an unknown document.");
          return;
        }
        const data = toUint8(message.data);
        const parts = chunks.get(message.id) ?? [];
        parts.push(data);
        chunks.set(message.id, parts);
        received += data.length;
        handlers.onProgress(received, totalBytes);

        if (message.last) {
          const bytes = concatChunks(parts);
          chunks.delete(message.id);
          persistQueue = persistQueue
            .then(async () => {
              if (failed) return;
              await handlers.onDocComplete(meta, bytes);
              persisted++;
            })
            .catch((error: unknown) => {
              fail(
                error instanceof Error ? error.message : "Failed to store a received document.",
              );
            });
        }
        break;
      }
      case "doc-done": {
        // The reliable channel is ordered, so every persist is already queued.
        void persistQueue.then(() => {
          if (failed) return;
          conn.send({ type: "doc-ack", count: persisted } satisfies DocTransferMessage);
          handlers.onAllPersisted(persisted);
        });
        break;
      }
      case "doc-error": {
        failed = true;
        handlers.onError(message.message);
        break;
      }
    }
  });
}
