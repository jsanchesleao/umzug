import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { deleteApartmentCascade, getApartment, updateApartment } from "../data/apartments";
import { listActionsForApartment } from "../data/actions";
import {
  createApartmentFloatingNote,
  deleteApartmentFloatingNote,
  listApartmentFloatingNotes,
  updateApartmentFloatingNote,
} from "../data/apartmentFloatingNotes";
import { buildApartmentExport, downloadJson } from "../data/importExport";
import ApartmentModal from "../components/ApartmentModal";
import P2PSendModal from "../components/P2PSendModal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import StatusMenu from "../components/StatusMenu";
import StatusChangeModal from "../components/StatusChangeModal";
import UnresolvedActionsSummary from "../components/UnresolvedActionsSummary";
import ActionList from "../components/ActionList";
import TimelineSection from "../components/TimelineSection";
import PhotoSection from "../components/PhotoSection";
import SketchSection from "../components/SketchSection";
import CollapsibleSection from "../components/CollapsibleSection";
import FloatingNotesSection from "../components/FloatingNotesSection";
import FloatingNotesOverlay from "../components/FloatingNotesOverlay";
import { formatRent } from "../utils/rent";
import { formatDate, formatDateTime } from "../utils/date";
import { buildGoogleMapsUrl } from "../utils/maps";
import { useSettings } from "../settings/useSettings";
import { APARTMENT_STATUSES, APARTMENT_STATUS_LABELS } from "../types";
import type { ApartmentStatus } from "../types";

function ApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const apartment = useLiveQuery(() => (id ? getApartment(id) : undefined), [id]);
  const directActions = useLiveQuery(async () => {
    if (!id) return [];
    const all = await listActionsForApartment(id);
    return all.filter((action) => action.eventId === null);
  }, [id]);
  const floatingNotes = useLiveQuery(() => (id ? listApartmentFloatingNotes(id) : []), [id]) ?? [];

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [includePhotosInExport, setIncludePhotosInExport] = useState(true);
  const [sendingP2P, setSendingP2P] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [syncedApartmentId, setSyncedApartmentId] = useState<string | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<ApartmentStatus | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  // Reset the notes draft whenever a (new) apartment record loads, unless the
  // user already has unsaved edits in progress. Adjusting state during render
  // (rather than in an effect) avoids an extra cascading render.
  if (apartment && apartment.id !== syncedApartmentId) {
    setSyncedApartmentId(apartment.id);
    setNotes(apartment.notes);
    setNotesDirty(false);
  }

  if (!apartment) {
    return (
      <main className="case-file">
        <p>Apartment not found.</p>
        <Link to="/">← Back to dashboard</Link>
      </main>
    );
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateApartment(apartment!.id, { notes });
      setNotesDirty(false);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    await deleteApartmentCascade(apartment!.id);
    navigate("/");
  }

  async function handleCreateFloatingNote(input: {
    kind: "text" | "sketch";
    text: string | null;
    blob: Blob | null;
    x: number;
    y: number;
  }) {
    await createApartmentFloatingNote({ apartmentId: apartment!.id, ...input });
  }
  async function handleUpdateFloatingNoteText(noteId: string, text: string) {
    await updateApartmentFloatingNote(noteId, { text });
  }
  async function handleUpdateFloatingNoteSketch(noteId: string, blob: Blob) {
    await updateApartmentFloatingNote(noteId, { blob });
  }
  async function handleMoveFloatingNote(noteId: string, x: number, y: number) {
    await updateApartmentFloatingNote(noteId, { x, y });
  }
  async function handleDeleteFloatingNote(noteId: string) {
    await deleteApartmentFloatingNote(noteId);
  }

  async function handleExport() {
    const exported = await buildApartmentExport(apartment!.id, includePhotosInExport);
    const slug = apartment!.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "apartment";
    downloadJson(`umzug-${slug}.json`, exported);
  }

  return (
    <main className="case-file">
      <Link to="/apartments" className="back-link">
        ← Back to apartments
      </Link>

      <div className="case-file-grid">
        <div className="case-file-col-left">
          <header className="case-file-header">
            <div className="case-file-title-row">
              <div className="case-file-title-group">
                <h1 className="case-file-title-group-heading">{apartment.title}</h1>
                <StatusBadge status={apartment.status} label={APARTMENT_STATUS_LABELS[apartment.status]} />
                <StatusMenu
                  currentStatus={apartment.status}
                  statuses={APARTMENT_STATUSES}
                  labels={APARTMENT_STATUS_LABELS}
                  onSelect={setStatusChangeTarget}
                />
              </div>

              <details className="status-menu" ref={menuRef}>
                <summary className="status-menu-trigger" aria-label="Apartment actions">
                  ⋮
                </summary>
                <div className="status-menu-list case-file-menu-list">
                  <button
                    type="button"
                    className="status-menu-option"
                    onClick={() => {
                      setEditing(true);
                      closeMenu();
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="status-menu-option"
                    onClick={() => {
                      handleExport();
                      closeMenu();
                    }}
                  >
                    Export this file
                  </button>
                  <label className="case-file-menu-checkbox">
                    <input
                      type="checkbox"
                      checked={includePhotosInExport}
                      onChange={(e) => setIncludePhotosInExport(e.target.checked)}
                    />
                    Include photos & sketches
                  </label>
                  <button
                    type="button"
                    className="status-menu-option"
                    onClick={() => {
                      setSendingP2P(true);
                      closeMenu();
                    }}
                  >
                    Send this apartment
                  </button>
                  <button
                    type="button"
                    className="status-menu-option danger"
                    onClick={() => {
                      setConfirmingDelete(true);
                      closeMenu();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </details>
            </div>

            <div className="case-file-meta">
              {apartment.address && (
                <div>
                  Address: {apartment.address}{" "}
                  <a href={buildGoogleMapsUrl(apartment.address)} target="_blank" rel="noopener noreferrer">
                    🗺️
                  </a>
                </div>
              )}
              <div>Cold rent: {formatRent(apartment.coldRent, settings.currency)}</div>
              <div>Warm rent: {formatRent(apartment.warmRent, settings.currency)}</div>
              {apartment.originalLink && (
                <div>
                  <a href={apartment.originalLink} target="_blank" rel="noopener noreferrer">
                    Original listing
                  </a>
                </div>
              )}
              <div>Entry date: {formatDate(apartment.entryDate, settings.dateFormat)}</div>
            </div>

            {apartment.status === "VisitScheduled" && apartment.visitDate && (
              <div className="case-file-visit">
                <div>Visit date: {formatDateTime(apartment.visitDate, settings.dateFormat)}</div>
                {apartment.visitAddress && (
                  <div>
                    Visit address: {apartment.visitAddress}{" "}
                    <a href={buildGoogleMapsUrl(apartment.visitAddress)} target="_blank" rel="noopener noreferrer">
                      🗺️
                    </a>
                  </div>
                )}
              </div>
            )}

            <UnresolvedActionsSummary apartmentId={apartment.id} />
          </header>

          <CollapsibleSection
            className="case-file-notes"
            entityId={apartment.id}
            cardKey="notes"
            title="Notes"
          >
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveNotes}
              disabled={!notesDirty || savingNotes}
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          </CollapsibleSection>

          <TimelineSection apartmentId={apartment.id} />
        </div>

        <div className="case-file-col-right">
          <PhotoSection apartmentId={apartment.id} />
          <SketchSection apartmentId={apartment.id} />

          <CollapsibleSection
            className="case-file-actions-section"
            entityId={apartment.id}
            cardKey="actions"
            title="Actions"
          >
            <ActionList
              apartmentId={apartment.id}
              eventId={null}
              actions={directActions ?? []}
              emptyLabel="No actions on this apartment yet."
            />
          </CollapsibleSection>

          <FloatingNotesSection
            entityId={apartment.id}
            notes={floatingNotes}
            onCreate={handleCreateFloatingNote}
            onUpdateText={handleUpdateFloatingNoteText}
            onUpdateSketch={handleUpdateFloatingNoteSketch}
            onDelete={handleDeleteFloatingNote}
          />
        </div>
      </div>

      <FloatingNotesOverlay
        notes={floatingNotes}
        onUpdateText={handleUpdateFloatingNoteText}
        onUpdateSketch={handleUpdateFloatingNoteSketch}
        onMove={handleMoveFloatingNote}
        onDelete={handleDeleteFloatingNote}
      />

      {editing && <ApartmentModal apartment={apartment} onClose={() => setEditing(false)} />}

      {statusChangeTarget && (
        <StatusChangeModal
          apartment={apartment}
          newStatus={statusChangeTarget}
          onClose={() => setStatusChangeTarget(null)}
        />
      )}

      {sendingP2P && (
        <P2PSendModal
          scope="apartment"
          apartmentId={apartment.id}
          onClose={() => setSendingP2P(false)}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete apartment"
          message={`Delete ${apartment.title}? This will also delete its timeline events, actions, photos, sketches, and floating notes. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}

export default ApartmentDetail;
