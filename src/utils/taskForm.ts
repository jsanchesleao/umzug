import { TASK_STATUSES, type Task, type TaskStatus } from "../types";
import type { TaskInput } from "../data/tasks";

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
}

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

export function emptyTaskFormValues(): TaskFormValues {
  return {
    title: "",
    description: "",
    status: "ToDo",
  };
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
  };
}

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  if (!values.title.trim()) errors.title = "Title is required.";
  if (!TASK_STATUSES.includes(values.status)) errors.status = "Select a status.";

  return errors;
}

export function taskFormValuesToInput(values: TaskFormValues): TaskInput {
  return {
    title: values.title.trim(),
    description: values.description,
    status: values.status,
  };
}
