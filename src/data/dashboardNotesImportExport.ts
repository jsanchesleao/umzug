import { db } from "./db";
import { listDashboardNotes } from "./dashboardNotes";
import { blobToDataUrl, dataUrlToBlob, type CollisionResolution, type ImportOutcome } from "./importExport";
import type { DashboardNoteKind, NoteColor } from "../types";

export interface ExportedDashboardNote {
  id: string;
  kind: DashboardNoteKind;
  text: string | null;
  dataUrl: string | null; // null for kind "text"
  color: NoteColor;
  createdAt: string;
  updatedAt: string;
}

export async function buildDashboardNotesExport(): Promise<ExportedDashboardNote[]> {
  const notes = await listDashboardNotes();
  return Promise.all(
    notes.map(async (note) => ({
      id: note.id,
      kind: note.kind,
      text: note.text,
      dataUrl: note.blob ? await blobToDataUrl(note.blob) : null,
      color: note.color,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isExportedDashboardNote(value: unknown): value is ExportedDashboardNote {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.kind === "text" || value.kind === "sketch") &&
    (typeof value.text === "string" || value.text === null) &&
    (typeof value.dataUrl === "string" || value.dataUrl === null) &&
    typeof value.color === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export async function detectDashboardNoteCollisions(notes: ExportedDashboardNote[]): Promise<string[]> {
  const ids = notes.map((note) => note.id);
  const existing = await db.dashboardNotes.bulkGet(ids);
  return ids.filter((_, index) => existing[index] !== undefined);
}

/**
 * Imports dashboard notes in a single all-or-nothing transaction. `resolution`
 * applies to every colliding note in this batch (a single prompt covers the
 * whole file rather than one per note).
 */
export async function importDashboardNotes(
  notes: ExportedDashboardNote[],
  resolution: CollisionResolution,
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { inserted: 0, overwritten: 0, copied: 0 };

  // Resolve data URLs to Blobs before opening the transaction: fetch() isn't
  // tracked by IndexedDB, so awaiting it inside a Dexie transaction causes
  // the transaction to auto-commit early.
  const noteBlobs = new Map<string, Blob>();
  await Promise.all(
    notes
      .filter((note) => note.dataUrl !== null)
      .map(async (note) => {
        noteBlobs.set(note.dataUrl!, await dataUrlToBlob(note.dataUrl!));
      }),
  );

  await db.transaction("rw", db.dashboardNotes, async () => {
    for (const exported of notes) {
      const existing = await db.dashboardNotes.get(exported.id);
      let id = exported.id;

      if (existing) {
        if (resolution === "overwrite") {
          await db.dashboardNotes.delete(exported.id);
          outcome.overwritten++;
        } else {
          id = crypto.randomUUID();
          outcome.copied++;
        }
      } else {
        outcome.inserted++;
      }

      await db.dashboardNotes.add({
        id,
        kind: exported.kind,
        text: exported.text,
        blob: exported.dataUrl ? noteBlobs.get(exported.dataUrl)! : null,
        color: exported.color,
        createdAt: exported.createdAt,
        updatedAt: exported.updatedAt,
      });
    }
  });

  return outcome;
}
