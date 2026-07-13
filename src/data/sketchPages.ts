import { db } from "./db";
import type { SketchPage } from "../types";

export function listSketchPagesForApartment(apartmentId: string): Promise<SketchPage[]> {
  return db.sketchPages.where("apartmentId").equals(apartmentId).sortBy("order");
}

export interface SketchPageCommit {
  id: string | null;
  order: number;
  blob: Blob;
}

/**
 * Commits a sketch editor session's final page list in one transaction:
 * deletes removed pages, updates existing pages in place, and inserts new
 * ones. `order` is carried explicitly per commit (rather than derived from
 * array position) so a caller can skip re-writing untouched pages without
 * shifting the order of the pages around them. Callers must fully resolve
 * any Blob-encoding work (e.g. canvas.toBlob) before calling this, the same
 * way importApartments pre-resolves photo blobs: awaiting non-Dexie-tracked
 * async work inside the transaction would cause it to auto-commit early.
 */
export async function saveSketchSession(
  apartmentId: string,
  pages: SketchPageCommit[],
  deletedIds: string[],
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction("rw", db.sketchPages, async () => {
    if (deletedIds.length > 0) {
      await db.sketchPages.bulkDelete(deletedIds);
    }
    for (const page of pages) {
      if (page.id) {
        await db.sketchPages.update(page.id, { order: page.order, blob: page.blob, updatedAt: now });
      } else {
        await db.sketchPages.add({
          id: crypto.randomUUID(),
          apartmentId,
          order: page.order,
          blob: page.blob,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });
}
