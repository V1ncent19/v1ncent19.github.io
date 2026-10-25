"use client";

import { useEffect, useState } from "react";
import type { TripTrack } from "@/lib/travel/types";
import type { JournalDefinition, LogLang } from "@/lib/travel/log/types";
import { useStoryController } from "@/lib/travel/use-story-controller";
import TravelLogShell, { TravelLogStatus } from "./log/TravelLogShell";
import TravelMap from "./TravelMap";
import TravelStory from "./TravelStory";

/** Journal variant: timed narrative and GPS processing stay independent. */
export default function TravelLog({ log, lang }: { log: JournalDefinition; lang: LogLang }) {
  const { trip, scenes, attractions, trackUrl } = log;
  const [track, setTrack] = useState<TripTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch(trackUrl, { signal: abort.signal })
      .then(r => { if (!r.ok) throw new Error(`track.json → HTTP ${r.status}`); return r.json(); })
      .then((loaded: TripTrack) => {
        if (!Array.isArray(loaded.points) || !loaded.points.length) throw new Error("Empty GPS track");
        for (const p of loaded.points) p.ts = Date.parse(p.t);
        if (loaded.points.some(p => !Number.isFinite(p.ts) || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)))
          throw new Error("Invalid GPS point");
        loaded.points.sort((a, b) => a.ts - b.ts);
        if (!abort.signal.aborted) setTrack(loaded);
      })
      .catch(e => { if (!abort.signal.aborted) setError(String(e)); });
    return () => abort.abort();
  }, [trackUrl]);
  const { state, registerSection, enterExplore, resumeStory, readTime } = useStoryController(trip, track, scenes);
  return <TravelLogShell kind="journal" id={log.id} wordmark={log.wordmark} lang={lang} legacyStorageKey={log.legacySplitKey}
    dataReady={!!track} mapReady={mapReady} failed={!!error}
    map={track && <TravelMap trip={trip} track={track} scenes={scenes} attractions={attractions}
      state={state} onUserInteract={enterExplore} onResume={resumeStory} onMapReady={() => setMapReady(true)} lang={lang} />}
    story={track && <TravelStory trip={trip} scenes={scenes} registerSection={registerSection} activeSceneId={state.activeSceneId} lang={lang} readTime={readTime} />}>
    {(error || !track) && <TravelLogStatus error={error} />}
  </TravelLogShell>;
}
