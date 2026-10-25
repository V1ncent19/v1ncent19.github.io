import { LOG_STACKED_QUERY } from "./layout";

export function logFrame(element?: Element | null): HTMLElement | null {
  return element?.closest<HTMLElement>("[data-travel-log]") ?? document.querySelector("[data-travel-log]");
}

/** The map overlays the story only in the stacked layout. Never infer layout from height. */
export function readingPanel(element?: Element | null) {
  const vh = window.innerHeight;
  const frame = logFrame(element);
  const map = frame?.querySelector<HTMLElement>("[data-log-map]");
  const covered = window.matchMedia(LOG_STACKED_QUERY).matches && map
    ? Math.min(vh, Math.max(0, map.getBoundingClientRect().bottom)) : 0;
  return { top: covered, bottom: vh, height: Math.max(1, vh - covered) };
}

/** Navigation and timed journal sampling share this measured landing line. */
export function readingLine(element?: Element | null) {
  const panel = readingPanel(element);
  return panel.top > 0 ? panel.top + panel.height * 0.35 : window.innerHeight * 0.475;
}

export function scrollFraction() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

export function scrubDocument(fraction: number) {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo({ top: Math.min(1, Math.max(0, fraction)) * max, behavior: "instant" });
}
