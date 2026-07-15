import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { createDashboardNote, deleteDashboardNote, updateDashboardNote } from "../data/dashboardNotes";
import { useSettings } from "../settings/useSettings";
import type { DashboardNote } from "../types";

interface NoteSketchPadProps {
  note?: DashboardNote;
  onClose: () => void;
}

type Tool = "pen" | "eraser";

const UNDO_LIMIT = 20;
const MIN_STROKE_WIDTH = 1.5;
const MAX_STROKE_WIDTH = 4;
const ERASER_RADIUS = 14;
// A note doodle is small and fixed-display, so unlike the apartment sketch editor there's no
// pan/zoom view layered on top — the canvas is simply scaled to fit its container via CSS,
// and the buffer/display scale ratio is recomputed per pointer event instead of cached.
const NOTE_CANVAS_SIZE = 800;

function strokeWidthFromPressure(pressure: number, scale: number, pointerType: string): number {
  const p = pressure > 0 ? pressure : 0.5;
  const base = MIN_STROKE_WIDTH + (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH) * p;
  const width = pointerType === "pen" ? base / 2 : base;
  return width * scale;
}

function NoteSketchPad({ note, onClose }: NoteSketchPadProps) {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);

  const [loaded, setLoaded] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [eraserPreview, setEraserPreview] = useState<{ x: number; y: number; diameter: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = NOTE_CANVAS_SIZE;
      canvas.height = NOTE_CANVAS_SIZE;

      if (note?.blob) {
        const bitmap = await createImageBitmap(note.blob);
        if (cancelled) return;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, NOTE_CANVAS_SIZE, NOTE_CANVAS_SIZE);
        bitmap.close();
      }
      if (cancelled) return;
      setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isIgnoredPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    return settings.sketchIgnoreTouch && e.pointerType === "touch";
  }

  function toCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function liveScale() {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return canvas.width / rect.width;
  }

  function updateEraserPreview(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    setEraserPreview({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      diameter: (ERASER_RADIUS * 2) / scale,
    });
  }

  function drawSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    pressure: number,
    pointerType: string,
  ) {
    const scale = liveScale();
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = tool === "eraser" ? ERASER_RADIUS * 2 * scale : strokeWidthFromPressure(pressure, scale, pointerType);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (isIgnoredPointer(e)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext("2d")!;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextStack = [...undoStackRef.current, snapshot];
    if (nextStack.length > UNDO_LIMIT) nextStack.shift();
    undoStackRef.current = nextStack;
    setCanUndo(true);

    const { x, y } = toCanvasCoords(e);
    drawingRef.current = { x, y };
    drawSegment(ctx, { x, y }, { x, y }, e.pressure, e.pointerType);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (isIgnoredPointer(e)) return;
    if (tool === "eraser") updateEraserPreview(e);
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = toCanvasCoords(e);
    drawSegment(ctx, drawingRef.current, { x, y }, e.pressure, e.pointerType);
    drawingRef.current = { x, y };
  }

  function handlePointerEnter(e: React.PointerEvent<HTMLCanvasElement>) {
    if (isIgnoredPointer(e)) return;
    if (tool === "eraser") updateEraserPreview(e);
  }

  function handlePointerLeave() {
    setEraserPreview(null);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const wasDrawing = drawingRef.current !== null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    drawingRef.current = null;
    if (!wasDrawing) return;
    setDirty(true);
  }

  function handleUndo() {
    const canvas = canvasRef.current;
    const stack = undoStackRef.current;
    if (!canvas || stack.length === 0) return;
    const snapshot = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);

    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.putImageData(snapshot, 0, 0);
    setDirty(true);
  }

  async function handleSaveAndClose() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to encode sketch note");
      if (note) {
        await updateDashboardNote(note.id, { blob });
      } else {
        await createDashboardNote({ kind: "sketch", text: null, blob });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    await deleteDashboardNote(note.id);
    onClose();
  }

  function handleGatedClose() {
    if (dirty) {
      setConfirmingDiscard(true);
    } else {
      onClose();
    }
  }

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete note?"
        message="This note will be permanently deleted."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  if (confirmingDiscard) {
    return (
      <ConfirmDialog
        title="Discard unsaved changes?"
        message="This sketch has unsaved changes. Close without saving?"
        confirmLabel="Discard"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmingDiscard(false)}
      />
    );
  }

  return (
    <Modal title="Sketch Note" onClose={handleGatedClose} variant="fullscreen">
      <div className="sketch-toolbar">
        <div className="sketch-toolbar-group">
          <button
            type="button"
            className={tool === "pen" ? "btn btn-sm btn-primary" : "btn btn-sm"}
            onClick={() => setTool("pen")}
          >
            Pen
          </button>
          <button
            type="button"
            className={tool === "eraser" ? "btn btn-sm btn-primary" : "btn btn-sm"}
            onClick={() => setTool("eraser")}
          >
            Eraser
          </button>
          <button type="button" className="btn btn-sm" onClick={handleUndo} disabled={!canUndo}>
            Undo
          </button>
        </div>
        {note && (
          <div className="sketch-toolbar-group">
            <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="note-sketch-canvas-wrap">
        <canvas
          ref={canvasRef}
          className={`sketch-canvas sketch-ink${tool === "eraser" ? " sketch-canvas-eraser" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        />
        {tool === "eraser" && eraserPreview && (
          <div
            className="sketch-eraser-preview"
            style={{
              left: eraserPreview.x,
              top: eraserPreview.y,
              width: eraserPreview.diameter,
              height: eraserPreview.diameter,
            }}
          />
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Close without saving
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveAndClose}
          disabled={saving || !loaded}
        >
          {saving ? "Saving…" : "Save and close"}
        </button>
      </div>
    </Modal>
  );
}

export default NoteSketchPad;
