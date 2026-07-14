import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { listSketchPagesForApartment, saveSketchSession, type SketchPageCommit } from "../data/sketchPages";
import { useSettings } from "../settings/useSettings";

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

type Tool = "pen" | "eraser" | "pan";

interface View {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface PinchBaseline {
  dist: number;
  scale: number;
  baseLeft: number;
  baseTop: number;
  anchorX: number;
  anchorY: number;
}

const UNDO_LIMIT = 20;
const MIN_STROKE_WIDTH = 1.5;
const MAX_STROKE_WIDTH = 4;
const ERASER_RADIUS = 14;
// Sketches are always edited/stored at this fixed square resolution, regardless of the
// device/window they're opened on. The editor viewport (see View/zoom below) is a pure
// display concern layered on top via CSS transform; the backing buffer never changes size,
// which is what keeps a saved sketch looking identical across sessions and screen sizes.
const SKETCH_CANVAS_SIZE = 1600;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const FIT_VIEW: View = { scale: 1, offsetX: 0, offsetY: 0 };

function makeBlankPage(size: number): EditorPage {
  const content = document.createElement("canvas");
  content.width = size;
  content.height = size;
  return { key: crypto.randomUUID(), dbId: null, content, undoStack: [], dirty: false };
}

function strokeWidthFromPressure(pressure: number, baseScale: number, pointerType: string): number {
  const p = pressure > 0 ? pressure : 0.5;
  const base = MIN_STROKE_WIDTH + (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH) * p;
  const width = pointerType === "pen" ? base / 2 : base;
  return width * baseScale;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Zooms `prev` to `targetScale` while keeping the content point under (clientX, clientY) fixed
// on screen. `rect` is the canvas's current (pre-update) bounding rect.
function zoomAroundPoint(
  rect: { left: number; top: number },
  clientX: number,
  clientY: number,
  targetScale: number,
  prev: View,
): View {
  const scale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
  const dx = clientX - rect.left;
  const dy = clientY - rect.top;
  const ratio = 1 - scale / prev.scale;
  return { scale, offsetX: prev.offsetX + dx * ratio, offsetY: prev.offsetY + dy * ratio };
}

// Keeps a resized container from leaving a zoomed/panned view in a degenerate state (canvas
// dragged fully out of sight). Not a "fit" — just guarantees a minimum overlap; the explicit
// Fit button is the user-facing way to snap back to the default view.
function clampViewToWrap(view: View, wrapRect: { width: number; height: number }, cssSize: number): View {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE);
  const scaledSize = cssSize * scale;
  const baseLeft = (wrapRect.width - cssSize) / 2;
  const baseTop = (wrapRect.height - cssSize) / 2;
  const minVisible = Math.min(scaledSize, wrapRect.width, wrapRect.height) * 0.25;
  const minOffsetX = minVisible - scaledSize - baseLeft;
  const maxOffsetX = wrapRect.width - minVisible - baseLeft;
  const minOffsetY = minVisible - scaledSize - baseTop;
  const maxOffsetY = wrapRect.height - minVisible - baseTop;
  return {
    scale,
    offsetX: clamp(view.offsetX, Math.min(minOffsetX, maxOffsetX), Math.max(minOffsetX, maxOffsetX)),
    offsetY: clamp(view.offsetY, Math.min(minOffsetY, maxOffsetY), Math.max(minOffsetY, maxOffsetY)),
  };
}

function SketchEditorModal({ apartmentId, initialPageId, onClose }: SketchEditorModalProps) {
  const { settings } = useSettings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<{ x: number; y: number } | null>(null);
  // Buffer-px-per-CSS-px at zoom = 1, recomputed on container resize. Used to keep stroke
  // width consistent in *document* space (so zooming in lets you draw finer detail), as
  // opposed to the live zoom-affected scale used for cursor position mapping.
  const baseScaleRef = useRef(1);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchBaselineRef = useRef<PinchBaseline | null>(null);

  const [pages, setPages] = useState<EditorPage[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [saving, setSaving] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [eraserPreview, setEraserPreview] = useState<{ x: number; y: number; diameter: number } | null>(null);
  const [view, setView] = useState<View>(FIT_VIEW);

  function isIgnoredPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    return settings.sketchIgnoreTouch && e.pointerType === "touch";
  }

  function updateEraserPreview(e: React.PointerEvent<HTMLCanvasElement>) {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const wrapRect = wrap.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const liveScale = canvas.width / canvasRect.width;
    setEraserPreview({
      x: e.clientX - wrapRect.left,
      y: e.clientY - wrapRect.top,
      diameter: (ERASER_RADIUS * 2) / liveScale,
    });
  }

  // Load existing pages once on mount. The backing buffer is always SKETCH_CANVAS_SIZE
  // square — no container measurement involved, so it never needs to change mid-session.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = SKETCH_CANVAS_SIZE;
      canvas.height = SKETCH_CANVAS_SIZE;

      const existing = await listSketchPagesForApartment(apartmentId);
      if (cancelled) return;

      const loaded: EditorPage[] = await Promise.all(
        existing.map(async (record) => {
          const bitmap = await createImageBitmap(record.blob);
          const content = document.createElement("canvas");
          content.width = SKETCH_CANVAS_SIZE;
          content.height = SKETCH_CANVAS_SIZE;
          content.getContext("2d")!.drawImage(bitmap, 0, 0, SKETCH_CANVAS_SIZE, SKETCH_CANVAS_SIZE);
          bitmap.close();
          return { key: record.id, dbId: record.id, content, undoStack: [], dirty: false };
        }),
      );
      if (cancelled) return;

      let startIndex: number;
      if (loaded.length === 0) {
        loaded.push(makeBlankPage(SKETCH_CANVAS_SIZE));
        startIndex = 0;
      } else if (initialPageId === null) {
        loaded.push(makeBlankPage(SKETCH_CANVAS_SIZE));
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

  // Track the container size purely for the *display* transform (baseScale for
  // zoom-invariant stroke width, and keeping the pan/zoom view non-degenerate on resize).
  // The backing buffer itself is never touched here.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    function sync() {
      const rect = wrap!.getBoundingClientRect();
      const cssSize = Math.min(rect.width, rect.height);
      if (cssSize <= 0) return;
      baseScaleRef.current = SKETCH_CANVAS_SIZE / cssSize;
      setView((v) => clampViewToWrap(v, rect, cssSize));
    }

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // Mouse wheel / trackpad always zooms, regardless of the active tool, since wheel events
  // never originate from pen/touch drawing input. Attached manually (not via JSX onWheel)
  // so preventDefault reliably suppresses page scroll/zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.001);
      setView((v) => zoomAroundPoint(rect, e.clientX, e.clientY, v.scale * factor, v));
    }

    // Defense-in-depth on iOS Safari, which can still fire these non-standard gesture
    // events for two-finger touch even with touch-action: none set.
    function preventGesture(e: Event) {
      e.preventDefault();
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("gesturestart", preventGesture);
    canvas.addEventListener("gesturechange", preventGesture);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("gesturestart", preventGesture);
      canvas.removeEventListener("gesturechange", preventGesture);
    };
  }, []);

  // Switching away from the Pan tool mid-gesture shouldn't leave stale pointer tracking.
  useEffect(() => {
    if (tool !== "pan") {
      activePointersRef.current.clear();
      pinchBaselineRef.current = null;
    }
  }, [tool]);

  function toCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function drawSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    pressure: number,
    pointerType: string,
  ) {
    const baseScale = baseScaleRef.current;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#000";
    ctx.lineWidth =
      tool === "eraser" ? ERASER_RADIUS * 2 * baseScale : strokeWidthFromPressure(pressure, baseScale, pointerType);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function handlePanPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const rect = canvas.getBoundingClientRect();
      const [a, b] = [...activePointersRef.current.values()];
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      pinchBaselineRef.current = {
        dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        scale: view.scale,
        baseLeft: rect.left - view.offsetX,
        baseTop: rect.top - view.offsetY,
        anchorX: (midX - rect.left) / view.scale,
        anchorY: (midY - rect.top) / view.scale,
      };
    }
  }

  function handlePanPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const prevPoint = activePointersRef.current.get(e.pointerId);
    if (!prevPoint) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      const dx = e.clientX - prevPoint.x;
      const dy = e.clientY - prevPoint.y;
      setView((v) => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }));
      return;
    }

    const baseline = pinchBaselineRef.current;
    if (activePointersRef.current.size === 2 && baseline) {
      const [a, b] = [...activePointersRef.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const scale = clamp((baseline.scale * dist) / baseline.dist, MIN_SCALE, MAX_SCALE);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      setView({
        scale,
        offsetX: midX - baseline.baseLeft - baseline.anchorX * scale,
        offsetY: midY - baseline.baseTop - baseline.anchorY * scale,
      });
    }
  }

  function handlePanPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchBaselineRef.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "pan") {
      handlePanPointerDown(e);
      return;
    }
    if (isIgnoredPointer(e)) return;
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

    const { x, y } = toCanvasCoords(e);
    drawingRef.current = { x, y };
    drawSegment(ctx, { x, y }, { x, y }, e.pressure, e.pointerType);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "pan") {
      handlePanPointerMove(e);
      return;
    }
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
    if (tool === "pan") return;
    if (isIgnoredPointer(e)) return;
    if (tool === "eraser") updateEraserPreview(e);
  }

  function handlePointerLeave() {
    setEraserPreview(null);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "pan") {
      handlePanPointerUp(e);
      return;
    }
    const wasDrawing = drawingRef.current !== null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    drawingRef.current = null;
    if (!wasDrawing) return;

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
    if (!pages) return;
    const next = [...pages, makeBlankPage(SKETCH_CANVAS_SIZE)];
    setPages(next);
    setCurrentIndex(next.length - 1);
    setView(FIT_VIEW);
  }

  function handleRemovePage() {
    if (!pages) return;
    const page = pages[currentIndex];
    const remaining = pages.filter((_, i) => i !== currentIndex);
    if (page.dbId) setDeletedIds((prev) => [...prev, page.dbId!]);

    if (remaining.length === 0) {
      setPages([makeBlankPage(SKETCH_CANVAS_SIZE)]);
      setCurrentIndex(0);
    } else {
      setPages(remaining);
      setCurrentIndex((i) => Math.min(i, remaining.length - 1));
    }
  }

  function handleZoomButton(factor: number) {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = canvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const centerX = wrapRect.left + wrapRect.width / 2;
    const centerY = wrapRect.top + wrapRect.height / 2;
    setView((v) => zoomAroundPoint(rect, centerX, centerY, v.scale * factor, v));
  }

  function handleFitView() {
    setView(FIT_VIEW);
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
            className={tool === "pan" ? "btn btn-sm btn-primary" : "btn btn-sm"}
            onClick={() => setTool("pan")}
          >
            Pan
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
          <button type="button" className="btn btn-sm" onClick={() => handleZoomButton(1 / 1.25)} disabled={!pages}>
            −
          </button>
          <button type="button" className="btn btn-sm" onClick={handleFitView} disabled={!pages}>
            Fit
          </button>
          <button type="button" className="btn btn-sm" onClick={() => handleZoomButton(1.25)} disabled={!pages}>
            +
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
          className={`sketch-canvas sketch-ink${tool === "eraser" ? " sketch-canvas-eraser" : ""}${
            tool === "pan" ? " sketch-canvas-pan" : ""
          }`}
          style={{ transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})` }}
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
        <button type="button" className="btn btn-primary" onClick={handleSaveAndClose} disabled={saving || !pages}>
          {saving ? "Saving…" : "Save and close"}
        </button>
      </div>
    </Modal>
  );
}

export default SketchEditorModal;
