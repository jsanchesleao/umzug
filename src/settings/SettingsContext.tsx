import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SETTINGS } from "../types";
import type { AppSettings } from "../types";
import { SettingsContext } from "./settingsContext";
import type { SettingsContextValue } from "./settingsContext";

const STORAGE_KEY = "umzug:settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function resolveTheme(mode: AppSettings["theme"]): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyTheme(mode: AppSettings["theme"]) {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;

  const themeColor = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && themeColor) meta.setAttribute("content", themeColor);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);

    if (settings.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme(settings.theme);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
