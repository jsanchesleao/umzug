import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import KanbanBoard from "../components/KanbanBoard";
import ApartmentListView from "../components/ApartmentListView";
import ApartmentModal from "../components/ApartmentModal";
import StatusChangeModal from "../components/StatusChangeModal";
import FilterBar from "../components/FilterBar";
import ColumnVisibilityMenu from "../components/ColumnVisibilityMenu";
import { useSettings } from "../settings/useSettings";
import { listApartments } from "../data/apartments";
import { getUnresolvedActions } from "../data/actions";
import { sortApartments } from "../utils/apartmentSort";
import type { ApartmentSortOption } from "../utils/apartmentSort";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { Apartment, ApartmentStatus } from "../types";

type ModalState =
  | { mode: "add" }
  | { mode: "status"; apartment: Apartment; newStatus: ApartmentStatus }
  | null;

type ViewMode = "list" | "kanban";

function Apartments() {
  const apartments = useLiveQuery(() => listApartments(), []);
  const unresolvedActions = useLiveQuery(() => getUnresolvedActions(), []);
  const { settings, updateSettings } = useSettings();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [search, setSearch] = useState("");
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApartmentStatus[]>([]);
  const [sortBy, setSortBy] = useState<ApartmentSortOption>("updatedAt");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const unresolvedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const action of unresolvedActions ?? []) {
      counts.set(action.apartmentId, (counts.get(action.apartmentId) ?? 0) + 1);
    }
    return counts;
  }, [unresolvedActions]);

  const filteredApartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (apartments ?? []).filter((apartment) => {
      if (onlyUnresolved && !unresolvedCounts.has(apartment.id)) return false;
      if (viewMode === "list" && statusFilter.length > 0 && !statusFilter.includes(apartment.status)) {
        return false;
      }
      if (query) {
        const matches =
          apartment.title.toLowerCase().includes(query) ||
          apartment.address.toLowerCase().includes(query) ||
          apartment.notes.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [apartments, search, onlyUnresolved, unresolvedCounts, viewMode, statusFilter]);

  const sortedApartments = useMemo(
    () => sortApartments(filteredApartments, sortBy),
    [filteredApartments, sortBy],
  );

  function handleStatusChange(apartment: Apartment, newStatus: ApartmentStatus) {
    if (newStatus === apartment.status) return;
    setModalState({ mode: "status", apartment, newStatus });
  }

  return (
    <main className="apartments-page page">
      <h1>Apartments</h1>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        onlyUnresolved={onlyUnresolved}
        onOnlyUnresolvedChange={setOnlyUnresolved}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        showStatusAndSort={viewMode === "list"}
      />

      <div className="view-toggle-row">
        <div className="apartments-view-toggle" role="tablist" aria-label="View mode">
          <button
            type="button"
            className={viewMode === "list" ? "view-toggle-btn active" : "view-toggle-btn"}
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
          <button
            type="button"
            className={viewMode === "kanban" ? "view-toggle-btn active" : "view-toggle-btn"}
            aria-pressed={viewMode === "kanban"}
            onClick={() => setViewMode("kanban")}
          >
            Kanban
          </button>
        </div>

        {viewMode === "kanban" && (
          <ColumnVisibilityMenu
            statuses={APARTMENT_STATUSES}
            labels={APARTMENT_STATUS_LABELS}
            hidden={settings.hiddenKanbanColumns}
            onChange={(hiddenKanbanColumns) => updateSettings({ hiddenKanbanColumns })}
          />
        )}
      </div>

      {viewMode === "list" ? (
        <ApartmentListView
          apartments={sortedApartments}
          unresolvedCounts={unresolvedCounts}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <KanbanBoard apartments={filteredApartments} onStatusChange={handleStatusChange} />
      )}

      <button
        type="button"
        className="fab"
        aria-label="Add apartment"
        onClick={() => setModalState({ mode: "add" })}
      >
        +
      </button>

      {modalState?.mode === "add" && (
        <ApartmentModal onClose={() => setModalState(null)} />
      )}

      {modalState?.mode === "status" && (
        <StatusChangeModal
          apartment={modalState.apartment}
          newStatus={modalState.newStatus}
          onClose={() => setModalState(null)}
        />
      )}
    </main>
  );
}

export default Apartments;
