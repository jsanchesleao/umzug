import { db } from "./db";
import { getTask, listTasks } from "./tasks";
import { listTaskEventsForTask } from "./taskEvents";
import { listTaskActionsForTask } from "./taskActions";
import { listTaskFloatingNotes } from "./taskFloatingNotes";
import {
  ACTION_STATUSES,
  ACTION_URGENCIES,
  NOTE_COLORS,
  TASK_STATUSES,
  type ActionStatus,
  type ActionUrgency,
  type DashboardNoteKind,
  type NoteColor,
  type TaskAction,
  type TaskStatus,
} from "../types";
import { blobToDataUrl, dataUrlToBlob, type CollisionResolution, type ImportOutcome } from "./importExport";

export interface ExportedTaskAction {
  id: string;
  description: string;
  dueDate: string;
  urgency: ActionUrgency;
  status: ActionStatus;
}

export interface ExportedTaskEvent {
  id: string;
  date: string;
  shortDescription: string;
  longDescription: string | null;
  actions: ExportedTaskAction[];
}

export interface ExportedTaskFloatingNote {
  id: string;
  kind: DashboardNoteKind;
  text: string | null;
  dataUrl: string | null; // null for kind "text"
  color: NoteColor;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  timeline: ExportedTaskEvent[];
  actions: ExportedTaskAction[];
  floatingNotes: ExportedTaskFloatingNote[];
}

function toExportedTaskAction(action: TaskAction): ExportedTaskAction {
  return {
    id: action.id,
    description: action.description,
    dueDate: action.dueDate,
    urgency: action.urgency,
    status: action.status,
  };
}

export async function buildTaskExport(taskId: string): Promise<ExportedTask> {
  const task = await getTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const [events, allActions, floatingNotes] = await Promise.all([
    listTaskEventsForTask(taskId),
    listTaskActionsForTask(taskId),
    listTaskFloatingNotes(taskId),
  ]);

  const timeline: ExportedTaskEvent[] = events.map((event) => ({
    id: event.id,
    date: event.date,
    shortDescription: event.shortDescription,
    longDescription: event.longDescription,
    actions: allActions.filter((action) => action.eventId === event.id).map(toExportedTaskAction),
  }));

  const directActions = allActions
    .filter((action) => action.eventId === null)
    .map(toExportedTaskAction);

  const exportedFloatingNotes: ExportedTaskFloatingNote[] = await Promise.all(
    floatingNotes.map(async (note) => ({
      id: note.id,
      kind: note.kind,
      text: note.text,
      dataUrl: note.blob ? await blobToDataUrl(note.blob) : null,
      color: note.color,
      x: note.x,
      y: note.y,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  );

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    timeline,
    actions: directActions,
    floatingNotes: exportedFloatingNotes,
  };
}

export async function buildAllTasksExport(): Promise<ExportedTask[]> {
  const tasks = await listTasks();
  return Promise.all(tasks.map((task) => buildTaskExport(task.id)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExportedTaskAction(value: unknown): value is ExportedTaskAction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.dueDate === "string" &&
    ACTION_URGENCIES.includes(value.urgency as ActionUrgency) &&
    ACTION_STATUSES.includes(value.status as ActionStatus)
  );
}

function isExportedTaskEvent(value: unknown): value is ExportedTaskEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.shortDescription === "string" &&
    (value.longDescription === null || typeof value.longDescription === "string") &&
    Array.isArray(value.actions) &&
    value.actions.every(isExportedTaskAction)
  );
}

function isExportedTaskFloatingNote(value: unknown): value is ExportedTaskFloatingNote {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.kind === "text" || value.kind === "sketch") &&
    (value.text === null || typeof value.text === "string") &&
    (value.dataUrl === null || typeof value.dataUrl === "string") &&
    NOTE_COLORS.includes(value.color as NoteColor) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isExportedTask(value: unknown): value is ExportedTask {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    TASK_STATUSES.includes(value.status as TaskStatus) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.timeline) &&
    value.timeline.every(isExportedTaskEvent) &&
    Array.isArray(value.actions) &&
    value.actions.every(isExportedTaskAction) &&
    Array.isArray(value.floatingNotes) &&
    value.floatingNotes.every(isExportedTaskFloatingNote)
  );
}

/**
 * Older export files predate the `floatingNotes` field. Default to an empty
 * array so those files still import cleanly.
 */
function normalizeLegacyFloatingNotes(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (!Array.isArray(value.floatingNotes)) {
    return { ...value, floatingNotes: [] };
  }
  return value;
}

/**
 * Parses raw import-file text into a list of tasks, detecting whether the
 * file holds a single task (object) or a bulk export (array). Throws on
 * malformed JSON or a shape that doesn't match the export schema — callers
 * must not touch the database unless this resolves successfully.
 */
export function parseTaskImportPayload(text: string): ExportedTask[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed];
  if (candidates.length === 0) return [];

  const normalized = candidates.map(normalizeLegacyFloatingNotes);

  if (!normalized.every(isExportedTask)) {
    throw new Error("File does not match the expected task export shape.");
  }

  return normalized;
}

export async function detectTaskCollisions(tasks: ExportedTask[]): Promise<string[]> {
  const ids = tasks.map((task) => task.id);
  const existing = await db.tasks.bulkGet(ids);
  return ids.filter((_, index) => existing[index] !== undefined);
}

/**
 * Imports tasks in a single all-or-nothing transaction. `resolution` applies
 * to every colliding task in this batch (a single prompt covers the whole
 * file rather than one per task).
 */
export async function importTasks(
  tasks: ExportedTask[],
  resolution: CollisionResolution,
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { inserted: 0, overwritten: 0, copied: 0 };

  // Resolve sketch-note data URLs to Blobs before opening the transaction:
  // fetch() isn't tracked by IndexedDB, so awaiting it inside a Dexie
  // transaction causes the transaction to auto-commit early.
  const floatingNoteBlobs = new Map<string, Blob>();
  await Promise.all(
    tasks.flatMap((task) =>
      task.floatingNotes
        .filter((note) => note.dataUrl !== null)
        .map(async (note) => {
          floatingNoteBlobs.set(note.dataUrl!, await dataUrlToBlob(note.dataUrl!));
        }),
    ),
  );

  await db.transaction("rw", db.tasks, db.taskEvents, db.taskActions, db.taskFloatingNotes, async () => {
    for (const exported of tasks) {
      const existing = await db.tasks.get(exported.id);
      let taskId = exported.id;
      let regenerateNestedIds = false;

      if (existing) {
        if (resolution === "overwrite") {
          await db.taskActions.where("taskId").equals(exported.id).delete();
          await db.taskEvents.where("taskId").equals(exported.id).delete();
          await db.taskFloatingNotes.where("taskId").equals(exported.id).delete();
          await db.tasks.delete(exported.id);
          outcome.overwritten++;
        } else {
          taskId = crypto.randomUUID();
          regenerateNestedIds = true;
          outcome.copied++;
        }
      } else {
        outcome.inserted++;
      }

      await db.tasks.add({
        id: taskId,
        title: exported.title,
        description: exported.description,
        status: exported.status,
        createdAt: exported.createdAt,
        updatedAt: exported.updatedAt,
      });

      const now = new Date().toISOString();

      async function insertAction(action: ExportedTaskAction, eventId: string | null) {
        await db.taskActions.add({
          id: regenerateNestedIds ? crypto.randomUUID() : action.id,
          taskId,
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
        await db.taskEvents.add({
          id: eventId,
          taskId,
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

      for (const note of exported.floatingNotes) {
        await db.taskFloatingNotes.add({
          id: regenerateNestedIds ? crypto.randomUUID() : note.id,
          taskId,
          kind: note.kind,
          text: note.text,
          blob: note.dataUrl ? floatingNoteBlobs.get(note.dataUrl)! : null,
          color: note.color,
          x: note.x,
          y: note.y,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        });
      }
    }
  });

  return outcome;
}
