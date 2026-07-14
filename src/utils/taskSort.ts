import { TASK_STATUSES } from "../types";
import type { Task, TaskStatus } from "../types";

export type TaskSortOption = "updatedAt" | "title" | "status";

export const TASK_SORT_OPTIONS: TaskSortOption[] = ["updatedAt", "title", "status"];

export const TASK_SORT_LABELS: Record<TaskSortOption, string> = {
  updatedAt: "Last updated",
  title: "Title (A–Z)",
  status: "Status",
};

const STATUS_RANK: Record<TaskStatus, number> = Object.fromEntries(
  TASK_STATUSES.map((status, index) => [status, index]),
) as Record<TaskStatus, number>;

export function sortTasks(tasks: Task[], sortBy: TaskSortOption): Task[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "status":
      return sorted.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    case "updatedAt":
    default:
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}
