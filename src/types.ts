export type ApartmentStatus =
  | "AwaitingVisitation"
  | "VisitScheduled"
  | "Visited"
  | "AwaitingResponse"
  | "Confirmed"
  | "Cancelled";

export const APARTMENT_STATUSES: ApartmentStatus[] = [
  "AwaitingVisitation",
  "VisitScheduled",
  "Visited",
  "AwaitingResponse",
  "Confirmed",
  "Cancelled",
];

export const APARTMENT_STATUS_LABELS: Record<ApartmentStatus, string> = {
  AwaitingVisitation: "Awaiting Visitation",
  VisitScheduled: "Visit Scheduled",
  Visited: "Visited",
  AwaitingResponse: "Awaiting Response",
  Confirmed: "Confirmed",
  Cancelled: "Cancelled",
};

export type ActionUrgency = "Low" | "Medium" | "High" | "Critical";

export const ACTION_URGENCIES: ActionUrgency[] = ["Low", "Medium", "High", "Critical"];

export type ActionStatus = "Unresolved" | "Resolved" | "Cancelled";

export const ACTION_STATUSES: ActionStatus[] = ["Unresolved", "Resolved", "Cancelled"];

export interface Apartment {
  id: string;
  address: string;
  rentCost: number;
  originalLink: string;
  entryDate: string;
  status: ApartmentStatus;
  visitDate: string | null;
  visitAddress: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  apartmentId: string;
  date: string;
  shortDescription: string;
  longDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id: string;
  apartmentId: string;
  eventId: string | null;
  description: string;
  dueDate: string;
  urgency: ActionUrgency;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  apartmentId: string;
  blob: Blob;
  caption: string | null;
  createdAt: string;
}
