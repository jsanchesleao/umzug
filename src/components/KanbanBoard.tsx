import { useState } from "react";
import type { DragEvent } from "react";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { Apartment, ApartmentStatus } from "../types";
import ApartmentCard from "./ApartmentCard";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";
import { useSettings } from "../settings/useSettings";

interface KanbanBoardProps {
  apartments: Apartment[];
  onStatusChange: (apartment: Apartment, newStatus: ApartmentStatus) => void;
}

function KanbanBoard({ apartments, onStatusChange }: KanbanBoardProps) {
  const { settings, updateSettings } = useSettings();
  const visibleStatuses = APARTMENT_STATUSES.filter(
    (status) => !settings.hiddenKanbanColumns.includes(status),
  );

  const [selectedStatus, setSelectedStatus] = useState<ApartmentStatus>(
    visibleStatuses[0] ?? "AwaitingVisitation",
  );
  const [dragOverStatus, setDragOverStatus] = useState<ApartmentStatus | null>(null);

  const activeStatus = visibleStatuses.includes(selectedStatus)
    ? selectedStatus
    : (visibleStatuses[0] ?? selectedStatus);

  const byStatus = (status: ApartmentStatus) => apartments.filter((a) => a.status === status);

  function handleDrop(event: DragEvent, status: ApartmentStatus) {
    event.preventDefault();
    setDragOverStatus(null);
    const apartmentId = event.dataTransfer.getData("text/plain");
    const apartment = apartments.find((a) => a.id === apartmentId);
    if (apartment) onStatusChange(apartment, status);
  }

  return (
    <div>
      <div className="kanban-toolbar">
        <ColumnVisibilityMenu
          hidden={settings.hiddenKanbanColumns}
          onChange={(hiddenKanbanColumns) => updateSettings({ hiddenKanbanColumns })}
        />
      </div>

      {visibleStatuses.length === 0 ? (
        <p className="empty-column">All columns are hidden. Use the columns menu above to show some.</p>
      ) : (
        <>
          <div className="kanban-tabs">
            {visibleStatuses.map((status) => (
              <button
                key={status}
                type="button"
                className={status === activeStatus ? "kanban-tab active" : "kanban-tab"}
                onClick={() => setSelectedStatus(status)}
              >
                {APARTMENT_STATUS_LABELS[status]} ({byStatus(status).length})
              </button>
            ))}
          </div>

          <div className="kanban-board">
            {visibleStatuses.map((status) => {
              const columnApartments = byStatus(status);
              return (
                <div
                  key={status}
                  className="kanban-column"
                  data-status={status}
                  data-active={status === activeStatus}
                  data-drag-over={dragOverStatus === status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStatus !== status) setDragOverStatus(status);
                  }}
                  onDragLeave={() => setDragOverStatus((current) => (current === status ? null : current))}
                  onDrop={(e) => handleDrop(e, status)}
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
        </>
      )}
    </div>
  );
}

export default KanbanBoard;
