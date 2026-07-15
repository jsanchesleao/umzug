import { db } from "./db";
import type { TaskEvent } from "../types";

export type TaskEventInput = Omit<TaskEvent, "id" | "createdAt" | "updatedAt">;

export function listTaskEventsForTask(taskId: string): Promise<TaskEvent[]> {
  return db.taskEvents.where("taskId").equals(taskId).sortBy("date");
}

/**
 * The N most recent task events across every task, newest first.
 * Runs as a single indexed query against the `date` index (reverse order).
 */
export function listRecentTaskEvents(limit: number): Promise<TaskEvent[]> {
  return db.taskEvents.orderBy("date").reverse().limit(limit).toArray();
}

export function getTaskEvent(id: string): Promise<TaskEvent | undefined> {
  return db.taskEvents.get(id);
}

export async function createTaskEvent(input: TaskEventInput): Promise<TaskEvent> {
  const now = new Date().toISOString();
  const event: TaskEvent = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await db.taskEvents.add(event);
  return event;
}

export async function updateTaskEvent(id: string, patch: Partial<TaskEventInput>): Promise<void> {
  await db.taskEvents.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteTaskEventCascade(id: string): Promise<void> {
  await db.transaction("rw", db.taskEvents, db.taskActions, async () => {
    await db.taskActions.where("eventId").equals(id).delete();
    await db.taskEvents.delete(id);
  });
}

export function countTaskActionsForEvent(eventId: string): Promise<number> {
  return db.taskActions.where("eventId").equals(eventId).count();
}
