import { useState } from "react";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { Apartment, ApartmentStatus } from "../types";
import ApartmentCard from "./ApartmentCard";

interface KanbanBoardProps {
  apartments: Apartment[];
  onStatusChange: (apartment: Apartment, newStatus: ApartmentStatus) => void;
}

function KanbanBoard({ apartments, onStatusChange }: KanbanBoardProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApartmentStatus>("AwaitingVisitation");

  const byStatus = (status: ApartmentStatus) => apartments.filter((a) => a.status === status);

  return (
    <div>
      <div className="kanban-tabs">
        {APARTMENT_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={status === selectedStatus ? "kanban-tab active" : "kanban-tab"}
            onClick={() => setSelectedStatus(status)}
          >
            {APARTMENT_STATUS_LABELS[status]} ({byStatus(status).length})
          </button>
        ))}
      </div>

      <div className="kanban-board">
        {APARTMENT_STATUSES.map((status) => {
          const columnApartments = byStatus(status);
          return (
            <div
              key={status}
              className="kanban-column"
              data-status={status}
              data-active={status === selectedStatus}
            >
              <h2>
                {APARTMENT_STATUS_LABELS[status]}{" "}
                <span className="column-count">{columnApartments.length}</span>
              </h2>
              <div className="kanban-column-cards">
                {columnApartments.map((apartment) => (
                  <ApartmentCard
                    key={apartment.id}
                    apartment={apartment}
                    onStatusChange={onStatusChange}
                  />
                ))}
                {columnApartments.length === 0 && (
                  <p className="empty-column">No apartments</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KanbanBoard;
