import { useState } from "react";
import { useVault } from "../documents/useVault";
import {
  emptyVaultPasswordFormValues,
  validateVaultPasswordForm,
  type VaultPasswordFormErrors,
} from "../utils/vaultPasswordForm";

function VaultSetup() {
  const { setup } = useVault();
  const [values, setValues] = useState(emptyVaultPasswordFormValues);
  const [errors, setErrors] = useState<VaultPasswordFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateVaultPasswordForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await setup(values.password);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create the vault.");
      setSubmitting(false);
    }
  }

  return (
    <section className="vault-gate">
      <h1 className="vault-gate-title">Document vault</h1>
      <p>
        Store rental paperwork — PDFs and images — encrypted on this device. Set a password to
        create your vault.
      </p>
      <p className="vault-gate-warning">
        The password cannot be recovered. If you forget it, the only way back is resetting the
        vault, which deletes every stored document.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="vault-password">Password</label>
          <input
            id="vault-password"
            type="password"
            autoFocus
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="vault-password-confirm">Confirm password</label>
          <input
            id="vault-password-confirm"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={(e) => setValues((prev) => ({ ...prev, confirm: e.target.value }))}
          />
          {errors.confirm && <span className="field-error">{errors.confirm}</span>}
        </div>
        {submitError && <div className="banner banner-error">{submitError}</div>}
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create vault"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default VaultSetup;
