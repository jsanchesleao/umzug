import { useRef, useState } from "react";
import { useVault } from "../documents/useVault";
import DocReceiveModal from "./DocReceiveModal";
import ChangePasswordModal from "./ChangePasswordModal";
import VaultResetConfirm from "./VaultResetConfirm";

function DocumentsMenuBar() {
  const { status, lock } = useVault();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [modal, setModal] = useState<"receive" | "changePassword" | "reset" | null>(null);

  if (status !== "unlocked") return null;

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  function openModal(which: "receive" | "changePassword" | "reset") {
    setModal(which);
    closeMenu();
  }

  return (
    <div className="documents-menu-bar">
      <details className="status-menu" ref={menuRef}>
        <summary className="status-menu-trigger" aria-label="Document vault actions">
          ☰
        </summary>
        <div className="status-menu-list dashboard-menu-list">
          <button type="button" className="status-menu-option" onClick={() => openModal("receive")}>
            Receive
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              lock();
              closeMenu();
            }}
          >
            Lock vault
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => openModal("changePassword")}
          >
            Change password
          </button>
          <button type="button" className="status-menu-option" onClick={() => openModal("reset")}>
            Reset vault
          </button>
        </div>
      </details>

      {modal === "receive" && <DocReceiveModal onClose={() => setModal(null)} />}
      {modal === "changePassword" && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === "reset" && <VaultResetConfirm onClose={() => setModal(null)} />}
    </div>
  );
}

export default DocumentsMenuBar;
