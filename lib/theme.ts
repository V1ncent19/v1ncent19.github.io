import { themeStorageKey, type Theme } from "./site";

/**
 * Shared 3-way theme logic (light / dark / system).
 *
 * Extracted from components/theme/theme-toggle.tsx so the trip pages — which
 * hide the site header (and its toggle) via body.tl-immersive — can carry the
 * SAME control with the SAME storage key. One key means a change made inside a
 * trip page is already in effect on the main site, and vice versa.
 *
 * The resolved state lives on <html> as a `.dark` class (drives CSS) plus a
 * `data-theme` attribute equal to the CHOSEN mode (drives the toggle icon).
 * components/theme/theme-script.tsx applies both before hydration.
 */

/** Cycle order used by the single-button control: system → light → dark → system. */
export function nextTheme(current: Theme): Theme {
  return current === "system" ? "light" : current === "light" ? "dark" : "system";
}

/** The stored mode, defaulting to "system" (also when storage is unavailable). */
export function readTheme(): Theme {
  try {
    const m = localStorage.getItem(themeStorageKey);
    if (m === "light" || m === "dark" || m === "system") return m;
  } catch {
    /* storage unavailable (private mode) */
  }
  return "system";
}

/** Apply a mode to <html> (class + attribute) and persist it. */
export function applyTheme(mode: Theme): void {
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const dark = mode === "dark" || (mode === "system" && mq.matches);
  root.classList.toggle("dark", dark);
  root.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(themeStorageKey, mode);
  } catch {
    /* class + attribute are already applied */
  }
}

/** Human label per mode, for the control's tooltip / aria-label. */
export const THEME_LABEL: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};
