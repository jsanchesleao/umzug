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
  }
}

export const db = new UmzugDB();
