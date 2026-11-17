"use client";

import { useCallback, useState } from "react";
import type { LogLang, ReconstructedDefinition } from "@/lib/travel/log/types";
import type { LogMapPhase } from "@/lib/travel/log/map-preparation";
import TravelLogShell from "./log/TravelLogShell";
import ReconstructedMap from "./ReconstructedMap";
import ReconstructedStory from "./ReconstructedStory";

export interface ReconstructedReading {
  dayId: string;
  placeId: string | null;
}

export default function ReconstructedTravelLog({ log, lang }: { log: ReconstructedDefinition; lang: LogLang }) {
  const [reading, setReading] = useState<ReconstructedReading>({ dayId: "intro", placeId: null });
  const [mapPhase, reportMap] = useState<LogMapPhase>("loading");
  const [focus, setFocus] = useState<{ dayId: string; placeId: string | null; nonce: number } | null>(null);
  const navigate = useCallback((dayId: string, placeId: string | null = null) => {
    setFocus(current => ({ dayId, placeId, nonce: (current?.nonce ?? 0) + 1 }));
    setReading({ dayId, placeId });
  }, []);

  return <TravelLogShell
    kind="reconstructed"
    id={log.id}
    wordmark={log.wordmark}
    lang={lang}
    dataReady
    mapPhase={mapPhase}
    map={<ReconstructedMap data={log.data} reading={reading} lang={lang} onMapPrepared={reportMap} onNavigate={navigate} />}
    story={<ReconstructedStory data={log.data} lang={lang} reading={reading} onReading={setReading} focus={focus} />}
  />;
}
