import { db } from "./db";
import { getApartment, listApartments } from "./apartments";
import { listTimelineEventsForApartment } from "./timelineEvents";
import { listActionsForApartment } from "./actions";
import { listPhotosForApartment } from "./photos";
import { listSketchPagesForApartment } from "./sketchPages";
import {
  ACTION_STATUSES,
  ACTION_URGENCIES,
  APARTMENT_STATUSES,
  type Action,
  type ActionStatus,
  type ActionUrgency,
  type ApartmentStatus,
} from "../types";

export interface ExportedAction {
  id: string;
  description: string;
  dueDate: string;
  urgency: ActionUrgency;
  status: ActionStatus;
}

export interface ExportedTimelineEvent {
  id: string;
  date: string;
  shortDescription: string;
  longDescription: string | null;
  actions: ExportedAction[];
}

export interface ExportedPhoto {
  id: string;
  caption: string | null;
  dataUrl: string;
}

export interface ExportedSketchPage {
  id: string;
  order: number;
  dataUrl: string;
}

export interface ExportedApartment {
  id: string;
  title: string;
  address: string;
  coldRent: number | null;
  warmRent: number | null;
  originalLink: string;
  entryDate: string;
  status: ApartmentStatus;
  visitDate: string | null;
  visitAddress: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  timeline: ExportedTimelineEvent[];
  actions: ExportedAction[];
  photos: ExportedPhoto[];
  sketches: ExportedSketchPage[];
}

function toExportedAction(action: Action): ExportedAction {
  return {
    id: action.id,
    description: action.description,
    dueDate: action.dueDate,
    urgency: action.urgency,
    status: action.status,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read photo blob"));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function buildApartmentExport(
  apartmentId: string,
  includePhotos = true,
  includeSketches = includePhotos,
): Promise<ExportedApartment> {
  const apartment = await getApartment(apartmentId);
  if (!apartment) throw new Error(`Apartment ${apartmentId} not found`);

  const [events, allActions, photos, sketchPages] = await Promise.all([
    listTimelineEventsForApartment(apartmentId),
    listActionsForApartment(apartmentId),
    includePhotos ? listPhotosForApartment(apartmentId) : Promise.resolve([]),
    includeSketches ? listSketchPagesForApartment(apartmentId) : Promise.resolve([]),
  ]);

  const timeline: ExportedTimelineEvent[] = events.map((event) => ({
    id: event.id,
    date: event.date,
    shortDescription: event.shortDescription,
    longDescription: event.longDescription,
    actions: allActions.filter((action) => action.eventId === event.id).map(toExportedAction),
  }));

  const directActions = allActions.filter((action) => action.eventId === null).map(toExportedAction);

  const exportedPhotos: ExportedPhoto[] = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      caption: photo.caption,
      dataUrl: await blobToDataUrl(photo.blob),
    })),
  );

  const exportedSketches: ExportedSketchPage[] = await Promise.all(
    sketchPages.map(async (page) => ({
      id: page.id,
      order: page.order,
      dataUrl: await blobToDataUrl(page.blob),
    })),
  );

  return {
    id: apartment.id,
    title: apartment.title,
    address: apartment.address,
    coldRent: apartment.coldRent,
    warmRent: apartment.warmRent,
    originalLink: apartment.originalLink,
    entryDate: apartment.entryDate,
    status: apartment.status,
    visitDate: apartment.visitDate,
    visitAddress: apartment.visitAddress,
    notes: apartment.notes,
    createdAt: apartment.createdAt,
    updatedAt: apartment.updatedAt,
    timeline,
    actions: directActions,
    photos: exportedPhotos,
    sketches: exportedSketches,
  };
}

export async function buildAllApartmentsExport(
  includePhotos = false,
  includeSketches = includePhotos,
): Promise<ExportedApartment[]> {
  const apartments = await listApartments();
  return Promise.all(
    apartments.map((apartment) => buildApartmentExport(apartment.id, includePhotos, includeSketches)),
  );
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExportedAction(value: unknown): value is ExportedAction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.dueDate === "string" &&
    ACTION_URGENCIES.includes(value.urgency as ActionUrgency) &&
    ACTION_STATUSES.includes(value.status as ActionStatus)
  );
}

function isExportedTimelineEvent(value: unknown): value is ExportedTimelineEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.shortDescription === "string" &&
    (value.longDescription === null || typeof value.longDescription === "string") &&
    Array.isArray(value.actions) &&
    value.actions.every(isExportedAction)
  );
}

function isExportedPhoto(value: unknown): value is ExportedPhoto {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.caption === null || typeof value.caption === "string") &&
    typeof value.dataUrl === "string"
  );
}

function isExportedSketchPage(value: unknown): value is ExportedSketchPage {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.order === "number" &&
    typeof value.dataUrl === "string"
  );
}

function isExportedApartment(value: unknown): value is ExportedApartment {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.address === "string" &&
    (value.coldRent === null || typeof value.coldRent === "number") &&
    (value.warmRent === null || typeof value.warmRent === "number") &&
    typeof value.originalLink === "string" &&
    typeof value.entryDate === "string" &&
    APARTMENT_STATUSES.includes(value.status as ApartmentStatus) &&
    (value.visitDate === null || typeof value.visitDate === "string") &&
    (value.visitAddress === null || typeof value.visitAddress === "string") &&
    typeof value.notes === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.timeline) &&
    value.timeline.every(isExportedTimelineEvent) &&
    Array.isArray(value.actions) &&
    value.actions.every(isExportedAction) &&
    Array.isArray(value.photos) &&
    value.photos.every(isExportedPhoto) &&
    Array.isArray(value.sketches) &&
    value.sketches.every(isExportedSketchPage)
  );
}

/**
 * Older export files carried a single `rentCost` number instead of separate
 * `coldRent`/`warmRent` fields. Map it into `coldRent` (matching how existing
 * database records are migrated) so old exports still import cleanly.
 */
function normalizeLegacyRent(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (
    typeof value.rentCost === "number" &&
    value.coldRent === undefined &&
    value.warmRent === undefined
  ) {
    const { rentCost, ...rest } = value;
    return { ...rest, coldRent: rentCost, warmRent: null };
  }
  return value;
}

/**
 * Older export files predate the `title` field. Fall back to `address` (the
 * old primary label) so those files still import cleanly.
 */
function normalizeLegacyTitle(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (typeof value.title !== "string") {
    return { ...value, title: typeof value.address === "string" ? value.address : "" };
  }
  return value;
}

/**
 * Older export files predate the `sketches` field. Default to an empty array
 * so those files still import cleanly.
 */
function normalizeLegacySketches(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (!Array.isArray(value.sketches)) {
    return { ...value, sketches: [] };
  }
  return value;
}

/**
 * Parses raw import-file text into a list of apartments, detecting whether the
 * file holds a single apartment (object) or a bulk export (array). Throws on
 * malformed JSON or a shape that doesn't match the export schema — callers
 * must not touch the database unless this resolves successfully.
 */
export function parseImportPayload(text: string): ExportedApartment[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed];
  if (candidates.length === 0) return [];

  const normalized = candidates
    .map(normalizeLegacyRent)
    .map(normalizeLegacyTitle)
    .map(normalizeLegacySketches);

  if (!normalized.every(isExportedApartment)) {
    throw new Error("File does not match the expected apartment export shape.");
  }

  return normalized;
}

export async function detectCollisions(apartments: ExportedApartment[]): Promise<string[]> {
  const ids = apartments.map((apartment) => apartment.id);
  const existing = await db.apartments.bulkGet(ids);
  return ids.filter((_, index) => existing[index] !== undefined);
}

export type CollisionResolution = "overwrite" | "copy";

export interface ImportOutcome {
  inserted: number;
  overwritten: number;
  copied: number;
}

export function describeOutcome(outcome: ImportOutcome): string {
  const parts: string[] = [];
  if (outcome.inserted) parts.push(`${outcome.inserted} imported`);
  if (outcome.copied) parts.push(`${outcome.copied} imported as ${outcome.copied === 1 ? "a copy" : "copies"}`);
  if (outcome.overwritten) parts.push(`${outcome.overwritten} overwritten`);
  return parts.length > 0 ? `${parts.join(", ")}.` : "Nothing to import.";
}

/**
 * Imports apartments in a single all-or-nothing transaction. `resolution`
 * applies to every colliding apartment in this batch (a single prompt covers
 * the whole file rather than one per apartment).
 */
export async function importApartments(
  apartments: ExportedApartment[],
  resolution: CollisionResolution,
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { inserted: 0, overwritten: 0, copied: 0 };

  // Resolve photo data URLs to Blobs before opening the transaction: fetch()
  // isn't tracked by IndexedDB, so awaiting it inside a Dexie transaction
  // causes the transaction to auto-commit early.
  const photoBlobs = new Map<string, Blob>();
  const sketchBlobs = new Map<string, Blob>();
  await Promise.all([
    ...apartments.flatMap((apartment) =>
      apartment.photos.map(async (photo) => {
        photoBlobs.set(photo.dataUrl, await dataUrlToBlob(photo.dataUrl));
      }),
    ),
    ...apartments.flatMap((apartment) =>
      apartment.sketches.map(async (page) => {
        sketchBlobs.set(page.dataUrl, await dataUrlToBlob(page.dataUrl));
      }),
    ),
  ]);

  await db.transaction(
    "rw",
    db.apartments,
    db.timelineEvents,
    db.actions,
    db.photos,
    db.sketchPages,
    async () => {
      for (const exported of apartments) {
        const existing = await db.apartments.get(exported.id);
        let apartmentId = exported.id;
        let regenerateNestedIds = false;

        if (existing) {
          if (resolution === "overwrite") {
            await db.actions.where("apartmentId").equals(exported.id).delete();
            await db.timelineEvents.where("apartmentId").equals(exported.id).delete();
            await db.photos.where("apartmentId").equals(exported.id).delete();
            await db.sketchPages.where("apartmentId").equals(exported.id).delete();
            await db.apartments.delete(exported.id);
            outcome.overwritten++;
          } else {
            apartmentId = crypto.randomUUID();
            regenerateNestedIds = true;
            outcome.copied++;
          }
        } else {
          outcome.inserted++;
        }

        await db.apartments.add({
          id: apartmentId,
          title: exported.title,
          address: exported.address,
          coldRent: exported.coldRent,
          warmRent: exported.warmRent,
          originalLink: exported.originalLink,
          entryDate: exported.entryDate,
          status: exported.status,
          visitDate: exported.visitDate,
          visitAddress: exported.visitAddress,
          notes: exported.notes,
          createdAt: exported.createdAt,
          updatedAt: exported.updatedAt,
        });

        const now = new Date().toISOString();

        async function insertAction(action: ExportedAction, eventId: string | null) {
          await db.actions.add({
            id: regenerateNestedIds ? crypto.randomUUID() : action.id,
            apartmentId,
            eventId,
            description: action.description,
            dueDate: action.dueDate,
            urgency: action.urgency,
            status: action.status,
            createdAt: now,
            updatedAt: now,
          });
        }

        for (const event of exported.timeline) {
          const eventId = regenerateNestedIds ? crypto.randomUUID() : event.id;
          await db.timelineEvents.add({
            id: eventId,
            apartmentId,
            date: event.date,
            shortDescription: event.shortDescription,
            longDescription: event.longDescription,
            createdAt: now,
            updatedAt: now,
          });
          for (const action of event.actions) {
            await insertAction(action, eventId);
          }
        }

        for (const action of exported.actions) {
          await insertAction(action, null);
        }

        for (const photo of exported.photos) {
          await db.photos.add({
            id: regenerateNestedIds ? crypto.randomUUID() : photo.id,
            apartmentId,
            caption: photo.caption,
            blob: photoBlobs.get(photo.dataUrl)!,
            createdAt: now,
          });
        }

        for (const page of exported.sketches) {
          await db.sketchPages.add({
            id: regenerateNestedIds ? crypto.randomUUID() : page.id,
            apartmentId,
            order: page.order,
            blob: sketchBlobs.get(page.dataUrl)!,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    },
  );

  return outcome;
}
