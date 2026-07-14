import { useState } from "react";
import type { FormEvent } from "react";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "../types";
import { type TaskFormValues, validateTaskForm, taskFormValuesToInput } from "../utils/taskForm";
import type { TaskInput } from "../data/tasks";

interface TaskFormProps {
  initialValues: TaskFormValues;
  submitLabel: string;
  onSubmit: (input: TaskInput) => void | Promise<void>;
  onCancel: () => void;
}

function TaskForm({ initialValues, submitLabel, onSubmit, onCancel }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateTaskForm>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateTaskForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(taskFormValuesToInput(values));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="task-title">Title *</label>
        <input
          id="task-title"
          type="text"
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          rows={4}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="task-status">Status *</label>
        <select
          id="task-status"
          value={values.status}
          onChange={(e) => update("status", e.target.value as TaskFormValues["status"])}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
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

export default TaskForm;
