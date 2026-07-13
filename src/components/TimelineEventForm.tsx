import { useState } from "react";
import type { FormEvent } from "react";
import {
  type TimelineEventFormValues,
  validateTimelineEventForm,
  timelineEventFormValuesToPatch,
} from "../utils/timelineEventForm";

interface TimelineEventFormProps {
  initialValues: TimelineEventFormValues;
  submitLabel: string;
  onSubmit: (patch: ReturnType<typeof timelineEventFormValuesToPatch>) => void | Promise<void>;
  onCancel: () => void;
}

function TimelineEventForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: TimelineEventFormProps) {
  const [values, setValues] = useState<TimelineEventFormValues>(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateTimelineEventForm>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof TimelineEventFormValues>(
    field: K,
    value: TimelineEventFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateTimelineEventForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(timelineEventFormValuesToPatch(values));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="event-date">Date *</label>
        <input
          id="event-date"
          type="date"
          value={values.date}
          onChange={(e) => update("date", e.target.value)}
        />
        {errors.date && <span className="field-error">{errors.date}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="event-shortDescription">Short description *</label>
        <input
          id="event-shortDescription"
          type="text"
          value={values.shortDescription}
          onChange={(e) => update("shortDescription", e.target.value)}
        />
        {errors.shortDescription && (
          <span className="field-error">{errors.shortDescription}</span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="event-longDescription">Long description</label>
        <textarea
          id="event-longDescription"
          rows={4}
          value={values.longDescription}
          onChange={(e) => update("longDescription", e.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default TimelineEventForm;
