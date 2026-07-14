import { APARTMENT_STATUSES } from "../types";
import type { Apartment, ApartmentStatus } from "../types";

export type ApartmentSortOption = "updatedAt" | "title" | "status";

export const APARTMENT_SORT_OPTIONS: ApartmentSortOption[] = ["updatedAt", "title", "status"];

export const APARTMENT_SORT_LABELS: Record<ApartmentSortOption, string> = {
  updatedAt: "Last updated",
  title: "Title (A–Z)",
  status: "Status",
};

const STATUS_RANK: Record<ApartmentStatus, number> = Object.fromEntries(
  APARTMENT_STATUSES.map((status, index) => [status, index]),
) as Record<ApartmentStatus, number>;

export function sortApartments(apartments: Apartment[], sortBy: ApartmentSortOption): Apartment[] {
  const sorted = [...apartments];
  switch (sortBy) {
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "status":
      return sorted.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    case "updatedAt":
    default:
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}
