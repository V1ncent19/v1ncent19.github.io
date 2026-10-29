"use client";

import type { ReactNode } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import type { Theme } from "@/lib/site";

const THEMES: { id: Theme; label: { en: string; zh: string }; Icon: LucideIcon }[] = [
  { id: "system", label: { en: "Follow system appearance", zh: "跟随系统明暗" }, Icon: Monitor },
  { id: "light", label: { en: "Light mode", zh: "浅色模式" }, Icon: Sun },
  { id: "dark", label: { en: "Dark mode", zh: "深色模式" }, Icon: Moon },
];

/** Shared placement and theme control; map-specific controls occupy the second slot. */
export default function MapToolbar({ mode, onTheme, className, groupClass, buttonClass, children, lang = "zh" }: {
  mode: Theme; onTheme: (theme: Theme) => void; className: string;
  groupClass: string; buttonClass: string; children: ReactNode; lang?: "en" | "zh";
}) {
  return <div className={`travel-log-tools ${className}`}>
    <div className={groupClass} role="radiogroup" aria-label={lang === "zh" ? "页面明暗" : "Appearance"}>
      {THEMES.map(({ id, label, Icon }) => <button key={id} type="button" role="radio" aria-checked={mode === id}
        aria-label={label[lang]} data-tooltip={label[lang]}
        className={`travel-log-icon-btn ${buttonClass}${mode === id ? " on" : ""}`} onClick={() => onTheme(id)}>
        <Icon aria-hidden="true" strokeWidth={1.8} />
      </button>)}
    </div>
    {children}
  </div>;
}
