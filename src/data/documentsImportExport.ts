import type { Bytes, DocumentEntry, DocumentIndex } from "../documents/types";
import { blobToDataUrl, dataUrlToBlob } from "./importExport";

export interface ExportedDocument {
  id: string;
  name: string;
  description: string;
  folder: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function buildDocumentsExport(
  index: DocumentIndex,
  getBytes: (entry: DocumentEntry) => Promise<Bytes>,
): Promise<ExportedDocument[]> {
  return Promise.all(
    index.entries.map(async (entry) => {
      const bytes = await getBytes(entry);
      const blob = new Blob([bytes], { type: entry.mimeType });
      return {
        id: entry.id,
        name: entry.name,
        description: entry.description,
        folder: entry.folder,
        mimeType: entry.mimeType,
        dataUrl: await blobToDataUrl(blob),
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isExportedDocument(value: unknown): value is ExportedDocument {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.folder === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.dataUrl === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

/**
 * Imports documents into the currently unlocked vault. Every document always
 * gets a brand-new id and a fresh per-document key via `addFiles` — imported
 * documents never reuse the exported id/key, matching how the P2P document
 * receiver already re-keys incoming files. There is no collision concept for
 * documents: every import simply adds new entries.
 */
export async function importDocuments(
  documents: ExportedDocument[],
  addFiles: (
    files: { name: string; type: string; bytes: Bytes; description?: string }[],
    folder: string,
  ) => Promise<void>,
): Promise<number> {
  for (const doc of documents) {
    const blob = await dataUrlToBlob(doc.dataUrl);
    const bytes = new Uint8Array(await blob.arrayBuffer()) as Bytes;
    await addFiles([{ name: doc.name, type: doc.mimeType, bytes, description: doc.description }], doc.folder);
  }
  return documents.length;
}
