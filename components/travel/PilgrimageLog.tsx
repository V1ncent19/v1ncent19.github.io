"use client";

import { useCallback, useEffect, useState } from "react";
import type { PilgrimageDefinition, LogLang } from "@/lib/travel/log/types";
import TravelLogShell from "./log/TravelLogShell";
import PilgrimageMap from "./PilgrimageMap";
import PilgrimageStory from "./PilgrimageStory";

/**
 * Pilgrimage page shell — owns the two pieces of state the map and the story
 * column must agree on:
 *
 *   activeStopId — the stop currently in the reading band. Drives the map's
 *                  dot highlight, the traveller cursor and the bright line.
 *   openStopId   — the popup actually showing. Usually follows activeStopId,
 *                  but a manual close (×) or a click on a dot overrides it
 *                  until the reader scrolls on to another stop.
 *
 * Keeping both here, rather than in either child, is what makes "scroll in →
 * popup opens, scroll away → it closes" and "click a dot → the page scrolls to
 * that stop" behave as one mechanism instead of two that fight.
 */

export default function PilgrimageLog({ log, lang }: { log: PilgrimageDefinition; lang: LogLang }) {
  const data = log.data;
  /**
   * The three related pieces of scroll/map state, kept in ONE object so they
   * can never be updated out of step:
   *   active    — the stop currently in the reading band (drives the dot)
   *   open      — the popup actually showing
   *   dismissed — a stop the reader closed by hand; auto-open stays off for it
   *               until a DIFFERENT stop becomes active, otherwise the ×
   *               button would appear to do nothing while the section is
   *               still in the band.
   */
  const [view, setView] = useState<{
    active: string | null;
    open: string | null;
    dismissed: string | null;
  }>({ active: null, open: null, dismissed: null });
  /** Clicking a dot scrolls the page; this nonce lets the same dot be clicked
   *  repeatedly and still re-scroll. */
  const [focusNonce, setFocusNonce] = useState(0);
  /** The stop the story column should scroll to, and a nonce so a repeat
   *  click on the same dot re-scrolls. Kept separate from `open` because the
   *  reader may close the popup without wanting the page to jump back. */
  const [navStopId, setNavStopId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  // The resolved light/dark state lives on <html class="dark"> (written by the
  // site's theme script and toggle). Watching that class is the only signal
  // that stays correct for ALL three modes — including "system", where the
  // stored value never changes but the OS preference can flip at any moment
  // (same approach as the trip log's TravelMap).
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const [mapReady, setMapReady] = useState(false);

  /** The story column reports the stop it is reading. Everything the map needs
   *  is derived in one place, so the popup can never disagree with the dot. */
  const handleActive = useCallback((id: string | null, p: number) => {
    void p; // progress is no longer used: the map draws from the stop's route
    // index, which is a more accurate "where was the rider" than a count of
    // how many stops have gone by.
    setView((v) => {
      if (!id) return { active: null, open: null, dismissed: v.dismissed };
      // Coming into a DIFFERENT stop retires an earlier manual close, so the
      // auto-open resumes for everything after it.
      const dismissed = v.dismissed && v.dismissed !== id ? null : v.dismissed;
      // The new stop takes over — unless the reader closed THIS one by hand,
      // in which case the popup stays shut while its section is in the band.
      const open = dismissed === id ? null : id;
      return { active: id, open, dismissed };
    });
  }, []);

  /** The map reports a dot click: open that stop's popup. */
  const handleOpenFromMap = useCallback((id: string | null) => {
    if (id === null) {
      setView((v) => ({ ...v, open: null, dismissed: v.active }));
      return;
    }
    setView((v) => ({ active: v.active, open: id, dismissed: null }));
  }, []);

  /**
   * The map reports a dot click that should move the reader: scroll the story
   * column to that stop. Deliberately independent of `open` so the popup
   * open/close cycle and the page scroll never cancel each other out — the
   * scroll to the stop will make the observer report it as active, and
   * `handleActive` then re-affirms the same popup rather than closing it.
   */
  const handleNavigateToStop = useCallback((id: string) => {
    setNavStopId(id);
    setFocusNonce((n) => n + 1);
  }, []);

  return (
    <TravelLogShell kind="pilgrimage" id={log.id} wordmark={log.wordmark} lang={lang} legacyStorageKey={log.legacySplitKey} dataReady mapReady={mapReady}
      map={
      <PilgrimageMap
        stops={data.stops}
        route={data.route}
        activeStopId={view.active}
        openStopId={view.open}
        onOpenStop={handleOpenFromMap}
        onNavigateToStop={handleNavigateToStop}
        attribution={data.attribution}
        isDark={isDark}
        lang={lang}
        onMapReady={() => setMapReady(true)}
      />

      }
      story={<PilgrimageStory
        data={data}
        onActiveStop={handleActive}
        focusStopId={navStopId}
        focusNonce={focusNonce}
        activeStopId={view.active}
        lang={lang}
      />
      }
    />
  );
}
