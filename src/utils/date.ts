import type { DateFormatOption } from "../types";

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string): boolean {
  return dueDate < todayISODate();
}

export function formatDate(isoDate: string, format: DateFormatOption): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  switch (format) {
    case "MDY":
      return `${month}/${day}/${year}`;
    case "ISO":
      return `${year}-${month}-${day}`;
    case "DMY":
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatDateTime(isoDateTime: string, format: DateFormatOption): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;

  const localIsoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `${formatDate(localIsoDate, format)} ${time}`;
}
