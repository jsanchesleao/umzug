import type { Bytes, DocumentEntry, DocumentIndex } from "../documents/types";
import {
  buildAllApartmentsExport,
  describeOutcome,
  detectCollisions,
  importApartments,
  parseImportPayload,
  type CollisionResolution,
  type ExportedApartment,
  type ImportOutcome,
} from "./importExport";
import {
  buildAllTasksExport,
  detectTaskCollisions,
  importTasks,
  parseTaskImportPayload,
  type ExportedTask,
} from "./taskImportExport";
import {
  buildDashboardNotesExport,
  detectDashboardNoteCollisions,
  importDashboardNotes,
  isExportedDashboardNote,
  type ExportedDashboardNote,
} from "./dashboardNotesImportExport";
import {
  buildDocumentsExport,
  importDocuments,
  isExportedDocument,
  type ExportedDocument,
} from "./documentsImportExport";

const FORMAT_VERSION = 1;

export interface ExportedBackup {
  formatVersion: typeof FORMAT_VERSION;
  exportedAt: string;
  apartments: ExportedApartment[];
  tasks: ExportedTask[];
  dashboardNotes: ExportedDashboardNote[];
  documents: ExportedDocument[];
}

export interface FullBackupOutcome {
  apartments: ImportOutcome;
  tasks: ImportOutcome;
  dashboardNotes: ImportOutcome;
  documentsImported: number;
  /** True when the backup contained documents but no unlocked vault was available to import them into. */
  documentsSkipped: boolean;
}

export async function buildFullBackup(opts: {
  includePhotos: boolean;
  includeSketches: boolean;
  documents?: { index: DocumentIndex; getBytes: (entry: DocumentEntry) => Promise<Bytes> };
}): Promise<ExportedBackup> {
  const [apartments, tasks, dashboardNotes, documents] = await Promise.all([
    buildAllApartmentsExport(opts.includePhotos, opts.includeSketches),
    buildAllTasksExport(),
    buildDashboardNotesExport(),
    opts.documents ? buildDocumentsExport(opts.documents.index, opts.documents.getBytes) : Promise.resolve([]),
  ]);

  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    apartments,
    tasks,
    dashboardNotes,
    documents,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parses a full-backup JSON file. Apartment and task arrays are validated and
 * legacy-normalized by delegating to the existing per-entity parsers (via a
 * stringify/parse round-trip) so this stays the single source of truth for
 * that shape/legacy-field handling rather than duplicating it here.
 */
export function parseFullBackupPayload(text: string): ExportedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (!isRecord(parsed) || parsed.formatVersion !== FORMAT_VERSION) {
    throw new Error("File does not match the expected backup export shape.");
  }

  const apartments = parseImportPayload(JSON.stringify(parsed.apartments ?? []));
  const tasks = parseTaskImportPayload(JSON.stringify(parsed.tasks ?? []));

  const dashboardNotesRaw = Array.isArray(parsed.dashboardNotes) ? parsed.dashboardNotes : [];
  if (!dashboardNotesRaw.every(isExportedDashboardNote)) {
    throw new Error("File does not match the expected backup export shape.");
  }

  const documentsRaw = Array.isArray(parsed.documents) ? parsed.documents : [];
  if (!documentsRaw.every(isExportedDocument)) {
    throw new Error("File does not match the expected backup export shape.");
  }

  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    apartments,
    tasks,
    dashboardNotes: dashboardNotesRaw,
    documents: documentsRaw,
  };
}

export interface FullBackupCollisions {
  apartments: string[];
  tasks: string[];
  dashboardNotes: string[];
}

export async function detectFullBackupCollisions(backup: ExportedBackup): Promise<FullBackupCollisions> {
  const [apartments, tasks, dashboardNotes] = await Promise.all([
    detectCollisions(backup.apartments),
    detectTaskCollisions(backup.tasks),
    detectDashboardNoteCollisions(backup.dashboardNotes),
  ]);
  return { apartments, tasks, dashboardNotes };
}

export function countCollisions(collisions: FullBackupCollisions): number {
  return collisions.apartments.length + collisions.tasks.length + collisions.dashboardNotes.length;
}

export async function importFullBackup(
  backup: ExportedBackup,
  resolution: CollisionResolution,
  vault?: {
    addFiles: (
      files: { name: string; type: string; bytes: Bytes; description?: string }[],
      folder: string,
    ) => Promise<void>;
  },
  keepExistingMedia = false,
): Promise<FullBackupOutcome> {
  const apartments = await importApartments(backup.apartments, resolution, keepExistingMedia);
  const tasks = await importTasks(backup.tasks, resolution);
  const dashboardNotes = await importDashboardNotes(backup.dashboardNotes, resolution);

  let documentsImported = 0;
  let documentsSkipped = false;
  if (backup.documents.length > 0) {
    if (vault) {
      documentsImported = await importDocuments(backup.documents, vault.addFiles);
    } else {
      documentsSkipped = true;
    }
  }

  return { apartments, tasks, dashboardNotes, documentsImported, documentsSkipped };
}

export function describeFullBackupOutcome(outcome: FullBackupOutcome): string {
  const parts = [
    `Apartments: ${describeOutcome(outcome.apartments)}`,
    `Tasks: ${describeOutcome(outcome.tasks)}`,
    `Notes: ${describeOutcome(outcome.dashboardNotes)}`,
  ];
  if (outcome.documentsImported > 0) {
    parts.push(`Documents: ${outcome.documentsImported} imported.`);
  } else if (outcome.documentsSkipped) {
    parts.push("Documents: skipped — unlock the vault to include them.");
  }
  return parts.join(" ");
}
