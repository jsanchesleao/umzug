/** ArrayBuffer-backed bytes — what Web Crypto, OPFS, and Blob all require. */
export type Bytes = Uint8Array<ArrayBuffer>;

export const VAULT_FORMAT_VERSION = 1;
export const INDEX_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
export const ACCEPTED_DOC_TYPES = "application/pdf,image/*";

/** Plaintext vault metadata stored alongside the encrypted index in OPFS. */
export interface VaultMeta {
  format: typeof VAULT_FORMAT_VERSION;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  saltB64: string;
  createdAt: string;
}

export interface DocumentEntry {
  id: string;
  /** Original file name; unique within its virtual folder. */
  name: string;
  description: string;
  /** Normalized virtual folder path, "" = root, e.g. "Contracts/2026". */
  folder: string;
  mimeType: string;
  /** Plaintext size in bytes. */
  size: number;
  /** Per-document AES-GCM-256 key, exported raw as base64. */
  keyB64: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentIndex {
  version: typeof INDEX_VERSION;
  /** Every virtual folder path, including empty folders and all ancestors. */
  folders: string[];
  entries: DocumentEntry[];
}

export function emptyDocumentIndex(): DocumentIndex {
  return { version: INDEX_VERSION, folders: [], entries: [] };
}

export function isAcceptedDocType(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
