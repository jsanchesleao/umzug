import { db } from "./db";
import type { Task } from "../types";

export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt">;

export function listTasks(): Promise<Task[]> {
  return db.tasks.toArray();
}

export function getTask(id: string): Promise<Task | undefined> {
  return db.tasks.get(id);
}

export async function createTask(input: TaskInput): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await db.tasks.add(task);
  return task;
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteTaskCascade(id: string): Promise<void> {
  await db.transaction(
    "rw",
    db.tasks,
    db.taskEvents,
    db.taskActions,
    db.taskFloatingNotes,
    async () => {
      await db.taskActions.where("taskId").equals(id).delete();
      await db.taskEvents.where("taskId").equals(id).delete();
      await db.taskFloatingNotes.where("taskId").equals(id).delete();
      await db.tasks.delete(id);
    },
  );
}
