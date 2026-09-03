"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { themeStorageKey, type Theme } from "@/lib/site";

/**
 * Single-button light/dark/system theme control.
 *
 * One compact button that cycles through three modes:
 *   系统 / system → ☀ 明 / light → 🌙 暗 / dark → (back to system)
 * The default — both on first visit and when nothing is stored — is "system".
 *
 * Like the rest of the theme machinery this is state-free on the React side:
 * which icon is shown is decided in CSS by `data-theme` on <html> (set by
 * components/theme/theme-script.tsx before hydration), and clicking only
 * mutates the class/attribute + localStorage. No state → nothing to hydrate
 * twice, and no `set-state-in-effect` pitfalls.
 *
 * Icons are three stacked lucide glyphs (☀ system ☾ light ⇄ dark) and CSS in
 * globals.css shows exactly one via `html[data-theme="…"]`.
 */
/** Which icons map to which mode (class suffix matches globals.css rules). */
const ICON: Record<Theme, string> = {
  light: "ti-sun",
  dark: "ti-moon",
  system: "ti-system",
};

const LABEL: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle() {
  function nextOf(current: Theme): Theme {
    return current === "system" ? "light" : current === "light" ? "dark" : "system";
  }

  function onToggle() {
    const stored = read();
    const next = nextOf(stored);
    apply(next);
    // Reflect the new mode back onto the button (tooltip + label).
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("title", `Theme: ${LABEL[next]} (click to cycle)`);
      btn.setAttribute(
        "aria-label",
        `Theme: ${LABEL[next]}. Click to switch to ${
          LABEL[nextOf(next)]
        }.`,
      );
    }
  }

  return (
    <button
      id="theme-toggle"
      type="button"
      onClick={onToggle}
      title="Theme: System (click to cycle)"
      className="ui-text relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-surface text-muted transition-colors hover:bg-surface-tint hover:text-brand hover:no-underline"
    >
      {/* exactly one is visible — see globals.css [data-theme] rules */}
      <Sun
        className={`${ICON.light} ti-ico h-5 w-5`}
        aria-hidden="true"
        strokeWidth={1.8}
      />
      <Moon
        className={`${ICON.dark} ti-ico h-5 w-5`}
        aria-hidden="true"
        strokeWidth={1.8}
      />
      <Monitor
        className={`${ICON.system} ti-ico h-5 w-5`}
        aria-hidden="true"
        strokeWidth={1.8}
      />
    </button>
  );
}

function read(): Theme {
  try {
    const m = localStorage.getItem(themeStorageKey);
    if (m === "light" || m === "dark" || m === "system") return m;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function apply(mode: Theme) {
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const dark = mode === "dark" || (mode === "system" && mq.matches);
  root.classList.toggle("dark", dark);
  root.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(themeStorageKey, mode);
  } catch {
    /* class + attribute already applied */
  }
}
