import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { listSketchPagesForApartment, saveSketchSession, type SketchPageCommit } from "../data/sketchPages";

interface SketchEditorModalProps {
  apartmentId: string;
  /** Existing page to open the editor on, or null to start on a fresh blank page. */
  initialPageId: string | null;
  onClose: () => void;
}

interface EditorPage {
  key: string;
  dbId: string | null;
  content: HTMLCanvasElement;
  undoStack: ImageData[];
  dirty: boolean;
}

type Tool = "pen" | "eraser";

const UNDO_LIMIT = 20;
const MIN_STROKE_WIDTH = 1.5;
const MAX_STROKE_WIDTH = 8;

function makeBlankPage(width: number, height: number): EditorPage {
  const content = document.createElement("canvas");
  content.width = width;
  content.height = height;
  return { key: crypto.randomUUID(), dbId: null, content, undoStack: [], dirty: false };
}

function strokeWidthFromPressure(pressure: number, scale: number): number {
  const p = pressure > 0 ? pressure : 0.5;
  return (MIN_STROKE_WIDTH + (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH) * p) * scale;
}

function SketchEditorModal({ apartmentId, initialPageId, onClose }: SketchEditorModalProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<{ x: number; y: number } | null>(null);
  const bufferSizeRef = useRef<{ width: number; height: number } | null>(null);

  const [pages, setPages] = useState<EditorPage[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [saving, setSaving] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Load existing pages once on mount, sizing every offscreen page canvas
  // (and the live editing canvas) to the wrapper's on-screen size at open
  // time — a fixed buffer captured once, not re-measured on resize, so the
  // undo/stroke model doesn't have to account for a canvas that changes size
  // mid-session (see plan: "fixed internal buffer, no live rescaling").
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      bufferSizeRef.current = { width, height };
      canvas.width = width;
      canvas.height = height;

      const existing = await listSketchPagesForApartment(apartmentId);
      if (cancelled) return;

      const loaded: EditorPage[] = await Promise.all(
        existing.map(async (record) => {
          const bitmap = await createImageBitmap(record.blob);
          const content = document.createElement("canvas");
          content.width = width;
          content.height = height;
          content.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          return { key: record.id, dbId: record.id, content, undoStack: [], dirty: false };
        }),
      );
      if (cancelled) return;

      let startIndex: number;
      if (loaded.length === 0) {
        loaded.push(makeBlankPage(width, height));
        startIndex = 0;
      } else if (initialPageId === null) {
        loaded.push(makeBlankPage(width, height));
        startIndex = loaded.length - 1;
      } else {
        const found = loaded.findIndex((p) => p.dbId === initialPageId);
        startIndex = found === -1 ? 0 : found;
      }

      setPages(loaded);
      setCurrentIndex(startIndex);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartmentId]);

  // Mirror the current page's committed content onto the live canvas
  // whenever the current page changes (including right after load).
  useEffect(() => {
    const canvas = canvasRef.current;
    const page = pages?.[currentIndex];
    if (!canvas || !page) return;
    const ctx = canvas.getContext("2d")!;
    // globalCompositeOperation persists on the context between draw calls; if
    // the last stroke was an eraser stroke it's left as "destination-out",
    // which would make this drawImage composite against the just-cleared
    // (fully transparent) canvas and produce nothing. Reset explicitly.
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(page.content, 0, 0);
  }, [pages, currentIndex]);

  function toCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, scale: (scaleX + scaleY) / 2 };
  }

  function drawSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    pressure: number,
    scale: number,
  ) {
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = strokeWidthFromPressure(pressure, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const page = pages?.[currentIndex];
    const canvas = canvasRef.current;
    if (!page || !canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext("2d")!;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextStack = [...page.undoStack, snapshot];
    if (nextStack.length > UNDO_LIMIT) nextStack.shift();
    setPages((prev) =>
      prev ? prev.map((p, i) => (i === currentIndex ? { ...p, undoStack: nextStack } : p)) : prev,
    );

    const { x, y, scale } = toCanvasCoords(e);
    drawingRef.current = { x, y };
    drawSegment(ctx, { x, y }, { x, y }, e.pressure, scale);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y, scale } = toCanvasCoords(e);
    drawSegment(ctx, drawingRef.current, { x, y }, e.pressure, scale);
    drawingRef.current = { x, y };
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    drawingRef.current = null;

    const page = pages?.[currentIndex];
    if (!page || !canvas) return;
    const ctx = page.content.getContext("2d")!;
    ctx.clearRect(0, 0, page.content.width, page.content.height);
    ctx.drawImage(canvas, 0, 0);
    setPages((prev) =>
      prev ? prev.map((p, i) => (i === currentIndex ? { ...p, dirty: true } : p)) : prev,
    );
  }

  function handleUndo() {
    const page = pages?.[currentIndex];
    const canvas = canvasRef.current;
    if (!page || !canvas || page.undoStack.length === 0) return;
    const snapshot = page.undoStack[page.undoStack.length - 1];
    const nextStack = page.undoStack.slice(0, -1);

    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(snapshot, 0, 0);
    const contentCtx = page.content.getContext("2d")!;
    contentCtx.clearRect(0, 0, page.content.width, page.content.height);
    contentCtx.drawImage(canvas, 0, 0);

    setPages((prev) =>
      prev
        ? prev.map((p, i) => (i === currentIndex ? { ...p, undoStack: nextStack, dirty: true } : p))
        : prev,
    );
  }

  function handleAddPage() {
    const size = bufferSizeRef.current;
    if (!pages || !size) return;
    const next = [...pages, makeBlankPage(size.width, size.height)];
    setPages(next);
    setCurrentIndex(next.length - 1);
  }

  function handleRemovePage() {
    if (!pages) return;
    const page = pages[currentIndex];
    const remaining = pages.filter((_, i) => i !== currentIndex);
    if (page.dbId) setDeletedIds((prev) => [...prev, page.dbId!]);

    if (remaining.length === 0) {
      const size = bufferSizeRef.current!;
      setPages([makeBlankPage(size.width, size.height)]);
      setCurrentIndex(0);
    } else {
      setPages(remaining);
      setCurrentIndex((i) => Math.min(i, remaining.length - 1));
    }
  }

  async function handleSaveAndClose() {
    if (!pages) return;
    setSaving(true);
    try {
      const commits: SketchPageCommit[] = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.dbId === null && !page.dirty) continue;
        const blob = await new Promise<Blob | null>((resolve) => page.content.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Failed to encode sketch page");
        commits.push({ id: page.dbId, order: i, blob });
      }
      await saveSketchSession(apartmentId, commits, deletedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const hasUnsavedChanges = (pages?.some((p) => p.dirty) ?? false) || deletedIds.length > 0;

  function handleGatedClose() {
    if (hasUnsavedChanges) {
      setConfirmingDiscard(true);
    } else {
      onClose();
    }
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

  const currentPage = pages?.[currentIndex] ?? null;

  return (
    <Modal title="Sketches" onClose={handleGatedClose} variant="fullscreen">
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
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleUndo}
            disabled={!currentPage || currentPage.undoStack.length === 0}
          >
            Undo
          </button>
        </div>

        <div className="sketch-toolbar-group">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={!pages || currentIndex === 0}
          >
            ‹ Prev
          </button>
          <span className="sketch-page-indicator">
            {pages ? `Page ${currentIndex + 1} of ${pages.length}` : "Loading…"}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setCurrentIndex((i) => Math.min((pages?.length ?? 1) - 1, i + 1))}
            disabled={!pages || currentIndex >= pages.length - 1}
          >
            Next ›
          </button>
          <button type="button" className="btn btn-sm" onClick={handleAddPage} disabled={!pages}>
            + Page
          </button>
          <button type="button" className="btn btn-sm" onClick={handleRemovePage} disabled={!pages}>
            Remove page
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="sketch-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="sketch-canvas sketch-ink"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Close without saving
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSaveAndClose} disabled={saving || !pages}>
          {saving ? "Saving…" : "Save and close"}
        </button>
      </div>
    </Modal>
  );
}

export default SketchEditorModal;
