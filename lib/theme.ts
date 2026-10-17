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

/**
 * What the STATIC HTML was built with.
 *
 * The export is prerendered in Node, where storage does not exist, so every
 * page ships with `system` selected. Anyone whose stored mode is light/dark
 * therefore differs from the server — and React does NOT patch attribute
 * mismatches, so a component that seeds its state from `readTheme()` during
 * render leaves the wrong pill lit until the reader clicks something.
 * Consumers must render this value on the first pass; see the store below.
 */
export const THEME_SERVER_SNAPSHOT: Theme = "system";

/**
 * The mode currently applied to <html>, as written by `ThemeScript` (or by a
 * previous `applyTheme`). Reading the DOM instead of storage means the value
 * the client switches to after hydration is already the one the page is
 * visibly using — no second flash.
 */
export function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return THEME_SERVER_SNAPSHOT;
  const applied = document.documentElement.getAttribute("data-theme");
  if (applied === "light" || applied === "dark" || applied === "system") return applied;
  return readTheme();
}

const themeListeners = new Set<() => void>();
let storageBound = false;

function emitTheme(): void {
  for (const cb of themeListeners) cb();
}

/**
 * Subscribe for `useSyncExternalStore`. Falls back to the storage event so a
 * change made in another tab reaches this one.
 */
export function subscribeTheme(onChange: () => void): () => void {
  themeListeners.add(onChange);
  if (!storageBound && typeof window !== "undefined") {
    storageBound = true;
    window.addEventListener("storage", (e) => {
      if (e.key === themeStorageKey || e.key === null) emitTheme();
    });
  }
  return () => {
    themeListeners.delete(onChange);
  };
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
  // Notifies useSyncExternalStore consumers in THIS tab (the storage event
  // only fires in other tabs).
  emitTheme();
}

/** Human label per mode, for the control's tooltip / aria-label. */
export const THEME_LABEL: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};
