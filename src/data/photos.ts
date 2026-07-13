import { db } from "./db";
import type { Photo } from "../types";

export type PhotoInput = Omit<Photo, "id" | "createdAt">;

export function listPhotosForApartment(apartmentId: string): Promise<Photo[]> {
  return db.photos.where("apartmentId").equals(apartmentId).sortBy("createdAt");
}

export async function createPhoto(input: PhotoInput): Promise<Photo> {
  const photo: Photo = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await db.photos.add(photo);
  return photo;
}

export async function updatePhotoCaption(id: string, caption: string | null): Promise<void> {
  await db.photos.update(id, { caption });
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}
