import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import KanbanBoard from "../components/KanbanBoard";
import ApartmentModal from "../components/ApartmentModal";
import { listApartments, updateApartment } from "../data/apartments";
import type { Apartment, ApartmentStatus } from "../types";

type ModalState = { mode: "add" } | { mode: "edit"; apartment: Apartment } | null;

function Dashboard() {
  const apartments = useLiveQuery(() => listApartments(), []);
  const [modalState, setModalState] = useState<ModalState>(null);

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

      <KanbanBoard apartments={apartments ?? []} onStatusChange={handleStatusChange} />

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
