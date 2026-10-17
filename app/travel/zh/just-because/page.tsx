import type { Metadata } from "next";
import PilgrimageLog from "@/components/travel/PilgrimageLog";
import raw from "@/content/travel/just-because/page.json";
import type { PilgrimageData } from "@/lib/travel/pilgrimage";

export const metadata: Metadata = {
  title: "【Just Because!】圣地巡礼 — 藤泽 · 镰仓",
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
 *
 * Kept in step with app/travel/just-because/page.tsx — the two routes render
 * the same component from the same data, so they must fail the same way.
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
 * Chinese mirror of the pilgrimage page (2026-10-16). Same data, same
 * component — only the back-link target differs, so it returns to the Chinese
 * travel hub rather than the English one.
 */
export default function JustBecauseZhPage() {
  return (
    <>
      {/*
        Pre-paint immersive flag, same contract as the trip pages: the static
        export ships visible site chrome, and PilgrimageLog only adds
        body.pj-immersive in a hydration-time effect — without this parse-time
        script the header/footer flash for a frame on entry.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(document.body)document.body.classList.add("pj-immersive","tl-immersive");}catch(e){}',
        }}
      />
      <PilgrimageLog
        data={data}
        backHref="/travel/zh"
        backLabel="返回旅行志"
        lang="zh"
      />
    </>
  );
}
