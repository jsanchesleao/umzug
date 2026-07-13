import { ACTION_URGENCIES, ACTION_STATUSES, type Action, type ActionStatus, type ActionUrgency } from "../types";
import { todayISODate } from "./date";

export interface ActionFormValues {
  description: string;
  dueDate: string;
  urgency: ActionUrgency;
  status: ActionStatus;
}

export type ActionFormErrors = Partial<Record<keyof ActionFormValues, string>>;

export function emptyActionFormValues(): ActionFormValues {
  return {
    description: "",
    dueDate: todayISODate(),
    urgency: "Medium",
    status: "Unresolved",
  };
}

export function actionToFormValues(action: Action): ActionFormValues {
  return {
    description: action.description,
    dueDate: action.dueDate,
    urgency: action.urgency,
    status: action.status,
  };
}

export function validateActionForm(values: ActionFormValues): ActionFormErrors {
  const errors: ActionFormErrors = {};

  if (!values.description.trim()) errors.description = "Description is required.";
  if (!values.dueDate) errors.dueDate = "Due date is required.";
  if (!ACTION_URGENCIES.includes(values.urgency)) errors.urgency = "Select an urgency.";
  if (!ACTION_STATUSES.includes(values.status)) errors.status = "Select a status.";

  return errors;
}

export function actionFormValuesToPatch(values: ActionFormValues) {
  return {
    description: values.description.trim(),
    dueDate: values.dueDate,
    urgency: values.urgency,
    status: values.status,
  };
}
