"use client";

import { createContext, useContext } from "react";
import type { LogKind } from "./types";

export const LOG_BREAKPOINT = 1024;
export const LOG_STACKED_QUERY = "(max-width: 1023px)";
export const LOG_HEIGHT_VAR = "--log-map-height";
export const LOG_LAYOUTS = {
  journal: { defaultVh: 40 },
  pilgrimage: { defaultVh: 58 },
} satisfies Record<LogKind, { defaultVh: number }>;

export interface LogLayout {
  storageKey: string;
  defaultVh: number;
  legacyStorageKey?: string;
}
export const LogLayoutContext = createContext<LogLayout | null>(null);
export function useLogLayout() {
  const layout = useContext(LogLayoutContext);
  if (!layout) throw new Error("Travel map must be inside TravelLogShell");
  return layout;
}
