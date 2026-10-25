"use client";

import type { ReactNode } from "react";
import type { Theme } from "@/lib/site";

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: "system", label: "跟随系统明暗", icon: "自" },
  { id: "light", label: "浅色模式", icon: "昼" },
  { id: "dark", label: "深色模式", icon: "夜" },
];

/** Shared placement and theme control; map-specific controls occupy the second slot. */
export default function MapToolbar({ mode, onTheme, className, groupClass, buttonClass, children }: {
  mode: Theme; onTheme: (theme: Theme) => void; className: string;
  groupClass: string; buttonClass: string; children: ReactNode;
}) {
  return <div className={`travel-log-tools ${className}`}>
    <div className={groupClass} role="radiogroup" aria-label="页面明暗">
      {THEMES.map(t => <button key={t.id} type="button" role="radio" aria-checked={mode === t.id}
        className={buttonClass + (mode === t.id ? " on" : "")} title={t.label} onClick={() => onTheme(t.id)}>{t.icon}</button>)}
    </div>
    {children}
  </div>;
}
