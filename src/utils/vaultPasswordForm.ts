export const MIN_VAULT_PASSWORD_LENGTH = 8;

export interface VaultPasswordFormValues {
  password: string;
  confirm: string;
}

export type VaultPasswordFormErrors = Partial<Record<keyof VaultPasswordFormValues, string>>;

export function emptyVaultPasswordFormValues(): VaultPasswordFormValues {
  return { password: "", confirm: "" };
}

export function validateVaultPasswordForm(values: VaultPasswordFormValues): VaultPasswordFormErrors {
  const errors: VaultPasswordFormErrors = {};

  if (values.password.length < MIN_VAULT_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_VAULT_PASSWORD_LENGTH} characters.`;
  }
  if (values.confirm !== values.password) {
    errors.confirm = "Passwords do not match.";
  }

  return errors;
}
