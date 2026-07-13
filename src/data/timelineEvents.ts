import { db } from "./db";
import type { TimelineEvent } from "../types";

export type TimelineEventInput = Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">;

export function listTimelineEventsForApartment(apartmentId: string): Promise<TimelineEvent[]> {
  return db.timelineEvents.where("apartmentId").equals(apartmentId).sortBy("date");
}

export function getTimelineEvent(id: string): Promise<TimelineEvent | undefined> {
  return db.timelineEvents.get(id);
}

export async function createTimelineEvent(input: TimelineEventInput): Promise<TimelineEvent> {
  const now = new Date().toISOString();
  const event: TimelineEvent = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.timelineEvents.add(event);
  return event;
}

export async function updateTimelineEvent(
  id: string,
  patch: Partial<TimelineEventInput>,
): Promise<void> {
  await db.timelineEvents.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteTimelineEventCascade(id: string): Promise<void> {
  await db.transaction("rw", db.timelineEvents, db.actions, async () => {
    await db.actions.where("eventId").equals(id).delete();
    await db.timelineEvents.delete(id);
  });
}

export function countActionsForEvent(eventId: string): Promise<number> {
  return db.actions.where("eventId").equals(eventId).count();
}
