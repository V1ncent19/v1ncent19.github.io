"use client";

import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import type { LogKind, LogLang } from "@/lib/travel/log/types";

import { LogLayoutContext, LOG_LAYOUTS } from "@/lib/travel/log/layout";
import { clearTravelEntry } from "@/lib/travel/log/entry-transition";

const TRANSITIONS = {
  journal: { immersive: ["tl-immersive"], boot: "tl-veil-boot", open: "tl-veil-open", beat: 200 },
  pilgrimage: { immersive: ["pj-immersive", "tl-immersive"], boot: "pj-boot", open: "pj-veil-open", beat: 180 },
} as const;
const ENTRY_ANIMATIONS = ["travel-log-entry-open", "travel-log-entry-fallback"];

/** One lifecycle for both pages; the sheet must remain a body pseudo-element. */
function useTravelTransition(kind: LogKind, dataReady: boolean, mapReady: boolean, failed: boolean) {
  const config = TRANSITIONS[kind];
  useLayoutEffect(() => {
    const body = document.body;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    body.classList.add(...config.immersive);
    // Inline scripts cover document loads; Next Link navigation needs its own
    // pre-paint start. add() leaves the existing parse-time animation running.
    if (!motion.matches) body.classList.add(config.boot);
    // Transfer the same body pseudo-element without exposing either route.
    clearTravelEntry();
    const clearCurtain = () => body.classList.remove(config.boot, config.open);
    const onMotionChange = () => { if (motion.matches) clearCurtain(); };
    const done = (e: AnimationEvent) => {
      if (e.pseudoElement === "::before" && ENTRY_ANIMATIONS.includes(e.animationName)) clearCurtain();
    };
    body.addEventListener("animationend", done);
    motion.addEventListener("change", onMotionChange);
    return () => {
      body.removeEventListener("animationend", done);
      motion.removeEventListener("change", onMotionChange);
      body.classList.remove(...config.immersive, config.boot, config.open);
    };
  }, [config]);
  useEffect(() => {
    if (!dataReady && !failed) return;
    const release = () => {
      if (document.body.classList.contains(config.boot)) document.body.classList.add(config.open);
    };
    // Failure is visible immediately; a missing map cannot hold the reader hostage.
    const timer = window.setTimeout(release, failed ? 0 : mapReady ? config.beat : 1500);
    return () => window.clearTimeout(timer);
  }, [config, dataReady, mapReady, failed]);
}

function TravelLogBack({ lang }: { lang: LogLang }) {
  const [leaving, setLeaving] = useState(false);
  const href = lang === "zh" ? "/travel/zh" : "/travel";
  const label = lang === "zh" ? "返回旅行志" : "Back to Travel";
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => { window.location.href = href; }, 300);
    return () => window.clearTimeout(timer);
  }, [leaving, href]);
  return <>
    <a href={href} className="tl-back-strip travel-log-back" aria-label={label} onClick={e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); setLeaving(true);
    }}>
      <svg className="travel-log-back-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 17 6 12l5-5" /><path d="M18 17l-5-5 5-5" />
      </svg>
      <span className="travel-log-back-label" aria-hidden="true">{label}</span>
    </a>
    {leaving && <div className="travel-log-wipe" aria-hidden="true" />}
  </>;
}

export function TravelLogStatus({ error }: { error: string | null }) {
  return error
    ? <div className="boot-error" role="alert">Failed to load travel data: {error}</div>
    : <div className="boot-loading" role="status" aria-live="polite"><span className="boot-loading-dot" aria-hidden="true" />Loading trip data…</div>;
}

export default function TravelLogShell({ kind, id, wordmark, lang, dataReady, mapReady, failed = false, map, story, children, legacyStorageKey }: {
  kind: LogKind; id: string; wordmark: string; lang: LogLang;
  dataReady: boolean; mapReady: boolean; failed?: boolean;
  map?: ReactNode; story?: ReactNode; children?: ReactNode;
  legacyStorageKey?: string;
}) {
  useTravelTransition(kind, dataReady, mapReady, failed);
  const layout = useMemo(() => ({ storageKey: `travel-log-split:${id}`, legacyStorageKey, ...LOG_LAYOUTS[kind] }), [id, kind, legacyStorageKey]);
  return <LogLayoutContext.Provider value={layout}>
    <div style={{ "--log-default-map-height": `${layout.defaultVh}vh` } as CSSProperties} className={kind === "journal" ? "travel-layout" : "pj-page"} data-travel-log={id} data-log-kind={kind}>
      {map && (kind === "journal" ? <div className="map-col" data-log-map>{map}</div> : map)}
      {story && (kind === "journal" ? <div className="story-col">{story}</div> : story)}
      {children}
      {dataReady && <TravelLogBack lang={lang} />}
    </div>
    <span className="tl-veil-band" aria-hidden="true">{wordmark}</span>
  </LogLayoutContext.Provider>;
}
