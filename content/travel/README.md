# content/travel — one directory per trip

Each trip owns a directory. The directory name **is** the URL segment
(`/travel/<id>` and `/travel/zh/<id>`) and must match `card.json`'s `id` —
`lib/travel/trips.ts` throws at build time if they disagree.

```
content/travel/
  <id>/
    card.json      the /travel hub tile (title, blurb, dates, facts, cover…)
    ...            whatever else THAT trip's page needs (see below)
```

`lib/travel/trips.ts` sweeps this directory for `card.json` — there is no
central registry to edit. Adding a trip means: create the folder with a
`card.json`, add `app/travel/<id>/page.tsx` + the `/zh` mirror. Cards are
sorted by `start` (oldest first, `id` as tiebreak) so the order is stable.

## The two shapes a trip can take

Trips are **not** forced into one layout, because the two pages load their data
completely differently — and that difference is forced by payload size, not by
taste.

### Trip-log shape (ptes-2025) — data is FETCHED at runtime

```
content/travel/ptes-2025/
  card.json
public/data/travel/ptes-2025/      ← ships to the web, fetched by the browser
  trip.json  track.json  scenes.json  attractions.json  diagnostics.json
```

`track.json` alone is ~1.7 MB. Importing it at build time would bake it into a
JS chunk and make the page wait for it, so `TravelLog` fetches from
`public/data/travel/<id>/` after mount. The cost of this shape is that the
payload lives under `public/` rather than beside `card.json`.

**Privacy:** anything under `public/` ships. Run
`scripts/sanitize-trip-gps.py` on the trip folder first — it trims the
home-area head/tail of the GPS track (2026-09-26 rule).

### Pilgrimage shape (just-because) — data is IMPORTED at build time

```
content/travel/just-because/
  card.json              hub tile
  page.json              what the page imports (~44 KB)
  source/                generator INPUTS — do not hand-edit
    route.json           sanitized track        (scripts/pilgrimage-route.mjs)
    anitabi-212278.json  upstream point snapshot (scripts/anitabi-points.mjs)
public/assets/pilgrimage/just-because/
  compare/*.webp         the 36 shipped composites
  card/*.webp            hub hover cover
```

The whole payload is ~44 KB, so the page imports `page.json` directly and
`loadPilgrimage()` validates its shape at build time — a malformed generator run
fails the build instead of shipping an empty map.

`source/` holds what the generators *read*; everything outside it is either
what the page renders (`page.json`) or what the site serves (`public/`). The
distinction matters because `page.json` is **generated** — hand-editing it gets
overwritten, except for `overview`, `outro` and each stop's `note`, which
`scripts/pilgrimage-map.mjs` preserves from the previous output.

Full-resolution photo masters with EXIF GPS live in `assets-src/photos/` and are
gitignored — they never ship and are not part of this tree.

## Generator pipeline (pilgrimage)

```
assets-src/travel-data/gps/*.csv
  └─ pilgrimage-route.mjs ──→ source/route.json
anitabi dataset (network)
  └─ anitabi-points.mjs  ──→ source/anitabi-212278.json
public/assets/pilgrimage/<id>/compare/*.webp + photos.json + both above
  └─ pilgrimage-map.mjs  ──→ page.json
```

Every script has a sensible default for all of these paths — running
`node scripts/pilgrimage-map.mjs` with no flags works from the repo root.
