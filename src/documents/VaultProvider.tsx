import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { VaultContext } from "./vaultContext";
import type { VaultContextValue, VaultStatus } from "./vaultContext";
import type { DocumentIndex } from "./types";
import {
  addDocument,
  changeVaultPassword,
  readDocumentBytes,
  removeItems,
  saveIndex,
  setupVault,
  unlockVault,
} from "../data/documentVault";
import { destroyVaultStorage, isOpfsSupported, readVaultMeta } from "../data/docStorage";

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [index, setIndex] = useState<DocumentIndex | null>(null);
  // The vault key lives only in this ref for the lifetime of the unlocked
  // session — never in state, never persisted anywhere.
  const keyRef = useRef<CryptoKey | null>(null);
  const indexRef = useRef<DocumentIndex | null>(null);
  // Serializes index mutations within this tab (cross-tab safety comes from
  // the Web Lock inside saveIndex).
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!isOpfsSupported()) {
        setStatus("unsupported");
        return;
      }
      const meta = await readVaultMeta();
      if (cancelled) return;
      setStatus(meta ? "locked" : "uninitialized");
    }
    init().catch(() => {
      // Unreadable meta — let unlock surface the error and offer a reset.
      if (!cancelled) setStatus("locked");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<VaultContextValue>(() => {
    function applyIndex(next: DocumentIndex) {
      indexRef.current = next;
      setIndex(next);
    }

    function requireUnlocked(): { key: CryptoKey; index: DocumentIndex } {
      if (!keyRef.current || !indexRef.current) throw new Error("The vault is locked.");
      return { key: keyRef.current, index: indexRef.current };
    }

    function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const result = queueRef.current.then(fn);
      queueRef.current = result.catch(() => {});
      return result;
    }

    return {
      status,
      index,
      setup: async (password) => {
        const unlocked = await setupVault(password);
        keyRef.current = unlocked.key;
        applyIndex(unlocked.index);
        setStatus("unlocked");
      },
      unlock: async (password) => {
        const unlocked = await unlockVault(password);
        keyRef.current = unlocked.key;
        applyIndex(unlocked.index);
        setStatus("unlocked");
      },
      lock: () => {
        keyRef.current = null;
        indexRef.current = null;
        setIndex(null);
        setStatus("locked");
      },
      reset: async () => {
        await destroyVaultStorage();
        keyRef.current = null;
        indexRef.current = null;
        setIndex(null);
        setStatus("uninitialized");
      },
      changePassword: async (oldPassword, newPassword) => {
        const unlocked = await changeVaultPassword(oldPassword, newPassword);
        keyRef.current = unlocked.key;
        applyIndex(unlocked.index);
        setStatus("unlocked");
      },
      mutateIndex: (fn) =>
        runExclusive(async () => {
          const { key, index: current } = requireUnlocked();
          const next = await fn(current);
          await saveIndex(key, next);
          applyIndex(next);
        }),
      addFiles: (files, folder) =>
        runExclusive(async () => {
          for (const file of files) {
            const { key, index: current } = requireUnlocked();
            applyIndex(await addDocument(key, current, file, folder, file.description ?? ""));
          }
        }),
      removeItems: (entryIds, folderPaths) =>
        runExclusive(async () => {
          const { key, index: current } = requireUnlocked();
          applyIndex(await removeItems(key, current, entryIds, folderPaths));
        }),
      getBytes: (entry) => readDocumentBytes(entry),
    };
  }, [status, index]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
