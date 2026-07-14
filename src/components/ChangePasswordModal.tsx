import { useState } from "react";
import Modal from "./Modal";
import { useVault } from "../documents/useVault";
import {
  emptyVaultPasswordFormValues,
  validateVaultPasswordForm,
  type VaultPasswordFormErrors,
} from "../utils/vaultPasswordForm";

interface ChangePasswordModalProps {
  onClose: () => void;
}

function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { changePassword } = useVault();
  const [oldPassword, setOldPassword] = useState("");
  const [values, setValues] = useState(emptyVaultPasswordFormValues);
  const [errors, setErrors] = useState<VaultPasswordFormErrors & { old?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: VaultPasswordFormErrors & { old?: string } =
      validateVaultPasswordForm(values);
    if (!oldPassword) nextErrors.old = "Enter your current password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await changePassword(oldPassword, values.password);
      setDone(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to change the password.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Modal title="Change password" onClose={onClose}>
        <p>Password changed. Your documents stay exactly as they were.</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="vault-old-password">Current password</label>
          <input
            id="vault-old-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          {errors.old && <span className="field-error">{errors.old}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="vault-new-password">New password</label>
          <input
            id="vault-new-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="vault-new-password-confirm">Confirm new password</label>
          <input
            id="vault-new-password-confirm"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={(e) => setValues((prev) => ({ ...prev, confirm: e.target.value }))}
          />
          {errors.confirm && <span className="field-error">{errors.confirm}</span>}
        </div>
        {submitError && <div className="banner banner-error">{submitError}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ChangePasswordModal;
