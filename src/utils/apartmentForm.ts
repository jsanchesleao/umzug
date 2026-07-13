import { APARTMENT_STATUSES, type Apartment, type ApartmentStatus } from "../types";
import type { ApartmentInput } from "../data/apartments";
import { todayISODate } from "./date";

export interface ApartmentFormValues {
  address: string;
  rentCost: string;
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
    rentCost: "",
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
    rentCost: String(apartment.rentCost),
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

  if (!values.rentCost.trim()) {
    errors.rentCost = "Rent is required.";
  } else {
    const rent = Number(values.rentCost);
    if (Number.isNaN(rent) || rent <= 0) errors.rentCost = "Rent must be a positive number.";
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
    rentCost: Number(values.rentCost),
    originalLink: values.originalLink.trim(),
    entryDate: values.entryDate,
    status: values.status,
    visitDate: values.status === "VisitScheduled" ? values.visitDate : null,
    visitAddress: values.status === "VisitScheduled" ? values.visitAddress.trim() : null,
    notes: values.notes,
  };
}
