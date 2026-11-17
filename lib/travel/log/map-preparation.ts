import type { Map as MapLibreMap } from "maplibre-gl";

export type LogMapPhase = "loading" | "ready" | "failed";
export type ReportLogMap = (phase: Exclude<LogMapPhase, "loading">) => void;

/** Register after installing the initial layers and positioning the camera. */
export function whenInitialTravelMapPaints(map: MapLibreMap, onPaint: () => void) {
  const checkFrame = () => {
    if (!map.isStyleLoaded() || !map.areTilesLoaded() || map.isMoving()) return;
    map.off("render", checkFrame);
    onPaint();
  };
  // Paint animations can keep loaded() false and prevent idle indefinitely.
  // Check source/style readiness after drawing, independently of paint changes.
  map.on("render", checkFrame);
  map.triggerRepaint();
}
