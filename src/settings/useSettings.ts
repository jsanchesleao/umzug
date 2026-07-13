import { useContext } from "react";
import { SettingsContext } from "./settingsContext";
import type { SettingsContextValue } from "./settingsContext";

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}
