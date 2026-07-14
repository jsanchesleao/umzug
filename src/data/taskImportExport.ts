import { db } from "./db";
import { getTask, listTasks } from "./tasks";
import { listTaskEventsForTask } from "./taskEvents";
import { listTaskActionsForTask } from "./taskActions";
import {
  ACTION_STATUSES,
  ACTION_URGENCIES,
  TASK_STATUSES,
  type ActionStatus,
  type ActionUrgency,
  type TaskAction,
  type TaskStatus,
} from "../types";
import type { CollisionResolution, ImportOutcome } from "./importExport";

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

export interface ExportedTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  timeline: ExportedTaskEvent[];
  actions: ExportedTaskAction[];
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

  const [events, allActions] = await Promise.all([
    listTaskEventsForTask(taskId),
    listTaskActionsForTask(taskId),
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

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    timeline,
    actions: directActions,
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
    value.actions.every(isExportedTaskAction)
  );
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

  if (!candidates.every(isExportedTask)) {
    throw new Error("File does not match the expected task export shape.");
  }

  return candidates;
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

  await db.transaction("rw", db.tasks, db.taskEvents, db.taskActions, async () => {
    for (const exported of tasks) {
      const existing = await db.tasks.get(exported.id);
      let taskId = exported.id;
      let regenerateNestedIds = false;

      if (existing) {
        if (resolution === "overwrite") {
          await db.taskActions.where("taskId").equals(exported.id).delete();
          await db.taskEvents.where("taskId").equals(exported.id).delete();
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
    }
  });

  return outcome;
}
