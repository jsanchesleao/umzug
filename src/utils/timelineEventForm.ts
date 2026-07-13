import type { TimelineEvent } from "../types";
import { todayISODate } from "./date";

export interface TimelineEventFormValues {
  date: string;
  shortDescription: string;
  longDescription: string;
}

export type TimelineEventFormErrors = Partial<Record<keyof TimelineEventFormValues, string>>;

export function emptyTimelineEventFormValues(): TimelineEventFormValues {
  return {
    date: todayISODate(),
    shortDescription: "",
    longDescription: "",
  };
}

export function timelineEventToFormValues(event: TimelineEvent): TimelineEventFormValues {
  return {
    date: event.date,
    shortDescription: event.shortDescription,
    longDescription: event.longDescription ?? "",
  };
}

export function validateTimelineEventForm(
  values: TimelineEventFormValues,
): TimelineEventFormErrors {
  const errors: TimelineEventFormErrors = {};

  if (!values.date) errors.date = "Date is required.";
  if (!values.shortDescription.trim()) {
    errors.shortDescription = "Short description is required.";
  }

  return errors;
}

export function timelineEventFormValuesToPatch(values: TimelineEventFormValues) {
  return {
    date: values.date,
    shortDescription: values.shortDescription.trim(),
    longDescription: values.longDescription.trim() ? values.longDescription.trim() : null,
  };
}
