import { db } from "./db";
import type { Apartment } from "../types";

export type ApartmentInput = Omit<Apartment, "id" | "createdAt" | "updatedAt">;

export function listApartments(): Promise<Apartment[]> {
  return db.apartments.toArray();
}

export function getApartment(id: string): Promise<Apartment | undefined> {
  return db.apartments.get(id);
}

export async function createApartment(input: ApartmentInput): Promise<Apartment> {
  const now = new Date().toISOString();
  const apartment: Apartment = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.apartments.add(apartment);
  return apartment;
}

export async function updateApartment(
  id: string,
  patch: Partial<ApartmentInput>,
): Promise<void> {
  await db.apartments.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteApartmentCascade(id: string): Promise<void> {
  await db.transaction(
    "rw",
    db.apartments,
    db.timelineEvents,
    db.actions,
    db.photos,
    async () => {
      await db.actions.where("apartmentId").equals(id).delete();
      await db.timelineEvents.where("apartmentId").equals(id).delete();
      await db.photos.where("apartmentId").equals(id).delete();
      await db.apartments.delete(id);
    },
  );
}
