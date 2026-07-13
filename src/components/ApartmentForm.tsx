import { useState } from "react";
import type { FormEvent } from "react";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import {
  type ApartmentFormValues,
  validateApartmentForm,
  apartmentFormValuesToInput,
} from "../utils/apartmentForm";
import type { ApartmentInput } from "../data/apartments";

interface ApartmentFormProps {
  initialValues: ApartmentFormValues;
  submitLabel: string;
  onSubmit: (input: ApartmentInput) => void | Promise<void>;
  onCancel: () => void;
}

function ApartmentForm({ initialValues, submitLabel, onSubmit, onCancel }: ApartmentFormProps) {
  const [values, setValues] = useState<ApartmentFormValues>(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateApartmentForm>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof ApartmentFormValues>(field: K, value: ApartmentFormValues[K]) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "status" && value === "VisitScheduled" && !prev.visitAddress) {
        next.visitAddress = prev.address;
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateApartmentForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(apartmentFormValuesToInput(values));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="address">Address</label>
        <input
          id="address"
          type="text"
          value={values.address}
          onChange={(e) => update("address", e.target.value)}
        />
        {errors.address && <span className="field-error">{errors.address}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="coldRent">Cold rent</label>
        <input
          id="coldRent"
          type="number"
          min="0"
          step="0.01"
          value={values.coldRent}
          onChange={(e) => update("coldRent", e.target.value)}
        />
        {errors.coldRent && <span className="field-error">{errors.coldRent}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="warmRent">Warm rent</label>
        <input
          id="warmRent"
          type="number"
          min="0"
          step="0.01"
          value={values.warmRent}
          onChange={(e) => update("warmRent", e.target.value)}
        />
        {errors.warmRent && <span className="field-error">{errors.warmRent}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="originalLink">Listing link</label>
        <input
          id="originalLink"
          type="text"
          placeholder="https://…"
          value={values.originalLink}
          onChange={(e) => update("originalLink", e.target.value)}
        />
        {errors.originalLink && <span className="field-error">{errors.originalLink}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="entryDate">Entry date *</label>
        <input
          id="entryDate"
          type="date"
          value={values.entryDate}
          onChange={(e) => update("entryDate", e.target.value)}
        />
        {errors.entryDate && <span className="field-error">{errors.entryDate}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="status">Status *</label>
        <select
          id="status"
          value={values.status}
          onChange={(e) => update("status", e.target.value as ApartmentFormValues["status"])}
        >
          {APARTMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APARTMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {errors.status && <span className="field-error">{errors.status}</span>}
      </div>

      {values.status === "VisitScheduled" && (
        <>
          <div className="form-field">
            <label htmlFor="visitDate">Visit date *</label>
            <input
              id="visitDate"
              type="datetime-local"
              value={values.visitDate}
              onChange={(e) => update("visitDate", e.target.value)}
            />
            {errors.visitDate && <span className="field-error">{errors.visitDate}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="visitAddress">Visit address *</label>
            <input
              id="visitAddress"
              type="text"
              value={values.visitAddress}
              onChange={(e) => update("visitAddress", e.target.value)}
            />
            {errors.visitAddress && <span className="field-error">{errors.visitAddress}</span>}
          </div>
        </>
      )}

      <div className="form-field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
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

export default ApartmentForm;
