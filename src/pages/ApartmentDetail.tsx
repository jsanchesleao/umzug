import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { deleteApartmentCascade, getApartment, updateApartment } from "../data/apartments";
import { listActionsForApartment } from "../data/actions";
import { buildApartmentExport, downloadJson } from "../data/importExport";
import ApartmentModal from "../components/ApartmentModal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import UnresolvedActionsSummary from "../components/UnresolvedActionsSummary";
import ActionList from "../components/ActionList";
import TimelineSection from "../components/TimelineSection";

function ApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apartment = useLiveQuery(() => (id ? getApartment(id) : undefined), [id]);
  const directActions = useLiveQuery(async () => {
    if (!id) return [];
    const all = await listActionsForApartment(id);
    return all.filter((action) => action.eventId === null);
  }, [id]);

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    const exported = await buildApartmentExport(apartment!.id);
    const slug = apartment!.address.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "apartment";
    downloadJson(`umzug-${slug}.json`, exported);
  }

  return (
    <main className="case-file">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      <header className="case-file-header">
        <h1>{apartment.address}</h1>
        <StatusBadge status={apartment.status} />

        <div className="case-file-meta">
          <div>Rent: {apartment.rentCost}</div>
          <div>
            <a href={apartment.originalLink} target="_blank" rel="noopener noreferrer">
              Original listing
            </a>
          </div>
          <div>Entry date: {apartment.entryDate}</div>
        </div>

        {apartment.status === "VisitScheduled" && apartment.visitDate && (
          <div className="case-file-visit">
            <div>Visit date: {new Date(apartment.visitDate).toLocaleString()}</div>
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
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        </div>
      </header>

      <UnresolvedActionsSummary apartmentId={apartment.id} />

      <section className="case-file-actions-section">
        <h2>Actions</h2>
        <ActionList
          apartmentId={apartment.id}
          eventId={null}
          actions={directActions ?? []}
          emptyLabel="No actions on this apartment yet."
        />
      </section>

      <TimelineSection apartmentId={apartment.id} />

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

      {editing && <ApartmentModal apartment={apartment} onClose={() => setEditing(false)} />}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete apartment"
          message={`Delete ${apartment.address}? This will also delete its timeline events, actions, and photos. This cannot be undone.`}
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
