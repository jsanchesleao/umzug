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
  title: string;
  address: string;
  coldRent: number | null;
  warmRent: number | null;
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

export type TaskStatus = "ToDo" | "InProgress" | "Finished" | "Cancelled";

export const TASK_STATUSES: TaskStatus[] = ["ToDo", "InProgress", "Finished", "Cancelled"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  ToDo: "To Do",
  InProgress: "In Progress",
  Finished: "Finished",
  Cancelled: "Cancelled",
};

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  date: string;
  shortDescription: string;
  longDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAction {
  id: string;
  taskId: string;
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

export interface SketchPage {
  id: string;
  apartmentId: string;
  order: number;
  blob: Blob;
  createdAt: string;
  updatedAt: string;
}

export type DashboardNoteKind = "text" | "sketch";

export const NOTE_COLORS = ["yellow", "pink", "blue", "green", "purple"] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export interface DashboardNote {
  id: string;
  kind: DashboardNoteKind;
  text: string | null;
  blob: Blob | null;
  color: NoteColor;
  createdAt: string;
  updatedAt: string;
}

// Structural subset shared by DashboardNote and the floating-note variants below,
// so NoteCard/TextNoteModal/NoteSketchPad can render/edit any of them without a
// dependency on a specific entity type.
export interface NoteLike {
  id: string;
  kind: DashboardNoteKind;
  text: string | null;
  blob: Blob | null;
  color: NoteColor;
}

export interface FloatingNoteBase extends NoteLike {
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApartmentFloatingNote extends FloatingNoteBase {
  apartmentId: string;
}

export interface TaskFloatingNote extends FloatingNoteBase {
  taskId: string;
}

export type ThemeMode = "system" | "light" | "dark";

export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF";

export const CURRENCY_CODES: CurrencyCode[] = ["EUR", "USD", "GBP", "CHF"];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  EUR: "Euro (€)",
  USD: "US Dollar ($)",
  GBP: "British Pound (£)",
  CHF: "Swiss Franc (CHF)",
};

export type DateFormatOption = "DMY" | "MDY" | "ISO";

export const DATE_FORMAT_OPTIONS: DateFormatOption[] = ["DMY", "MDY", "ISO"];

export const DATE_FORMAT_LABELS: Record<DateFormatOption, string> = {
  DMY: "European (31/12/2026)",
  MDY: "US (12/31/2026)",
  ISO: "ISO (2026-12-31)",
};

export interface AppSettings {
  theme: ThemeMode;
  currency: CurrencyCode;
  dateFormat: DateFormatOption;
  sketchIgnoreTouch: boolean;
  hiddenKanbanColumns: ApartmentStatus[];
  hiddenTaskKanbanColumns: TaskStatus[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  currency: "EUR",
  dateFormat: "DMY",
  sketchIgnoreTouch: false,
  hiddenKanbanColumns: [],
  hiddenTaskKanbanColumns: [],
};
