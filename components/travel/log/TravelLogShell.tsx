"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import type { LogMapPhase } from "@/lib/travel/log/map-preparation";
import type { LogKind, LogLang } from "@/lib/travel/log/types";

import { LogLayoutContext, LOG_LAYOUTS } from "@/lib/travel/log/layout";
import { clearTravelEntry } from "@/lib/travel/log/entry-transition";
import { resolveTravelLogOrigin, type TravelLogOrigin } from "@/lib/travel/log/return-navigation";

const TRANSITIONS = {
  journal: { immersive: ["tl-immersive"], boot: "tl-veil-boot", open: "tl-veil-open", beat: 200 },
  pilgrimage: { immersive: ["pj-immersive", "tl-immersive"], boot: "pj-boot", open: "pj-veil-open", beat: 180 },
  terrain: { immersive: ["terrain-immersive", "tl-immersive"], boot: "terrain-boot", open: "terrain-veil-open", beat: 260 },
  reconstructed: { immersive: ["tl-immersive"], boot: "tl-veil-boot", open: "tl-veil-open", beat: 200 },
} as const;
const ENTRY_ANIMATIONS = ["travel-log-entry-open", "travel-log-entry-fallback"];

/** Shared by every log. The sheet stays a body pseudo-element for the first paint. */
function useTravelTransition(kind: LogKind, dataReady: boolean, mapPhase: LogMapPhase, failed: boolean) {
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
    const cannotLoad = failed || mapPhase === "failed";
    if (!cannotLoad && (!dataReady || mapPhase !== "ready")) return;
    const timer = window.setTimeout(() => {
      const body = document.body;
      if (!body.classList.contains(config.boot)) return;
      // If the CSS timeout already started opening the sheet, let it finish.
      const { transform } = getComputedStyle(body, "::before");
      if (new DOMMatrixReadOnly(transform === "none" ? undefined : transform).a < 1) return;
      body.classList.add(config.open);
    }, cannotLoad ? 0 : config.beat);
    return () => window.clearTimeout(timer);
  }, [config, dataReady, mapPhase, failed]);
}

function TravelLogBack({ lang }: { lang: LogLang }) {
  const [leaving, setLeaving] = useState(false);
  const [origin, setOrigin] = useState<TravelLogOrigin | null>(null);
  const href = origin?.href ?? (lang === "zh" ? "/travel/zh/" : "/travel/");
  const isTravelHub = /^\/travel(?:\/zh)?\/?(?:[?#]|$)/.test(href);
  const label = isTravelHub ? (lang === "zh" ? "返回旅行志" : "Back to Travel") : (lang === "zh" ? "返回上一页" : "Go Back");
  const goBack = useCallback(() => {
    const destination = origin ?? resolveTravelLogOrigin();
    if (destination?.inHistory && window.history.length > 1) window.history.back();
    else window.location.assign(destination?.href ?? href);
  }, [href, origin]);
  useEffect(() => {
    const timer = window.setTimeout(() => setOrigin(resolveTravelLogOrigin()), 0);
    const restore = (event: PageTransitionEvent) => { if (event.persisted) setLeaving(false); };
    window.addEventListener("pageshow", restore);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(goBack, 300);
    return () => window.clearTimeout(timer);
  }, [leaving, goBack]);
  return <>
    <a href={href} className="tl-back-strip travel-log-back" aria-label={label} onClick={e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) goBack();
      else setLeaving(true);
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

export default function TravelLogShell({ kind, id, wordmark, lang, dataReady, mapPhase, failed = false, map, story, children, legacyStorageKey }: {
  kind: LogKind; id: string; wordmark: string; lang: LogLang;
  dataReady: boolean; mapPhase: LogMapPhase; failed?: boolean;
  map?: ReactNode; story?: ReactNode; children?: ReactNode;
  legacyStorageKey?: string;
}) {
  useTravelTransition(kind, dataReady, mapPhase, failed);
  const layout = useMemo(() => ({ storageKey: `travel-log-split:${id}`, legacyStorageKey, ...LOG_LAYOUTS[kind] }), [id, kind, legacyStorageKey]);
  const journalLayout = kind === "journal" || kind === "reconstructed";
  return <LogLayoutContext.Provider value={layout}>
    <div style={{ "--log-default-map-height": `${layout.defaultVh}vh` } as CSSProperties} className={journalLayout ? "travel-layout" : "pj-page"} data-travel-log={id} data-log-kind={kind}>
      {map && (journalLayout ? <div className="map-col" data-log-map>{map}</div> : map)}
      {story && (journalLayout ? <div className="story-col">{story}</div> : story)}
      {children}
      {dataReady && <TravelLogBack lang={lang} />}
    </div>
    <span className="tl-veil-band" aria-hidden="true">{wordmark}</span>
    <p className="tl-veil-loading" role="status">{lang === "zh" ? "正在加载游记地图…" : "Loading the travel map…"}</p>
  </LogLayoutContext.Provider>;
}
