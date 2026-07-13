import Dexie, { type Table } from "dexie";
import type { Action, Apartment, Photo, TimelineEvent } from "../types";

class UmzugDB extends Dexie {
  apartments!: Table<Apartment, string>;
  timelineEvents!: Table<TimelineEvent, string>;
  actions!: Table<Action, string>;
  photos!: Table<Photo, string>;

  constructor() {
    super("umzug");
    this.version(1).stores({
      apartments: "id, status, entryDate",
      timelineEvents: "id, apartmentId, date",
      actions: "id, apartmentId, eventId, status, dueDate",
      photos: "id, apartmentId",
    });

    this.version(2)
      .stores({
        apartments: "id, status, entryDate",
        timelineEvents: "id, apartmentId, date",
        actions: "id, apartmentId, eventId, status, dueDate",
        photos: "id, apartmentId",
      })
      .upgrade(async (tx) => {
        await tx
          .table("apartments")
          .toCollection()
          .modify((apartment: Record<string, unknown>) => {
            apartment.coldRent = apartment.rentCost ?? null;
            apartment.warmRent = null;
            delete apartment.rentCost;
          });
      });
  }
}

export const db = new UmzugDB();
