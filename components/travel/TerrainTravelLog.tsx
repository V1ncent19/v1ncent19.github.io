"use client";

import { useCallback, useState } from "react";
import type { LogLang, TerrainDefinition } from "@/lib/travel/log/types";
import TravelLogShell from "./log/TravelLogShell";
import TerrainMap from "./TerrainMap";
import TerrainStory from "./TerrainStory";
import { TERRAIN_INTRO_SCENE_ID } from "@/lib/travel/terrain";

export interface TerrainReadingState {
  sceneId: string;
  routeIndex: number;
  photoId: string | null;
}

export default function TerrainTravelLog({ log, lang }: { log: TerrainDefinition; lang: LogLang }) {
  const [reading, setReading] = useState<TerrainReadingState>({
    sceneId: TERRAIN_INTRO_SCENE_ID,
    routeIndex: log.data.scenes[0]?.route[0] ?? 0,
    photoId: null,
  });
  const [mapReady, setMapReady] = useState(false);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const navigate = useCallback((id: string) => setFocus(current => ({ id, nonce: (current?.nonce ?? 0) + 1 })), []);

  return <TravelLogShell
    kind="terrain"
    id={log.id}
    wordmark={log.wordmark}
    lang={lang}
    dataReady
    mapReady={mapReady}
    map={<TerrainMap data={log.data} reading={reading} lang={lang} onMapReady={() => setMapReady(true)} onNavigateScene={navigate} />}
    story={<TerrainStory data={log.data} lang={lang} reading={reading} onReading={setReading} focus={focus} />}
  />;
}
