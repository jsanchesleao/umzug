import { db } from "./db";
import { NOTE_COLORS } from "../types";
import type { TaskFloatingNote } from "../types";

export type TaskFloatingNoteInput = Omit<
  TaskFloatingNote,
  "id" | "color" | "createdAt" | "updatedAt"
>;

export function listTaskFloatingNotes(taskId: string): Promise<TaskFloatingNote[]> {
  return db.taskFloatingNotes.where("taskId").equals(taskId).sortBy("createdAt");
}

export async function createTaskFloatingNote(
  input: TaskFloatingNoteInput,
): Promise<TaskFloatingNote> {
  const count = await db.taskFloatingNotes.where("taskId").equals(input.taskId).count();
  const color = NOTE_COLORS[count % NOTE_COLORS.length];
  const now = new Date().toISOString();
  const note: TaskFloatingNote = {
    ...input,
    color,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.taskFloatingNotes.add(note);
  return note;
}

export async function updateTaskFloatingNote(
  id: string,
  patch: Partial<TaskFloatingNoteInput>,
): Promise<void> {
  await db.taskFloatingNotes.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteTaskFloatingNote(id: string): Promise<void> {
  await db.taskFloatingNotes.delete(id);
}
