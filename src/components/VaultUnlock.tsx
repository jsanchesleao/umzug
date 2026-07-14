import { useState } from "react";
import { useVault } from "../documents/useVault";
import VaultResetConfirm from "./VaultResetConfirm";

function VaultUnlock() {
  const { unlock } = useVault();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Enter your vault password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await unlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock the vault.");
      setSubmitting(false);
    }
  }

  return (
    <section className="vault-gate">
      <h1 className="vault-gate-title">Document vault</h1>
      <p>Enter your password to unlock your encrypted documents.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="vault-unlock-password">Password</label>
          <input
            id="vault-unlock-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Unlocking…" : "Unlock"}
          </button>
        </div>
      </form>
      <button
        type="button"
        className="vault-gate-reset-link"
        onClick={() => setConfirmingReset(true)}
      >
        Forgot password? Reset the vault
      </button>

      {confirmingReset && <VaultResetConfirm onClose={() => setConfirmingReset(false)} />}
    </section>
  );
}

export default VaultUnlock;
