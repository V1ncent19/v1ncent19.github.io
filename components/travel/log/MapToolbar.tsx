"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/site";
import SystemAppearanceIcon from "@/components/theme/system-appearance-icon";

const THEMES = [
  { id: "system", label: { en: "Follow system appearance", zh: "跟随系统明暗" }, Icon: SystemAppearanceIcon },
  { id: "light", label: { en: "Light mode", zh: "浅色模式" }, Icon: Sun },
  { id: "dark", label: { en: "Dark mode", zh: "深色模式" }, Icon: Moon },
] satisfies { id: Theme; label: { en: string; zh: string }; Icon: ComponentType<SVGProps<SVGSVGElement>> }[];

/** Shared placement and theme control; map-specific controls occupy the second slot. */
export default function MapToolbar({ mode, onTheme, className, groupClass, buttonClass, children, leading, lang = "zh" }: {
  mode: Theme; onTheme: (theme: Theme) => void; className: string;
  groupClass: string; buttonClass: string; children: ReactNode; leading?: ReactNode; lang?: "en" | "zh";
}) {
  return <div className={`travel-log-tools ${className}`}>
    {leading}
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
