import { db } from "./db";
import { NOTE_COLORS } from "../types";
import type { ApartmentFloatingNote } from "../types";

export type ApartmentFloatingNoteInput = Omit<
  ApartmentFloatingNote,
  "id" | "color" | "createdAt" | "updatedAt"
>;

export function listApartmentFloatingNotes(apartmentId: string): Promise<ApartmentFloatingNote[]> {
  return db.apartmentFloatingNotes.where("apartmentId").equals(apartmentId).sortBy("createdAt");
}

export async function createApartmentFloatingNote(
  input: ApartmentFloatingNoteInput,
): Promise<ApartmentFloatingNote> {
  const count = await db.apartmentFloatingNotes.where("apartmentId").equals(input.apartmentId).count();
  const color = NOTE_COLORS[count % NOTE_COLORS.length];
  const now = new Date().toISOString();
  const note: ApartmentFloatingNote = {
    ...input,
    color,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.apartmentFloatingNotes.add(note);
  return note;
}

export async function updateApartmentFloatingNote(
  id: string,
  patch: Partial<ApartmentFloatingNoteInput>,
): Promise<void> {
  await db.apartmentFloatingNotes.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteApartmentFloatingNote(id: string): Promise<void> {
  await db.apartmentFloatingNotes.delete(id);
}
