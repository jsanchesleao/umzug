import { useRef } from "react";
import NoteCard from "./NoteCard";
import type { FloatingNoteBase } from "../types";

const DRAG_THRESHOLD = 4;

interface FloatingNotesOverlayProps {
  notes: FloatingNoteBase[];
  onUpdateText: (id: string, text: string) => Promise<void>;
  onUpdateSketch: (id: string, blob: Blob) => Promise<void>;
  onMove: (id: string, x: number, y: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface DragState {
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
}

function FloatingNotesOverlay({ notes, onUpdateText, onUpdateSketch, onMove, onDelete }: FloatingNotesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // Survives past pointerup into the synthetic click that follows it, so a
  // completed drag doesn't also reopen the note's edit modal.
  const justDraggedRef = useRef(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, note: FloatingNoteBase) {
    if (dragRef.current) return;
    // Deliberately do NOT capture the pointer here. Capturing on every
    // pointerdown (even ones that turn out to be plain clicks) makes Chromium
    // retarget the subsequent native `click` event to this wrapper instead of
    // the actual clicked descendant, which breaks NoteCard's own click-to-edit
    // handler. Capture is acquired lazily in handlePointerMove, only once a
    // real drag is confirmed.
    dragRef.current = {
      id: note.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: note.x,
      startY: note.y,
      dragging: false,
      lastX: note.x,
      lastY: note.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    if (!drag.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!drag.dragging) e.currentTarget.setPointerCapture(e.pointerId);
    drag.dragging = true;

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const cardRect = e.currentTarget.getBoundingClientRect();

    const minX = -containerRect.left;
    const maxX = document.documentElement.clientWidth - containerRect.left - cardRect.width;
    const nextX = Math.min(Math.max(minX, drag.startX + dx), maxX);
    const nextY = Math.max(0, drag.startY + dy);
    drag.lastX = nextX;
    drag.lastY = nextY;
    e.currentTarget.style.left = `${nextX}px`;
    e.currentTarget.style.top = `${nextY}px`;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    if (drag.dragging) {
      justDraggedRef.current = true;
      void onMove(drag.id, drag.lastX, drag.lastY);
    }
  }

  return (
    <div className="floating-notes-overlay" ref={containerRef}>
      {notes.map((note) => (
        <div
          key={note.id}
          className="floating-note-wrapper"
          style={{ left: note.x, top: note.y }}
          onPointerDown={(e) => handlePointerDown(e, note)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={(e) => {
            if (justDraggedRef.current) {
              e.preventDefault();
              e.stopPropagation();
              justDraggedRef.current = false;
            }
          }}
        >
          <NoteCard
            note={note}
            onSubmitText={(text) => onUpdateText(note.id, text)}
            onSubmitSketch={(blob) => onUpdateSketch(note.id, blob)}
            onDelete={() => onDelete(note.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default FloatingNotesOverlay;
