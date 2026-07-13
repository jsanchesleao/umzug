import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { deleteApartmentCascade, getApartment, updateApartment } from "../data/apartments";
import { listActionsForApartment } from "../data/actions";
import { buildApartmentExport, downloadJson } from "../data/importExport";
import ApartmentModal from "../components/ApartmentModal";
import P2PSendModal from "../components/P2PSendModal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import UnresolvedActionsSummary from "../components/UnresolvedActionsSummary";
import ActionList from "../components/ActionList";
import TimelineSection from "../components/TimelineSection";
import PhotoSection from "../components/PhotoSection";
import { formatRent } from "../utils/rent";
import { formatDate, formatDateTime } from "../utils/date";
import { useSettings } from "../settings/useSettings";

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

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [includePhotosInExport, setIncludePhotosInExport] = useState(true);
  const [sendingP2P, setSendingP2P] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [syncedApartmentId, setSyncedApartmentId] = useState<string | null>(null);

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

  async function handleExport() {
    const exported = await buildApartmentExport(apartment!.id, includePhotosInExport);
    const slug = apartment!.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "apartment";
    downloadJson(`umzug-${slug}.json`, exported);
  }

  return (
    <main className="case-file">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      <div className="case-file-grid">
        <div className="case-file-col-left">
          <header className="case-file-header">
            <h1>{apartment.title}</h1>
            <StatusBadge status={apartment.status} />

            <div className="case-file-meta">
              {apartment.address && <div>Address: {apartment.address}</div>}
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
                <div>Visit address: {apartment.visitAddress}</div>
              </div>
            )}

            <div className="case-file-actions">
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="btn" onClick={handleExport}>
                Export this file
              </button>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={includePhotosInExport}
                  onChange={(e) => setIncludePhotosInExport(e.target.checked)}
                />
                Include photos
              </label>
              <button type="button" className="btn" onClick={() => setSendingP2P(true)}>
                Send this apartment
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
            </div>

            <UnresolvedActionsSummary apartmentId={apartment.id} />
          </header>

          <section className="case-file-notes">
            <h2>Notes</h2>
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
          </section>

          <TimelineSection apartmentId={apartment.id} />
        </div>

        <div className="case-file-col-right">
          <PhotoSection apartmentId={apartment.id} />

          <section className="case-file-actions-section">
            <h2>Actions</h2>
            <ActionList
              apartmentId={apartment.id}
              eventId={null}
              actions={directActions ?? []}
              emptyLabel="No actions on this apartment yet."
            />
          </section>
        </div>
      </div>

      {editing && <ApartmentModal apartment={apartment} onClose={() => setEditing(false)} />}

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
          message={`Delete ${apartment.title}? This will also delete its timeline events, actions, and photos. This cannot be undone.`}
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
