"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import { beginTravelEntry, clearTravelEntry } from "@/lib/travel/log/entry-transition";
import { rememberTravelLogSource } from "@/lib/travel/log/return-navigation";
import SundialLightMap, { type MapLightLocation } from "./SundialLightMap";
import { carrySundialLightToHome } from "./sundial-home-transition";
import { PORTAL_DURATION, type TravelWindow } from "./sundial-layout";
import { createSundialMusic } from "./sundial-music";
import { equatorialSunrise, sundialTimeAt, worldLightSnapshot, type SundialClock } from "./sundial-world-light";
import type { PortalFlight } from "./SundialScene";

const SundialScene = dynamic(() => import("./SundialScene"), { ssr: false });
const RETURN_WINDOW = "playgroundReturnWindow";
type Status = "loading" | "ready" | "unavailable";
type Opening = "waiting" | "revealing" | "done";
type Closing = "controls" | "iris" | "covered";
interface LightingState { clock: SundialClock; location: MapLightLocation }

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function rememberReturnWindow(id: string | null) {
  try { window.history.replaceState({ ...window.history.state, [RETURN_WINDOW]: id }, ""); } catch { /* optional history */ }
}

function anchorIris(target: HTMLElement | null, title: HTMLElement | null) {
  const dot = title?.querySelector(".sundial-title-spark");
  if (!target || !dot) return false;
  const viewport = target.getBoundingClientRect();
  const anchor = dot.getBoundingClientRect();
  const x = anchor.left - viewport.left;
  const y = anchor.top - viewport.top;
  const radius = Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y));
  target.style.setProperty("--sundial-iris-x", `${x}px`);
  target.style.setProperty("--sundial-iris-y", `${y}px`);
  target.style.setProperty("--sundial-iris-start", `${Math.ceil(radius) + 84}px`);
  return true;
}

export default function PlaygroundExperience({ entries }: { entries: TravelWindow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState({ preview: false, index: -1 });
  const selectedIndex = view.preview ? view.index : -1;
  const [status, setStatus] = useState<Status>("loading");
  const [reduced, setReduced] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [flight, setFlight] = useState<PortalFlight | null>(null);
  const [musicState, setMusicState] = useState<"paused" | "loading" | "primed" | "playing" | "failed">("paused");
  const [opening, setOpening] = useState<Opening>("waiting");
  const [closing, setClosing] = useState<Closing | null>(null);
  const [irisStarted, setIrisStarted] = useState(false);
  const [openingChoice, setOpeningChoice] = useState<"sound" | "quiet" | null>(null);
  const [lighting, setLighting] = useState<LightingState | null>(null);
  const flightLock = useRef(false);
  const handedOff = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const music = useRef<ReturnType<typeof createSundialMusic> | null>(null);
  const sundial = useRef<HTMLDivElement>(null);
  const viewInterface = useRef<HTMLDivElement>(null);
  const mainActions = useRef<HTMLElement>(null);
  const sceneAction = useRef<HTMLDivElement>(null);
  const titleLight = useRef<HTMLSpanElement>(null);
  const openingVeil = useRef<HTMLDivElement>(null);
  const openingOptions = useRef<HTMLDivElement>(null);
  const moveFocus = useRef<"menu" | "preview" | null>(null);
  const clearFlight = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (handedOff.current) clearTravelEntry();
    handedOff.current = false;
    flightLock.current = false;
    setFlight(null);
    setHoverIndex(-1);
  }, []);
  const onReady = useCallback(() => setStatus("ready"), []);
  const onUnavailable = useCallback(() => setStatus("unavailable"), []);

  useEffect(() => {
    // Run after hydration so static HTML and the first render match.
    const opened = new Date();
    const timer = window.setTimeout(() => {
      setLighting((previous) => previous ?? {
        clock: { time: opened.valueOf(), runningSince: null },
        location: { ...equatorialSunrise(worldLightSnapshot(opened)), region: "Near the equator" },
      });
      const returning = entries.findIndex(({ id }) => id === window.history.state?.[RETURN_WINDOW]);
      setView({ preview: returning >= 0, index: returning });
      if (returning >= 0) setOpeningChoice("quiet");
      try {
        if (!document.createElement("canvas").getContext("webgl2")) onUnavailable();
      } catch { onUnavailable(); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [entries, onUnavailable]);

  useEffect(() => {
    if (opening !== "waiting" || status === "loading") return;
    if (status === "ready" && (!openingChoice || (openingChoice === "sound" && musicState !== "primed" && musicState !== "failed"))) return;

    function reveal() {
      if (status === "unavailable") {
        music.current?.dispose();
        music.current = null;
        setMusicState("paused");
        setOpening("done");
        return;
      }
      if (openingChoice === "sound" && musicState === "primed") {
        setMusicState(music.current?.startPrepared() ? "playing" : "failed");
      }
      if (reduced || selectedIndex >= 0 || !anchorIris(openingVeil.current, titleLight.current)) {
        setOpening("done");
        return;
      }
      setIrisStarted(true);
      setOpening("revealing");
    }

    let fade: Animation | undefined;
    let fadingOptions: HTMLDivElement | undefined;
    const frame = window.requestAnimationFrame(() => {
      const options = openingOptions.current;
      if (!options || reduced || status !== "ready" || selectedIndex >= 0) {
        reveal();
        return;
      }
      fadingOptions = options;
      options.inert = true;
      const opacity = Number(getComputedStyle(options).opacity);
      fade = options.animate({ opacity: [opacity, 0] }, { duration: 300, easing: "ease-in-out", fill: "forwards" });
      void fade.finished.then(reveal, () => {});
    });
    return () => {
      window.cancelAnimationFrame(frame);
      fade?.cancel();
      if (fadingOptions) fadingOptions.inert = false;
    };
  }, [musicState, opening, openingChoice, reduced, selectedIndex, status]);

  useEffect(() => {
    if (opening !== "revealing") return;
    const timer = window.setTimeout(() => setOpening("done"), 1450);
    return () => window.clearTimeout(timer);
  }, [opening]);

  const startClosingIris = useCallback(() => {
    const next = anchorIris(sundial.current, titleLight.current) ? "iris" : "covered";
    setClosing((phase) => phase === "controls" ? next : phase);
  }, []);

  useEffect(() => {
    if (closing === "controls") {
      const timer = window.setTimeout(startClosingIris, 440);
      return () => window.clearTimeout(timer);
    }
    if (closing === "iris") {
      const timer = window.setTimeout(() => setClosing("covered"), 1450);
      return () => window.clearTimeout(timer);
    }
    if (closing === "covered") {
      let frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          carrySundialLightToHome(() => setClosing(null));
          router.push("/");
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [closing, router, startClosingIris]);

  const lightCovering = closing === "iris" || closing === "covered";
  useEffect(() => {
    if (!lightCovering || musicState !== "playing") return;
    const frame = window.requestAnimationFrame(() => {
      music.current?.pause(850);
      setMusicState("paused");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lightCovering, musicState]);

  function selectLightLocation(location: MapLightLocation) {
    const now = performance.now();
    setLighting((current) => current && { location, clock: { time: sundialTimeAt(current.clock, now), runningSince: null } });
  }

  function toggleLightPlayback() {
    const now = performance.now();
    setLighting((current) => {
      if (!current) return current;
      const { clock } = current;
      return { ...current, clock: clock.runningSince === null
        ? { ...clock, runningSince: now }
        : { time: sundialTimeAt(clock, now), runningSince: null } };
    });
  }

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(preference.matches);
    const initial = window.setTimeout(sync, 0);
    preference.addEventListener("change", sync);
    return () => {
      window.clearTimeout(initial);
      preference.removeEventListener("change", sync);
    };
  }, []);

  const onMenu = useCallback(() => {
    if (flightLock.current) return;
    rememberReturnWindow(null);
    moveFocus.current = "menu";
    setHoverIndex(-1);
    setView((current) => ({ ...current, preview: false }));
  }, []);

  useEffect(() => {
    const maybeCancel = (event: KeyboardEvent) => {
      if (opening !== "done" || event.key !== "Escape" || event.defaultPrevented) return;
      if (flightLock.current) {
        if (!handedOff.current) clearFlight();
      } else if (selectedIndex >= 0) onMenu();
    };
    const onBack = () => {
      clearFlight();
      setClosing(null);
    };
    const onRestore = (event: PageTransitionEvent) => { if (event.persisted) onBack(); };
    window.addEventListener("keydown", maybeCancel);
    window.addEventListener("popstate", onBack);
    window.addEventListener("pageshow", onRestore);
    return () => {
      window.removeEventListener("keydown", maybeCancel);
      window.removeEventListener("popstate", onBack);
      window.removeEventListener("pageshow", onRestore);
    };
  }, [clearFlight, onMenu, opening, selectedIndex]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (moveFocus.current === "preview" && selectedIndex >= 0) {
      sceneAction.current?.focus({ preventScroll: true });
      moveFocus.current = null;
    } else if (moveFocus.current === "menu" && selectedIndex < 0) {
      mainActions.current?.focus({ preventScroll: true });
      moveFocus.current = null;
    }
  }, [selectedIndex]);

  useEffect(() => () => {
    music.current?.dispose();
    music.current = null;
  }, []);

  const toggleMusic = async (forOpening = false) => {
    if (!forOpening && musicState === "playing") {
      music.current?.pause();
      setMusicState("paused");
      return;
    }
    let player = music.current;
    try {
      player = music.current ??= createSundialMusic();
      setMusicState("loading");
      if (forOpening) await player.prepare();
      else await player.play();
      if (music.current === player) setMusicState(forOpening ? "primed" : "playing");
    } catch {
      if (music.current === player) setMusicState("failed");
    }
  };

  function enterQuietly() {
    setOpeningChoice("quiet");
    music.current?.dispose();
    music.current = null;
    setMusicState("paused");
  }

  const onHover = useCallback((index: number) => {
    if (!flightLock.current) setHoverIndex(index);
  }, []);

  const onStep = useCallback((direction: number) => {
    if (flightLock.current) return;
    setHoverIndex(-1);
    setView((current) => {
      const length = entries.length;
      if (!current.preview || length < 2) return current;
      return { ...current, index: (current.index + direction + length) % length };
    });
  }, [entries.length]);

  const onPreview = useCallback((index: number) => {
    if (!entries[index] || flightLock.current || status !== "ready") return;
    if (selectedIndex < 0) moveFocus.current = "preview";
    setHoverIndex(-1);
    setView({ preview: true, index });
  }, [entries, status, selectedIndex]);

  const onOpen = useCallback((index: number) => {
    const entry = entries[index];
    if (!entry || index !== selectedIndex || flightLock.current) return;
    setHoverIndex(-1);
    if (reduced || status !== "ready") {
      rememberReturnWindow(entry.id);
      rememberTravelLogSource(entry.href);
      router.push(entry.href);
      return;
    }
    flightLock.current = true;
    router.prefetch(entry.href);
    setFlight({ index, started: performance.now() });
    timers.current = [setTimeout(() => {
      handedOff.current = true;
      rememberReturnWindow(entry.id);
      beginTravelEntry(entry.href);
      router.push(entry.href);
      timers.current.push(setTimeout(clearFlight, 5500));
    }, PORTAL_DURATION)];
  }, [entries, selectedIndex, reduced, status, router, clearFlight]);

  const onActivateWindow = useCallback((index: number, ready: boolean) => {
    if (selectedIndex !== index) onPreview(index);
    else if (ready) onOpen(index);
  }, [selectedIndex, onPreview, onOpen]);

  const displayed = status === "ready" ? entries[view.index] : undefined;
  const selected = view.preview ? displayed : undefined;
  const covered = flight && pathname?.startsWith("/playground");

  return (
    <div ref={sundial} className="playground-page playground-sundial" lang="en" data-stage={selected ? "preview" : "menu"}
      data-flight={covered ? "" : undefined} data-opening={opening} data-iris-started={irisStarted || undefined} data-closing={closing}>
      <div inert={opening !== "done" || Boolean(closing)} aria-hidden={opening !== "done" || Boolean(closing) || undefined}>
        <div ref={sceneAction} className="playground-scene" aria-busy={status === "loading"}
          role={selected ? "button" : undefined} tabIndex={selected && !flight ? 0 : undefined}
          aria-label={selected ? `Open travelogue: ${selected.title}` : undefined} aria-disabled={flight ? true : undefined}
          onKeyDown={(event) => {
            if (!selected || event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
            event.preventDefault();
            onOpen(selectedIndex);
          }} onClick={(event) => {
            if (selected && event.target === event.currentTarget && event.detail === 0) onOpen(selectedIndex);
          }}>
          {status !== "unavailable" && lighting && (
            <SceneBoundary onUnavailable={onUnavailable}>
              <SundialScene entries={entries} selected={selectedIndex} flight={flight} hoverIndex={hoverIndex} reduced={reduced}
                lightClock={lighting.clock} lightLocation={lighting.location} titleLightRef={titleLight} interfaceRef={viewInterface}
                onHover={onHover} onActivateWindow={onActivateWindow} onStep={onStep} onReady={onReady} onUnavailable={onUnavailable} />
            </SceneBoundary>
          )}
        </div>
        <div className="playground-vignette" aria-hidden="true" />
        <div className="sundial-portal" aria-hidden="true" />
        <header className={selected ? "sr-only" : "sundial-heading"}>
          <h1 lang="fr">Atelier du <span className="sundial-vitrail" ref={titleLight}>
            <span className="sundial-title-air" aria-hidden="true">v<span className="sundial-title-i">i<span className="sundial-title-spark" /></span>trail</span>
            <em>vitrail</em>
          </span></h1>
        </header>
        <div ref={viewInterface} className="sundial-interface" data-camera-fade={status === "ready" && !reduced || undefined}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && event.animationName === "sundial-interface-out") startClosingIris();
          }}>
          <aside className="sundial-sidebar" aria-label="Workshop sidebar" inert={Boolean(flight)}>
            {status !== "unavailable" && lighting && (
              <SundialLightMap clock={lighting.clock} location={lighting.location}
                onSelect={selectLightLocation} onTogglePlayback={toggleLightPlayback} />
            )}
            <div className="sundial-credit">
              <p>Inspired by
                <a href="https://store.steampowered.com/app/4160210/The_Artisan_of_Glimmith/" target="_blank" rel="noopener noreferrer"
                  aria-label="The Artisan of Glimmith on Steam (opens in a new tab)">
                  <cite>The Artisan of Glimmith</cite><ArrowUpRight size={11} aria-hidden="true" />
                </a>
              </p>
              <div className="sundial-music-credit">
                <p>Music by sasakure.UK
                  <a href="https://www.youtube.com/watch?v=Ao4KwcZX16k" target="_blank" rel="noopener noreferrer"
                    aria-label="uzumakinoharu on YouTube (opens in a new tab)">
                    <cite>uzumakinoharu</cite><ArrowUpRight size={11} aria-hidden="true" />
                  </a>
                </p>
                {status === "ready" && (
                  <button className="sundial-sound" type="button" aria-label="Music" aria-pressed={musicState === "playing"}
                    aria-busy={musicState === "loading"} disabled={Boolean(flight) || musicState === "loading"}
                    title={musicState === "playing" ? "Pause music" : musicState === "failed" ? "Retry music" : "Play music"}
                    onClick={() => void toggleMusic()}>
                    {musicState === "playing" ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
                  </button>
                )}
              </div>
            </div>
            <div className="sundial-reading" aria-live="polite" inert={!selected}>
              {displayed && <article key={displayed.id}>
                <h2>{displayed.title}</h2>
                <p>{displayed.summary}</p>
              </article>}
            </div>
          </aside>
          {displayed && (
            <nav className="playground-logs sundial-preview-nav" aria-label="Browse windows" inert={!selected}>
              <button type="button" aria-label="Previous window" title="Previous window" disabled={Boolean(flight) || entries.length < 2}
                onClick={() => onStep(-1)}>←</button>
              <span aria-label={`Window ${view.index + 1} of ${entries.length}`}>{view.index + 1} / {entries.length}</span>
              <button type="button" aria-label="Next window" title="Next window" disabled={Boolean(flight) || entries.length < 2}
                onClick={() => onStep(1)}>→</button>
            </nav>
          )}
          <nav ref={mainActions} className="playground-logs sundial-menu-logs" aria-label="Travelogues" tabIndex={-1} inert={Boolean(selected)}>
            {entries.map(({ id, label, href }, index) => status === "unavailable"
              ? <Link key={id} href={href} onNavigate={() => rememberTravelLogSource(href)}>{label} <span aria-hidden="true">↗</span></Link>
              : <button key={id} type="button" aria-label={`Preview ${label}`} disabled={status !== "ready"} data-active={hoverIndex === index || undefined}
                  onPointerEnter={() => onHover(index)} onPointerLeave={(event) => { if (document.activeElement !== event.currentTarget) onHover(-1); }}
                  onFocus={() => onHover(index)} onBlur={() => onHover(-1)} onClick={() => onPreview(index)}>{label}</button>)}
          </nav>
          {selected ? (
            <button className="sundial-back" type="button" aria-label="Back to main menu" disabled={Boolean(flight)} onClick={onMenu}>
              <ArrowLeft size={30} aria-hidden="true" />
            </button>
          ) : (
            <Link className="sundial-back" href="/" aria-label="Back to homepage" onNavigate={(event) => {
              if (reduced) return;
              event.preventDefault();
              if (closing || opening !== "done") return;
              setHoverIndex(-1);
              setClosing("controls");
            }}>
              <ArrowLeft size={30} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      {opening !== "done" && (
        <div ref={openingVeil} className="sundial-opening" role={opening === "waiting" ? "dialog" : undefined}
          aria-label="Atelier entrance" aria-modal={opening === "waiting" ? true : undefined} aria-hidden={opening === "revealing"}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && event.animationName === "sundial-opening-iris") setOpening("done");
          }}>
          {opening === "waiting" && (
            <div className="sundial-opening-actions">
              <p className="sundial-opening-wait" role="status" aria-hidden={status !== "loading" || undefined}>
                <span>Gathering light…</span>
              </p>
              {status === "ready" && (
                <div className="sundial-opening-options" ref={openingOptions}>
                  <h2>Welcome to my TravelLog Garden</h2>
                  <div className="sundial-opening-buttons">
                    <button type="button" disabled={openingChoice === "sound"} onClick={() => {
                      setOpeningChoice("sound");
                      void toggleMusic(true);
                    }}>Enter with music</button>
                    <button type="button" onClick={enterQuietly}>Enter quietly</button>
                  </div>
                  <p className="sundial-opening-audio" role="status" aria-hidden={musicState !== "loading" || undefined}>Preparing music…</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {lightCovering && (
        <div className="sundial-opening sundial-closing" aria-hidden="true" onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "sundial-opening-iris") setClosing("covered");
        }} />
      )}
    </div>
  );
}
