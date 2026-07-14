import { useState } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { useVault } from "../documents/useVault";

interface VaultResetConfirmProps {
  onClose: () => void;
}

/** Double-confirmed destructive reset: a danger dialog, then typing DELETE. */
function VaultResetConfirm({ onClose }: VaultResetConfirmProps) {
  const { reset } = useVault();
  const [step, setStep] = useState<"confirm" | "verify">("confirm");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleReset() {
    setWorking(true);
    setError(null);
    try {
      await reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset the vault.");
      setWorking(false);
    }
  }

  if (step === "confirm") {
    return (
      <ConfirmDialog
        title="Reset vault"
        message="This permanently deletes every stored document along with the vault password. This cannot be undone."
        confirmLabel="Continue"
        danger
        onConfirm={() => setStep("verify")}
        onCancel={onClose}
      />
    );
  }

  return (
    <Modal title="Reset vault" onClose={onClose}>
      <p>
        Type <strong>DELETE</strong> to confirm destroying the vault and all documents in it.
      </p>
      <div className="form-field">
        <label htmlFor="vault-reset-confirmation">Confirmation</label>
        <input
          id="vault-reset-confirmation"
          type="text"
          autoFocus
          autoComplete="off"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </div>
      {error && <div className="banner banner-error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose} disabled={working}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={confirmText !== "DELETE" || working}
          onClick={handleReset}
        >
          {working ? "Deleting…" : "Delete everything"}
        </button>
      </div>
    </Modal>
  );
}

export default VaultResetConfirm;
