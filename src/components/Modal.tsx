import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "default" | "fullscreen";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Tracks which mounted Modal is topmost so a nested Modal (e.g. an edit modal
// opened from within a fullscreen list modal) only lets the topmost instance
// react to Escape/Tab — otherwise both layers would close on one Escape press.
let modalStack: symbol[] = [];

function Modal({ title, onClose, children, variant = "default" }: ModalProps) {
  const isFullscreen = variant === "fullscreen";
  const modalRef = useRef<HTMLDivElement>(null);
  const [id] = useState<symbol>(() => Symbol());

  useEffect(() => {
    modalStack.push(id);
    return () => {
      modalStack = modalStack.filter((entry) => entry !== id);
    };
  }, [id]);

  // Move focus into the dialog on open (unless a control inside it already
  // grabbed focus via autoFocus) and hand it back to whatever triggered the
  // modal once it closes, so keyboard users aren't dropped back at the top
  // of the page.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const modalEl = modalRef.current;
    if (modalEl && !modalEl.contains(document.activeElement)) {
      const first = modalEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? modalEl).focus();
    }
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (modalStack[modalStack.length - 1] !== id) return;
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const modalEl = modalRef.current;
      if (!modalEl) return;
      const focusable = Array.from(modalEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Trap Tab/Shift+Tab inside the modal so keyboard focus can't wander
      // into content hidden behind the overlay.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, id]);

  return (
    <div
      className={isFullscreen ? "modal-overlay modal-overlay--fullscreen" : "modal-overlay"}
      onClick={onClose}
    >
      <div
        className={isFullscreen ? "modal modal--fullscreen" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
