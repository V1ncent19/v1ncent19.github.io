"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { LogChapter, LogLang } from "@/lib/travel/log/types";
import { TERRAIN_COMPLETE_SCENE_ID, TERRAIN_INTRO_SCENE_ID, type TerrainTravelData } from "@/lib/travel/terrain";
import type { TerrainReadingState } from "./TerrainTravelLog";
import ChapterNavigation from "./log/ChapterNavigation";
import { MAP_SPLIT_EVENT } from "@/lib/travel/map-split";

function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }

export default function TerrainStory({ data, lang, reading, onReading, focus }: {
  data: TerrainTravelData;
  lang: LogLang;
  reading: TerrainReadingState;
  onReading: (state: TerrainReadingState) => void;
  focus: { id: string; nonce: number } | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(reading);
  const photos = useMemo(() => new Map(data.photos.map(photo => [photo.id, photo])), [data.photos]);
  const chapters = useMemo<LogChapter[]>(() => data.scenes.map((scene, index) => ({
    id: scene.id,
    label: scene.title,
    shortLabel: String(index + 1).padStart(2, "0"),
    detail: scene.eyebrow,
    meta: scene.time,
    sectionId: scene.id,
  })), [data.scenes]);

  useEffect(() => {
    if (!focus) return;
    const target = rootRef.current?.querySelector<HTMLElement>(`[data-log-section="${focus.id}"]`);
    if (!target) return;
    const stacked = window.matchMedia("(max-width: 1023px)").matches;
    const mapBottom = stacked ? document.querySelector<HTMLElement>(".terrain-map-col")?.getBoundingClientRect().bottom ?? 0 : 0;
    window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - (stacked ? mapBottom + 24 : 28)), behavior: "smooth" });
  }, [focus]);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      const sections = [...root.querySelectorAll<HTMLElement>("[data-terrain-scene]")];
      if (!sections.length) return;
      const stacked = window.matchMedia("(max-width: 1023px)").matches;
      const mapBottom = stacked ? document.querySelector<HTMLElement>(".terrain-map-col")?.getBoundingClientRect().bottom ?? 0 : 0;
      const panelTop = stacked && mapBottom > 0 && mapBottom < window.innerHeight - 100 ? mapBottom : 0;
      const line = panelTop + (window.innerHeight - panelTop) * 0.42;
      let active = sections[0];
      let distance = Infinity;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const d = line < rect.top ? rect.top - line : line > rect.bottom ? line - rect.bottom : 0;
        if (d < distance) { distance = d; active = section; }
      }
      const rect = active.getBoundingClientRect();
      const sceneId = active.dataset.terrainScene;
      const scene = data.scenes.find(item => item.id === sceneId);
      const intro = sceneId === TERRAIN_INTRO_SCENE_ID;
      const local = clamp01((line - rect.top) / Math.max(1, rect.height));
      const routeIndex = scene ? scene.route[0] + (scene.route[1] - scene.route[0]) * local
        : intro ? 0 : data.route.points.length - 1;
      let photoId: string | null = null;
      let photoDistance = 150;
      for (const figure of active.querySelectorAll<HTMLElement>("[data-terrain-photo]")) {
        const r = figure.getBoundingClientRect();
        const center = (r.top + r.bottom) / 2;
        const d = Math.abs(center - line);
        if (d < photoDistance || (r.top <= line && r.bottom >= line)) {
          photoId = figure.dataset.terrainPhoto ?? null;
          photoDistance = d;
        }
      }
      const next = { sceneId: scene?.id ?? (intro ? TERRAIN_INTRO_SCENE_ID : TERRAIN_COMPLETE_SCENE_ID), routeIndex, photoId };
      const previous = lastRef.current;
      if (previous.sceneId !== next.sceneId || previous.photoId !== next.photoId || Math.abs(previous.routeIndex - next.routeIndex) > 0.08) {
        lastRef.current = next;
        onReading(next);
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener(MAP_SPLIT_EVENT, schedule);
    const observer = new ResizeObserver(schedule);
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(MAP_SPLIT_EVENT, schedule);
    };
  }, [data.scenes, data.route.points.length, onReading]);

  // Match PTES' chapter grammar: the active chapter bar lights up, sticks to
  // the reading edge, and is naturally pushed away by the next chapter.
  useEffect(() => {
    let raf = 0;
    const updatePinned = () => {
      const root = rootRef.current;
      if (root) {
        for (const block of root.querySelectorAll<HTMLElement>(".terrain-chapter-block")) {
          const bar = block.querySelector<HTMLElement>(".terrain-chapter-bar");
          if (!bar) continue;
          const stickyTop = parseFloat(getComputedStyle(bar).top) || 0;
          block.classList.toggle("pinned", Math.abs(bar.getBoundingClientRect().top - stickyTop) <= 2);
        }
      }
      raf = requestAnimationFrame(updatePinned);
    };
    raf = requestAnimationFrame(updatePinned);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeSceneIndex = data.scenes.findIndex(scene => scene.id === reading.sceneId);

  return <div className="terrain-story-col">
    <div className="terrain-inner" ref={rootRef}>
    <header className="terrain-hero" data-terrain-scene={TERRAIN_INTRO_SCENE_ID}>
      <p className="terrain-kicker">{data.dateLabel} · Guatemala</p>
      <h1>{data.title}</h1>
      <p className="terrain-subtitle">{data.subtitle}</p>
      <p className="terrain-intro">{data.introduction}</p>
      <dl className="terrain-facts">
        <div><dt>{lang === "zh" ? "最高海拔" : "Highest point"}</dt><dd>{data.route.maxAltitudeM.toLocaleString()} m</dd></div>
        <div><dt>{lang === "zh" ? "累计爬升" : "Elevation gain"}</dt><dd>{data.route.ascentM.toLocaleString()} m</dd></div>
        <div><dt>{lang === "zh" ? "路线记录" : "Route samples"}</dt><dd>{data.route.points.length}</dd></div>
      </dl>
      <span className="terrain-scroll-cue" aria-hidden="true">↓</span>
    </header>

    <main className="terrain-scenes">
      {data.scenes.map((scene, sceneIndex) => {
        const active = scene.id === reading.sceneId;
        const done = reading.sceneId === TERRAIN_COMPLETE_SCENE_ID || (activeSceneIndex >= 0 && sceneIndex < activeSceneIndex);
        const fill = done ? 100 : active
          ? clamp01((reading.routeIndex - scene.route[0]) / Math.max(1, scene.route[1] - scene.route[0])) * 100
          : 0;
        return <div key={scene.id} id={scene.id} data-log-section={scene.id} data-terrain-scene={scene.id}
          className={`terrain-chapter-block${active ? " active" : ""}${done ? " done" : ""}`}
          style={{ "--chapter-fill": `${fill.toFixed(1)}%` } as CSSProperties}>
          <div className={`terrain-chapter-bar${active ? " on" : ""}`}>
            <span className="terrain-chapter-fill" aria-hidden="true" />
            <span className="terrain-chapter-dot" aria-hidden="true" />
            <span className="terrain-chapter-label">{scene.eyebrow}</span>
            <span className="terrain-chapter-title">{scene.title}</span>
            <time>{scene.time}</time>
          </div>
          <article className="terrain-scene">
            <header className="terrain-scene-head"><h2>{scene.title}</h2></header>
            {scene.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            <div className="terrain-photo-stack">
              {scene.photos.map(item => {
                const photo = photos.get(item.id);
                if (!photo) return null;
                return <figure key={item.id} data-terrain-photo={item.id} className="terrain-story-photo" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} width={photo.width} height={photo.height} loading={sceneIndex < 2 ? "eager" : "lazy"} alt={item.caption} />
                  <figcaption><span>{item.caption}</span><small>{photo.shotAt.slice(11, 16)} · {photo.altitudeM.toLocaleString()} m</small></figcaption>
                </figure>;
              })}
            </div>
          </article>
        </div>;
      })}
    </main>
    <footer className="terrain-outro" data-terrain-scene={TERRAIN_COMPLETE_SCENE_ID}><span>ANTIGUA · ACATENANGO · FUEGO</span><p>{lang === "zh" ? "回到 Antigua，火山仍然醒着。" : "Back in Antigua, the volcano remains awake."}</p></footer>
    </div>
    <ChapterNavigation chapters={chapters} activeId={reading.sceneId} scopeRef={rootRef} kind="terrain" lang={lang} title={data.title} />
  </div>;
}
