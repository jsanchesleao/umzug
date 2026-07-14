import { createContext } from "react";
import type { Bytes, DocumentEntry, DocumentIndex } from "./types";

export type VaultStatus = "loading" | "unsupported" | "uninitialized" | "locked" | "unlocked";

export interface VaultContextValue {
  status: VaultStatus;
  /** Decrypted index; non-null only while unlocked. */
  index: DocumentIndex | null;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  /** Destroys the whole vault (meta, index, and every document). */
  reset: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  /** Applies an index transformation, persists it encrypted, updates state. */
  mutateIndex: (
    fn: (index: DocumentIndex) => DocumentIndex | Promise<DocumentIndex>,
  ) => Promise<void>;
  /** Encrypts and stores files into the given virtual folder. */
  addFiles: (
    files: { name: string; type: string; bytes: Bytes; description?: string }[],
    folder: string,
  ) => Promise<void>;
  /** Deletes documents and folder subtrees (index entries + encrypted blobs). */
  removeItems: (entryIds: string[], folderPaths: string[]) => Promise<void>;
  /** Decrypted plaintext bytes of a stored document. */
  getBytes: (entry: DocumentEntry) => Promise<Bytes>;
}

export const VaultContext = createContext<VaultContextValue | null>(null);
