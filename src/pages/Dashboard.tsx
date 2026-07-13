import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import KanbanBoard from "../components/KanbanBoard";
import ApartmentModal from "../components/ApartmentModal";
import UnresolvedActionsPanel from "../components/UnresolvedActionsPanel";
import FilterBar from "../components/FilterBar";
import ImportExportBar from "../components/ImportExportBar";
import { listApartments, updateApartment } from "../data/apartments";
import { getUnresolvedActions } from "../data/actions";
import type { Apartment, ApartmentStatus } from "../types";

type ModalState = { mode: "add" } | { mode: "edit"; apartment: Apartment } | null;

function Dashboard() {
  const apartments = useLiveQuery(() => listApartments(), []);
  const unresolvedActions = useLiveQuery(() => getUnresolvedActions(), []);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [search, setSearch] = useState("");
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);

  const unresolvedApartmentIds = useMemo(
    () => new Set((unresolvedActions ?? []).map((action) => action.apartmentId)),
    [unresolvedActions],
  );

  const filteredApartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (apartments ?? []).filter((apartment) => {
      if (onlyUnresolved && !unresolvedApartmentIds.has(apartment.id)) return false;
      if (query) {
        const matches =
          apartment.title.toLowerCase().includes(query) ||
          apartment.address.toLowerCase().includes(query) ||
          apartment.notes.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [apartments, search, onlyUnresolved, unresolvedApartmentIds]);

  async function handleStatusChange(apartment: Apartment, newStatus: ApartmentStatus) {
    if (newStatus === apartment.status) return;

    if (newStatus === "VisitScheduled") {
      // Visit date/address are required for this status — prompt via the edit modal
      // instead of silently switching with empty visit fields.
      setModalState({ mode: "edit", apartment: { ...apartment, status: "VisitScheduled" } });
      return;
    }

    const wasVisitScheduled = apartment.status === "VisitScheduled";
    await updateApartment(apartment.id, {
      status: newStatus,
      ...(wasVisitScheduled ? { visitDate: null, visitAddress: null } : {}),
    });
  }

  return (
    <main className="dashboard">
      <h1>Dashboard</h1>

      <ImportExportBar />

      <UnresolvedActionsPanel actions={unresolvedActions ?? []} apartments={apartments ?? []} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        onlyUnresolved={onlyUnresolved}
        onOnlyUnresolvedChange={setOnlyUnresolved}
      />

      <KanbanBoard apartments={filteredApartments} onStatusChange={handleStatusChange} />

      <button
        type="button"
        className="fab"
        aria-label="Add apartment"
        onClick={() => setModalState({ mode: "add" })}
      >
        +
      </button>

      {modalState && (
        <ApartmentModal
          apartment={modalState.mode === "edit" ? modalState.apartment : undefined}
          onClose={() => setModalState(null)}
        />
      )}
    </main>
  );
}

export default Dashboard;
