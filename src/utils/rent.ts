export function formatRent(value: number | null): string {
  return value == null ? "Unknown" : String(value);
}
