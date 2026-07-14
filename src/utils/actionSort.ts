import type { ActionUrgency } from "../types";

const URGENCY_RANK: Record<ActionUrgency, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export function sortByUrgencyThenDueDate<T extends { urgency: ActionUrgency; dueDate: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const urgencyDiff = URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
