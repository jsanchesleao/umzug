import { useState } from "react";
import type { FormEvent } from "react";
import Modal from "./Modal";
import { updateApartment } from "../data/apartments";
import { createTimelineEvent } from "../data/timelineEvents";
import { APARTMENT_STATUS_LABELS } from "../types";
import type { Apartment, ApartmentStatus } from "../types";
import { todayISODate, toDateTimeLocalInputValue } from "../utils/date";

interface StatusChangeModalProps {
  apartment: Apartment;
  newStatus: ApartmentStatus;
  onClose: () => void;
}

interface FormErrors {
  visitDate?: string;
  visitAddress?: string;
  shortDescription?: string;
}

function StatusChangeModal({ apartment, newStatus, onClose }: StatusChangeModalProps) {
  const isVisitScheduled = newStatus === "VisitScheduled";
  const statusLabel = APARTMENT_STATUS_LABELS[newStatus];

  const [visitDate, setVisitDate] = useState(toDateTimeLocalInputValue(apartment.visitDate));
  const [visitAddress, setVisitAddress] = useState(apartment.address);
  const [addEvent, setAddEvent] = useState(true);
  const [shortDescription, setShortDescription] = useState(`Moved to ${statusLabel}`);
  const [longDescription, setLongDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (isVisitScheduled) {
      if (!visitDate) nextErrors.visitDate = "Visit date is required.";
      if (!visitAddress.trim()) nextErrors.visitAddress = "Visit address is required.";
    }
    if (addEvent && !shortDescription.trim()) {
      nextErrors.shortDescription = "Short description is required.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await updateApartment(apartment.id, {
        status: newStatus,
        visitDate: isVisitScheduled ? visitDate : null,
        visitAddress: isVisitScheduled ? visitAddress.trim() : null,
      });

      if (addEvent) {
        await createTimelineEvent({
          apartmentId: apartment.id,
          date: todayISODate(),
          shortDescription: shortDescription.trim(),
          longDescription: longDescription.trim() ? longDescription.trim() : null,
        });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Move to ${statusLabel}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {isVisitScheduled && (
          <>
            <div className="form-field">
              <label htmlFor="visitDate">Visit date and time *</label>
              <input
                id="visitDate"
                type="datetime-local"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              {errors.visitDate && <span className="field-error">{errors.visitDate}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="visitAddress">Visit address *</label>
              <input
                id="visitAddress"
                type="text"
                value={visitAddress}
                onChange={(e) => setVisitAddress(e.target.value)}
              />
              {errors.visitAddress && <span className="field-error">{errors.visitAddress}</span>}
            </div>
          </>
        )}

        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={addEvent}
            onChange={(e) => setAddEvent(e.target.checked)}
          />
          Add a timeline event
        </label>

        {addEvent && (
          <>
            <div className="form-field">
              <label htmlFor="shortDescription">Description *</label>
              <input
                id="shortDescription"
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
              {errors.shortDescription && (
                <span className="field-error">{errors.shortDescription}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="longDescription">Details</label>
              <textarea
                id="longDescription"
                rows={3}
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default StatusChangeModal;
