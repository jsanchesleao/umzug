import type { Bytes, VaultMeta } from "../documents/types";

const ROOT_DIR = "umzug-docs";
const BLOBS_DIR = "blobs";
const META_FILE = "vault.json";
const INDEX_FILE = "index.enc";

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function" &&
    typeof FileSystemFileHandle !== "undefined" &&
    "createWritable" in FileSystemFileHandle.prototype
  );
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

async function getRootDir(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  const opfs = await navigator.storage.getDirectory();
  try {
    return await opfs.getDirectoryHandle(ROOT_DIR, { create });
  } catch (error) {
    if (!create && isNotFound(error)) return null;
    throw error;
  }
}

async function readFileBytes(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<Bytes | null> {
  try {
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function writeFileBytes(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Bytes,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
}

/** Returns null when the vault has never been set up on this device. */
export async function readVaultMeta(): Promise<VaultMeta | null> {
  const root = await getRootDir(false);
  if (!root) return null;
  const bytes = await readFileBytes(root, META_FILE);
  if (!bytes) return null;
  return JSON.parse(new TextDecoder().decode(bytes)) as VaultMeta;
}

export async function writeVaultMeta(meta: VaultMeta): Promise<void> {
  const root = await getRootDir(true);
  await writeFileBytes(root!, META_FILE, new TextEncoder().encode(JSON.stringify(meta)));
}

export async function readEncryptedIndex(): Promise<Bytes | null> {
  const root = await getRootDir(false);
  if (!root) return null;
  return readFileBytes(root, INDEX_FILE);
}

export async function writeEncryptedIndex(bytes: Bytes): Promise<void> {
  const root = await getRootDir(true);
  await writeFileBytes(root!, INDEX_FILE, bytes);
}

async function getBlobsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await getRootDir(true);
  return root!.getDirectoryHandle(BLOBS_DIR, { create: true });
}

export async function writeDocBlob(id: string, bytes: Bytes): Promise<void> {
  const dir = await getBlobsDir();
  await writeFileBytes(dir, id, bytes);
}

export async function readDocBlob(id: string): Promise<Bytes> {
  const dir = await getBlobsDir();
  const bytes = await readFileBytes(dir, id);
  if (!bytes) throw new Error("Document data is missing from storage.");
  return bytes;
}

export async function deleteDocBlob(id: string): Promise<void> {
  const dir = await getBlobsDir();
  try {
    await dir.removeEntry(id);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

/** Irreversibly deletes the whole vault: meta, index, and every document blob. */
export async function destroyVaultStorage(): Promise<void> {
  const opfs = await navigator.storage.getDirectory();
  try {
    await opfs.removeEntry(ROOT_DIR, { recursive: true });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}
