import type { DocumentEntry } from "../documents/types";

export interface DocumentFormValues {
  name: string;
  description: string;
}

export type DocumentFormErrors = Partial<Record<keyof DocumentFormValues, string>>;

export function entryToFormValues(entry: DocumentEntry): DocumentFormValues {
  return { name: entry.name, description: entry.description };
}

export function validateDocumentForm(values: DocumentFormValues): DocumentFormErrors {
  const errors: DocumentFormErrors = {};

  if (!values.name.trim()) errors.name = "Name is required.";
  else if (values.name.includes("/")) errors.name = 'Names cannot contain "/".';

  return errors;
}
