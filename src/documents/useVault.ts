import { useContext } from "react";
import { VaultContext } from "./vaultContext";
import type { VaultContextValue } from "./vaultContext";

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault must be used within a VaultProvider");
  return context;
}
