export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string): boolean {
  return dueDate < todayISODate();
}
