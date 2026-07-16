import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ApartmentModal from "./ApartmentModal";
import TaskModal from "./TaskModal";
import TextNoteModal from "./TextNoteModal";
import NoteSketchPad from "./NoteSketchPad";
import { createDashboardNote } from "../data/dashboardNotes";

type ModalKind = "apartment" | "task" | "note-text" | "note-sketch" | null;

function DashboardFab() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      {menuOpen && <div className="fab-menu-backdrop" onClick={closeMenu} />}

      {menuOpen && (
        <div className="fab-menu">
          <Link to="/documents" className="fab-menu-option" onClick={closeMenu}>
            Document
          </Link>
          <button
            type="button"
            className="fab-menu-option"
            onClick={() => {
              setModal("task");
              closeMenu();
            }}
          >
            Task
          </button>
          <button
            type="button"
            className="fab-menu-option"
            onClick={() => {
              setModal("apartment");
              closeMenu();
            }}
          >
            Apartment
          </button>
          <button
            type="button"
            className="fab-menu-option"
            onClick={() => {
              setModal("note-text");
              closeMenu();
            }}
          >
            Text Note
          </button>
          <button
            type="button"
            className="fab-menu-option"
            onClick={() => {
              setModal("note-sketch");
              closeMenu();
            }}
          >
            Sketch Note
          </button>
        </div>
      )}

      <button
        type="button"
        className="fab"
        aria-label={menuOpen ? "Close create menu" : "Create"}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "×" : "+"}
      </button>

      {modal === "apartment" && (
        <ApartmentModal
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            if ("id" in saved) navigate(`/apartments/${saved.id}`);
          }}
        />
      )}
      {modal === "task" && (
        <TaskModal
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            if ("id" in saved) navigate(`/tasks/${saved.id}`);
          }}
        />
      )}
      {modal === "note-text" && (
        <TextNoteModal
          onClose={() => setModal(null)}
          onSubmit={async (text) => {
            await createDashboardNote({ kind: "text", text, blob: null });
          }}
        />
      )}
      {modal === "note-sketch" && (
        <NoteSketchPad
          onClose={() => setModal(null)}
          onSubmit={async (blob) => {
            await createDashboardNote({ kind: "sketch", text: null, blob });
          }}
        />
      )}
    </>
  );
}

export default DashboardFab;
