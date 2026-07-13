import { useState } from "react";
import type { FormEvent } from "react";
import { ACTION_URGENCIES, ACTION_STATUSES } from "../types";
import type { ActionStatus, ActionUrgency } from "../types";
import {
  type ActionFormValues,
  validateActionForm,
  actionFormValuesToPatch,
} from "../utils/actionForm";

interface ActionFormProps {
  initialValues: ActionFormValues;
  submitLabel: string;
  onSubmit: (patch: ReturnType<typeof actionFormValuesToPatch>) => void | Promise<void>;
  onCancel: () => void;
}

function ActionForm({ initialValues, submitLabel, onSubmit, onCancel }: ActionFormProps) {
  const [values, setValues] = useState<ActionFormValues>(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateActionForm>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof ActionFormValues>(field: K, value: ActionFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateActionForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(actionFormValuesToPatch(values));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="action-description">Description *</label>
        <input
          id="action-description"
          type="text"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="action-dueDate">Due date *</label>
        <input
          id="action-dueDate"
          type="date"
          value={values.dueDate}
          onChange={(e) => update("dueDate", e.target.value)}
        />
        {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="action-urgency">Urgency *</label>
        <select
          id="action-urgency"
          value={values.urgency}
          onChange={(e) => update("urgency", e.target.value as ActionUrgency)}
        >
          {ACTION_URGENCIES.map((urgency) => (
            <option key={urgency} value={urgency}>
              {urgency}
            </option>
          ))}
        </select>
        {errors.urgency && <span className="field-error">{errors.urgency}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="action-status">Status *</label>
        <select
          id="action-status"
          value={values.status}
          onChange={(e) => update("status", e.target.value as ActionStatus)}
        >
          {ACTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {errors.status && <span className="field-error">{errors.status}</span>}
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

export default ActionForm;
