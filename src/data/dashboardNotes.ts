import { db } from "./db";
import { NOTE_COLORS } from "../types";
import type { DashboardNote } from "../types";

export type DashboardNoteInput = Omit<DashboardNote, "id" | "color" | "createdAt" | "updatedAt">;

export function listDashboardNotes(): Promise<DashboardNote[]> {
  return db.dashboardNotes.orderBy("createdAt").reverse().toArray();
}

export async function createDashboardNote(input: DashboardNoteInput): Promise<DashboardNote> {
  const count = await db.dashboardNotes.count();
  const color = NOTE_COLORS[count % NOTE_COLORS.length];
  const now = new Date().toISOString();
  const note: DashboardNote = {
    ...input,
    color,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.dashboardNotes.add(note);
  return note;
}

export async function updateDashboardNote(
  id: string,
  patch: Partial<DashboardNoteInput>,
): Promise<void> {
  await db.dashboardNotes.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteDashboardNote(id: string): Promise<void> {
  await db.dashboardNotes.delete(id);
}
