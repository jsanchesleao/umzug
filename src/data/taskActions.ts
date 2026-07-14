import { db } from "./db";
import type { TaskAction } from "../types";
import { sortByUrgencyThenDueDate } from "../utils/actionSort";

export type TaskActionInput = Omit<TaskAction, "id" | "createdAt" | "updatedAt">;

export function listTaskActionsForTask(taskId: string): Promise<TaskAction[]> {
  return db.taskActions.where("taskId").equals(taskId).toArray();
}

export function listTaskActionsForEvent(eventId: string): Promise<TaskAction[]> {
  return db.taskActions.where("eventId").equals(eventId).toArray();
}

export function getTaskAction(id: string): Promise<TaskAction | undefined> {
  return db.taskActions.get(id);
}

export async function createTaskAction(input: TaskActionInput): Promise<TaskAction> {
  const now = new Date().toISOString();
  const action: TaskAction = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await db.taskActions.add(action);
  return action;
}

export async function updateTaskAction(
  id: string,
  patch: Partial<TaskActionInput>,
): Promise<void> {
  await db.taskActions.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteTaskAction(id: string): Promise<void> {
  await db.taskActions.delete(id);
}

/**
 * All unresolved actions across every task, sorted urgency desc / dueDate asc.
 * Runs as a single indexed query against the `status` index.
 */
export async function getUnresolvedTaskActions(): Promise<TaskAction[]> {
  const unresolved = await db.taskActions.where("status").equals("Unresolved").toArray();
  return sortByUrgencyThenDueDate(unresolved);
}

export async function countUnresolvedTaskActionsForTask(taskId: string): Promise<number> {
  return db.taskActions
    .where("taskId")
    .equals(taskId)
    .and((action) => action.status === "Unresolved")
    .count();
}

export async function listUnresolvedTaskActionsForTask(taskId: string): Promise<TaskAction[]> {
  const actions = await db.taskActions
    .where("taskId")
    .equals(taskId)
    .and((action) => action.status === "Unresolved")
    .toArray();
  return sortByUrgencyThenDueDate(actions);
}
