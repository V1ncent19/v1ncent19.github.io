"use client";

import { useCallback, useEffect, useState } from "react";
import type { PilgrimageData } from "@/lib/travel/pilgrimage";
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

interface Props {
  data: PilgrimageData;
  /** hub to return to — the English page and its zh mirror differ */
  backHref?: string;
  /**
   * Label for the back strip.
   *
   * Deliberately has NO default that silently applies to the wrong language:
   * it used to default to "返回旅行页", so the ENGLISH page's back button
   * announced a Chinese label (and, on hover, showed Chinese text) while
   * everything around it was English. Pages now pass it explicitly — ptes does
   * the same (`backLabel="Back to Travel"` / `"返回旅行志"`), which is exactly
   * why that page never had the problem. When omitted it falls back to `lang`.
   */
  backLabel?: string;
  /** Page language — forwarded to the map so maplibre's own UI strings (the
   *  cooperative-gesture hint) and the story column's scroll cue match the
   *  page. Defaults to English, which is maplibre's built-in table. */
  lang?: "en" | "zh";
}

export default function PilgrimageLog({
  data,
  backHref = "/travel",
  backLabel,
  lang = "en",
}: Props) {
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
  /** Back-button handoff in progress: the exit wipe is painting and the hard
   *  navigation fires 300 ms later (same rhythm as the trip log). */
  const [leaving, setLeaving] = useState(false);
  /** The back strip's wording. Explicit prop first, then the page language —
   *  never a Chinese default on an English page. */
  const label = backLabel ?? (lang === "zh" ? "返回旅行志" : "Back to Travel");

  // Immersive shell: hide the site chrome for this page's full-viewport layout
  // (same contract as the trip log's body.tl-immersive).
  useEffect(() => {
    document.body.classList.add("pj-immersive", "tl-immersive");
    return () => document.body.classList.remove("pj-immersive", "tl-immersive");
  }, []);

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
    <div className="pj-page">
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
      />

      <PilgrimageStory
        data={data}
        onActiveStop={handleActive}
        focusStopId={navStopId}
        focusNonce={focusNonce}
        lang={lang}
      />

      {/* Plain <a> + hard navigation, exactly like the trip log's back strip:
          the click plays the brand-blue wipe as the handoff to the hub so the
          transition is one gesture instead of an abrupt swap. The wipe itself
          lives in globals.css (`.pj-back-wipe`) so it is styled from the same
          sheet as the strip. */}
      <a
        href={backHref}
        className="pj-back"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          if (!leaving) {
            setLeaving(true);
            window.setTimeout(() => {
              window.location.href = backHref;
            }, 300);
          }
        }}
      >
        <svg
          className="pj-back-arrow"
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11 17 6 12l5-5" />
          <path d="M18 17l-5-5 5-5" />
        </svg>
        <span className="pj-back-label" aria-hidden="true">
          {label}
        </span>
      </a>

      {leaving ? <div className="pj-back-wipe" aria-hidden="true" /> : null}
    </div>
  );
}
