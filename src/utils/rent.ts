import type { CurrencyCode } from "../types";

export function formatRent(value: number | null, currency: CurrencyCode): string {
  if (value == null) return "Unknown";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
