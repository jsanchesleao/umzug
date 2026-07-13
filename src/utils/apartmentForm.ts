import { APARTMENT_STATUSES, type Apartment, type ApartmentStatus } from "../types";
import type { ApartmentInput } from "../data/apartments";
import { todayISODate } from "./date";

export interface ApartmentFormValues {
  address: string;
  coldRent: string;
  warmRent: string;
  originalLink: string;
  entryDate: string;
  status: ApartmentStatus;
  visitDate: string;
  visitAddress: string;
  notes: string;
}

export type ApartmentFormErrors = Partial<Record<keyof ApartmentFormValues, string>>;

export function emptyApartmentFormValues(): ApartmentFormValues {
  return {
    address: "",
    coldRent: "",
    warmRent: "",
    originalLink: "",
    entryDate: todayISODate(),
    status: "AwaitingVisitation",
    visitDate: "",
    visitAddress: "",
    notes: "",
  };
}

export function apartmentToFormValues(apartment: Apartment): ApartmentFormValues {
  return {
    address: apartment.address,
    coldRent: apartment.coldRent != null ? String(apartment.coldRent) : "",
    warmRent: apartment.warmRent != null ? String(apartment.warmRent) : "",
    originalLink: apartment.originalLink,
    entryDate: apartment.entryDate,
    status: apartment.status,
    visitDate: apartment.visitDate ?? "",
    visitAddress: apartment.visitAddress ?? apartment.address,
    notes: apartment.notes,
  };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateApartmentForm(values: ApartmentFormValues): ApartmentFormErrors {
  const errors: ApartmentFormErrors = {};

  if (!values.address.trim()) errors.address = "Address is required.";

  if (values.coldRent.trim()) {
    const coldRent = Number(values.coldRent);
    if (Number.isNaN(coldRent) || coldRent < 0) {
      errors.coldRent = "Cold rent must be a non-negative number.";
    }
  }

  if (values.warmRent.trim()) {
    const warmRent = Number(values.warmRent);
    if (Number.isNaN(warmRent) || warmRent < 0) {
      errors.warmRent = "Warm rent must be a non-negative number.";
    }
  }

  if (!values.originalLink.trim()) {
    errors.originalLink = "Link is required.";
  } else if (!isValidUrl(values.originalLink.trim())) {
    errors.originalLink = "Enter a valid URL.";
  }

  if (!values.entryDate) errors.entryDate = "Entry date is required.";

  if (!APARTMENT_STATUSES.includes(values.status)) errors.status = "Select a status.";

  if (values.status === "VisitScheduled") {
    if (!values.visitDate) errors.visitDate = "Visit date is required for Visit Scheduled.";
    if (!values.visitAddress.trim()) {
      errors.visitAddress = "Visit address is required for Visit Scheduled.";
    }
  }

  return errors;
}

export function apartmentFormValuesToInput(values: ApartmentFormValues): ApartmentInput {
  return {
    address: values.address.trim(),
    coldRent: values.coldRent.trim() ? Number(values.coldRent) : null,
    warmRent: values.warmRent.trim() ? Number(values.warmRent) : null,
    originalLink: values.originalLink.trim(),
    entryDate: values.entryDate,
    status: values.status,
    visitDate: values.status === "VisitScheduled" ? values.visitDate : null,
    visitAddress: values.status === "VisitScheduled" ? values.visitAddress.trim() : null,
    notes: values.notes,
  };
}
