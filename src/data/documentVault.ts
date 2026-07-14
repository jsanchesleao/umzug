import {
  decryptBytes,
  decryptJson,
  deriveVaultKey,
  encryptBytes,
  encryptJson,
  exportKeyBase64,
  generateDocKey,
  generateSaltBase64,
  importKeyBase64,
} from "./docCrypto";
import {
  deleteDocBlob,
  readDocBlob,
  readEncryptedIndex,
  readVaultMeta,
  writeDocBlob,
  writeEncryptedIndex,
  writeVaultMeta,
} from "./docStorage";
import {
  emptyDocumentIndex,
  PBKDF2_ITERATIONS,
  VAULT_FORMAT_VERSION,
  type Bytes,
  type DocumentEntry,
  type DocumentIndex,
} from "../documents/types";
import {
  collectSelection,
  ensureFolder,
  isSameOrDescendant,
  listEntriesInFolder,
  normalizeFolderPath,
  uniqueName,
} from "../utils/docPaths";

const INDEX_LOCK = "umzug-docs-index";

/**
 * Serializes index writes across tabs via the Web Locks API so a
 * read-modify-write in one tab can't clobber another's.
 */
function withIndexLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(INDEX_LOCK, fn) as Promise<T>;
  }
  return fn();
}

export interface UnlockedVault {
  key: CryptoKey;
  index: DocumentIndex;
}

export async function setupVault(password: string): Promise<UnlockedVault> {
  if (await readVaultMeta()) {
    throw new Error("A document vault already exists on this device.");
  }
  const saltB64 = generateSaltBase64();
  const key = await deriveVaultKey(password, saltB64, PBKDF2_ITERATIONS);
  const index = emptyDocumentIndex();
  await withIndexLock(async () => {
    await writeVaultMeta({
      format: VAULT_FORMAT_VERSION,
      kdf: "PBKDF2-SHA256",
      iterations: PBKDF2_ITERATIONS,
      saltB64,
      createdAt: new Date().toISOString(),
    });
    await writeEncryptedIndex(await encryptJson(key, index));
  });
  return { key, index };
}

export async function unlockVault(password: string): Promise<UnlockedVault> {
  const meta = await readVaultMeta();
  if (!meta) throw new Error("No document vault exists on this device yet.");

  const key = await deriveVaultKey(password, meta.saltB64, meta.iterations);
  const encrypted = await readEncryptedIndex();
  if (!encrypted) throw new Error("The vault index is missing. Reset the vault to start over.");

  let index: DocumentIndex;
  try {
    index = await decryptJson<DocumentIndex>(key, encrypted);
  } catch {
    // AES-GCM auth-tag failure — the only way to tell the password is wrong.
    throw new Error("Wrong password.");
  }
  return { key, index };
}

export function saveIndex(key: CryptoKey, index: DocumentIndex): Promise<void> {
  return withIndexLock(async () => {
    await writeEncryptedIndex(await encryptJson(key, index));
  });
}

export async function addDocument(
  key: CryptoKey,
  index: DocumentIndex,
  file: { name: string; type: string; bytes: Bytes },
  folder: string,
  description: string,
): Promise<DocumentIndex> {
  const targetFolder = normalizeFolderPath(folder);
  const docKey = await generateDocKey();
  const id = crypto.randomUUID();
  await writeDocBlob(id, await encryptBytes(docKey, file.bytes));

  const now = new Date().toISOString();
  const entry: DocumentEntry = {
    id,
    name: uniqueName(
      file.name,
      listEntriesInFolder(index, targetFolder).map((e) => e.name),
    ),
    description,
    folder: targetFolder,
    mimeType: file.type,
    size: file.bytes.length,
    keyB64: await exportKeyBase64(docKey),
    createdAt: now,
    updatedAt: now,
  };

  const next: DocumentIndex = {
    ...index,
    folders: targetFolder === "" ? index.folders : ensureFolder(index.folders, targetFolder),
    entries: [...index.entries, entry],
  };
  try {
    await saveIndex(key, next);
  } catch (error) {
    // Don't leak an orphan blob when the index write fails.
    await deleteDocBlob(id).catch(() => {});
    throw error;
  }
  return next;
}

export async function readDocumentBytes(entry: DocumentEntry): Promise<Bytes> {
  const docKey = await importKeyBase64(entry.keyB64);
  return decryptBytes(docKey, await readDocBlob(entry.id));
}

export async function removeItems(
  key: CryptoKey,
  index: DocumentIndex,
  entryIds: string[],
  folderPaths: string[],
): Promise<DocumentIndex> {
  const removedIds = new Set(
    collectSelection(index, entryIds, folderPaths).map((doc) => doc.entry.id),
  );
  const next: DocumentIndex = {
    ...index,
    folders: index.folders.filter(
      (folder) => !folderPaths.some((path) => isSameOrDescendant(folder, path)),
    ),
    entries: index.entries.filter((entry) => !removedIds.has(entry.id)),
  };
  await saveIndex(key, next);
  // Blob deletion is best-effort after the index no longer references them;
  // a failure only leaks storage space, never a dangling entry.
  for (const id of removedIds) {
    await deleteDocBlob(id).catch(() => {});
  }
  return next;
}

export async function changeVaultPassword(
  oldPassword: string,
  newPassword: string,
): Promise<UnlockedVault> {
  const { index } = await unlockVault(oldPassword);
  const meta = await readVaultMeta();
  if (!meta) throw new Error("No document vault exists on this device yet.");

  const saltB64 = generateSaltBase64();
  const key = await deriveVaultKey(newPassword, saltB64, PBKDF2_ITERATIONS);
  await withIndexLock(async () => {
    await writeVaultMeta({ ...meta, iterations: PBKDF2_ITERATIONS, saltB64 });
    await writeEncryptedIndex(await encryptJson(key, index));
  });
  return { key, index };
}
