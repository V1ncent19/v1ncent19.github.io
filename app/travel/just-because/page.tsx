import type { Metadata } from "next";
import PilgrimageLog from "@/components/travel/PilgrimageLog";
import raw from "@/content/travel/just-because/page.json";
import type { PilgrimageData } from "@/lib/travel/pilgrimage";

export const metadata: Metadata = {
  title: "Just Because! — 圣地巡礼",
  description:
    "2026 年 9 月 21 日，沿着《Just Because!》的取景地骑行藤泽与镰仓。36 组实景与动画画面对比。",
};

/**
 * Validate the generated JSON at BUILD time.
 *
 * Importing the file (rather than fetching it) already gives us type checking,
 * but resolveJsonModule widens `[lon, lat]` pairs to `number[]`, so a plain
 * assertion would paper over exactly the shape we care about. Checking the
 * fields by hand here means a malformed pilgrimage-map.mjs run fails the build
 * loudly instead of shipping a page that renders an empty map.
 */
function loadPilgrimage(): PilgrimageData {
  const d = raw as unknown as PilgrimageData;
  const bad: string[] = [];
  if (!Array.isArray(d.stops) || d.stops.length === 0) bad.push("stops");
  if (!Array.isArray(d.route?.coordinates) || d.route.coordinates.length < 2)
    bad.push("route.coordinates");
  if (
    d.route?.coordinates?.some(
      (c) => !Array.isArray(c) || c.length !== 2 || typeof c[0] !== "number" || typeof c[1] !== "number",
    )
  )
    bad.push("route.coordinates entries (each must be [lon, lat])");
  if (d.route && d.route.offsets?.length !== d.route.coordinates?.length)
    bad.push("route.offsets (must be index-aligned with coordinates)");
  if (d.stops?.some((s) => !s.id || !s.src || typeof s.lat !== "number" || typeof s.lon !== "number"))
    bad.push("stops[] (each needs id, src, lat, lon)");
  // routeIdx is what the map draws from; a stop without it would silently
  // park the bright line at zero.
  if (d.stops?.some((s) => typeof s.routeIdx !== "number"))
    bad.push("stops[] routeIdx (run scripts/pilgrimage-map.mjs)");
  if (bad.length)
    throw new Error(
      `content/travel/just-because/page.json is malformed — check ${bad.join(", ")}. ` +
        "Re-run: node scripts/pilgrimage-map.mjs",
    );
  return d;
}

const data = loadPilgrimage();

/**
 * Pilgrimage page (2026-10-16). Data is imported at BUILD time rather than
 * fetched — the payload is ~34 KB, and importing it keeps it checked against
 * lib/travel/pilgrimage.ts. (Nothing here is secret: the route is a sanitized
 * polyline and the stop coordinates are deliberately rounded.)
 */
export default function JustBecausePage() {
  return (
    <>
      {/*
        Pre-paint immersive flag, same contract as the trip pages: the static
        export ships visible site chrome, and PilgrimageLog only adds
        body.pj-immersive in a hydration-time effect — without this parse-time
        script the header/footer flash for a frame on entry.

        v19 (2026-10-24): also sets pj-boot, the entry curtain. It has to be a
        PARSE-TIME class, not a React node — the page used to show a bare
        unstyled frame (and, before the data was inlined, a loading string)
        for the whole mount. globals.css paints the curtain off this class
        from the very first frame; PilgrimageLog adds pj-veil-open once the
        map reports ready, and the retract collapses toward the right edge —
        the time-reverse of the back button's blue wipe.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(document.body){document.body.classList.add("pj-immersive","tl-immersive");'
            + 'if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)'
            + 'document.body.classList.add("pj-boot");}}catch(e){}',
        }}
      />
      <PilgrimageLog data={data} backHref="/travel" backLabel="Back to Travel" />
    </>
  );
}
