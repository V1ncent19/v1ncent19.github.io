# content/travel — one directory per trip

Each trip owns a directory. The directory name **is** the URL segment
(`/travel/<id>` and `/travel/zh/<id>`) and must match `card.json`'s `id` —
`lib/travel/trips.ts` throws at build time if they disagree.

```
content/travel/
  <id>/
    card.json      the /travel hub tile (title, blurb, dates, facts, cover…)
    ...            whatever else THAT trip's page needs (see below)
  gallery/
    items.json     the photo wall shown under "Stories & frames" on /travel
```

`gallery/` is **not** a trip — it has no `card.json`, so `lib/travel/trips.ts`
skips it. It sits here because the photo wall is part of the `/travel` page
(the standalone `/gallery` routes were removed 2026-09-28); the manifest is
maintained by `scripts/gallery.mjs` and rendered by `GalleryView`.

There is no `data/` subfolder and no reserved filename. A trip folder is flat,
and a JSON's role is declared in `scripts/sync-trip-data.mjs` rather than
implied by where it sits. (An earlier version mirrored "whatever is in
`<id>/data/`", which made a folder name carry the semantic — and its prune pass
once emptied `public/data/travel/ptes-2025/`. See the script header.)

`lib/travel/trips.ts` sweeps this directory for `card.json` — there is no
central registry to edit. Adding a trip means: create the folder with a
`card.json`, add `app/travel/<id>/page.tsx` + the `/zh` mirror. Cards are
sorted by `start` (oldest first, `id` as tiebreak) so the order is stable.

Two optional tile fields worth knowing (2026-10-17):

- `pinned: true` — pin the tile to the front of "Stories & frames". Default is
  **false**: an unpinned trip merges into the photo timeline at its `start`
  date, which is what a chronological wall should do. Only ptes-2025 is pinned;
  just-because rides the timeline.
- `cardCta` / `cardMeta` / `cardFacts` — override the hub tile's CTA / eyebrow /
  stat line when the trip-log defaults would misdescribe the trip. Leave them
  out and every trip reads "Read the log" (中文 "阅读旅行志"), which is the
  house default since 2026-10-17.

## The two shapes a trip can take

Trips are **not** forced into one layout, because the two pages load their data
completely differently — and that difference is forced by payload size, not by
taste.

### Trip-log shape (ptes-2025) — split by who edits the file

```
content/travel/ptes-2025/        (flat — six JSONs side by side)
  card.json              hub tile                      ┐
  trip.json              itinerary + day index         │
  scenes.json            narrative units               ├ IMPORTED at build time.
  attractions.json       POIs, optional per trip       │ One copy, in content/.
  diagnostics.json       GPS scrape row counts,        │ Edit these directly.
                         NOT rendered by the page      │
  track.json             GPS track, 1.6 MB (93% of     ┘ FETCHED — mirrored out
                         the payload); still lives        by `sync:data`, the
                         here, edited by nobody           only file so treated
public/data/travel/ptes-2025/track.json    GENERATED — gitignored, do not edit
```

**`track.json` sits in the same folder as the rest, and that is fine**, because
"needs a URL" is not expressed by location — it is one line in
`scripts/sync-trip-data.mjs`:

```js
const MIRRORED = new Set(["ptes-2025/track.json"]);
```

**The split follows "who edits it", not "what type of file it is".**

- **Hand-written → imported.** `trip`/`scenes`/`attractions`/`diagnostics` are
  ~115 KB together. `TravelLog` imports them, they land in the JS bundle, and
  they need no URL and no copy — so there is exactly one copy and it is the one
  you open to edit.
- **Machine output → fetched.** `track.json` is 1639 KB of GPS scrape output.
  Nobody types it. Inlining it would put 1.6 MB into the bundle, make the page
  wait for it, and grow with every trip added — so it is fetched from
  `public/data/travel/<id>/` after mount.

On the PTES page, a reading line at 47.5% of the viewport selects the active
story section. A single damped document-space reading line drives both the
marker timeline and camera-key interpolation, so the map cannot use raw scroll
progress while the marker follows a delayed clock. Camera center and zoom share
one response curve. Narrative time uses monotone cubic interpolation between
scene anchors, keeping marker speed continuous as one section hands off to the
next. Chapter positions are rebuilt when layout changes and looked up by
binary search during scroll. Camera transitions keep the same pair of scene
keys throughout the full blend window, including when the reading line crosses
a chapter boundary; the marker-visibility clamp fades across that same window.
This prevents a mid-transition key-pair swap from snapping the camera at
handoffs such as Evanston → Transit. GPS scenes anchor the camera to their
padded route bounds rather than the live marker, so small GPS turns and drift
do not shake the map. The visibility clamp nudges the frame only when the
marker approaches the viewport edge.

Only the files listed in `MIRRORED` are copied. `npm run sync:data` — run
automatically by `prebuild` and `predev` — copies them byte for byte, and
`--check` fails if the two disagree. Editing the `public/` copy leaves a dirty
tree whose only outcome is an overwrite on the next build.

Every other `*.json` in the trip folder is a build-time import and must never
have a `public/` twin — two copies means the site ships both and the one you
edit may not be the one served. `scripts/sync-trip-data.mjs` fails the build if
one appears, and it checks *before* its prune pass so the file is reported
rather than deleted.

**Privacy:** anything under `public/` ships. Run
`scripts/sanitize-trip-gps.py content/travel/<id>` first — it trims the
home-area head/tail of the GPS track (2026-09-26 rule). Point it at the source,
not the mirror: `sync:data` would regenerate the mirror from the unsanitized
source on the next build. Note the script anchors on the track's first point,
which is wrong for a loop-shaped walk.

### Pilgrimage shape (just-because) — data is IMPORTED at build time

```
content/travel/just-because/
  card.json              hub tile
  page.json              what the page imports (~42 KB) — GENERATED, but holds
                         your prose (see below)
public/data/travel/just-because/     COMMITTED — generator outputs, not artifacts
  route.json             sanitized track         (scripts/pilgrimage-route.mjs)
  anitabi-212278.json    upstream point snapshot (scripts/anitabi-points.mjs)
public/assets/photos/pilgrimage/just-because/
  compare/*.webp         the 36 shipped composites
  cover.png              hub hover cover
```

The whole rendered payload is ~42 KB, so the page imports `page.json` directly
and `loadPilgrimage()` validates its shape at build time — a malformed generator
run fails the build instead of shipping an empty map.

**`page.json` is the one file here that mixes generated and hand-written
content.** Everything except `overview`, `outro` and each stop's `note` is
rewritten on every run of `scripts/pilgrimage-map.mjs`; those three are carried
over from the previous output. So you edit your prose in `page.json` and can
re-run the generator without losing it.

The two `public/data/travel/just-because/` files are generator **outputs**, and
they are committed on purpose — the opposite of ptes's `track.json`. Neither can
be rebuilt from anything in the repo: `route.json` is cut from a raw GPS export
that lives gitignored under `assets-src/travel-data/`, and `anitabi-212278.json`
is a snapshot of a remote dataset as it existed on one day. They live beside the
generated payload because nobody hand-edits them — same reason as ptes's track,
different reason they must not be deleted.

The hand-made composites (36 JPG masters, ~30 MB) live in
`assets-src/pilgrimage-masters/just-because/` and are **committed** — they are
the only copy of that work. The raw phone photos they were composited from are
gone. `photos.json` (the position source of truth) stays gitignored under
`assets-src/travel-data/pilgrimage/`.

## Generator pipeline (pilgrimage)

```
assets-src/travel-data/gps/*.csv
  └─ pilgrimage-route.mjs ──→ public/data/travel/just-because/route.json
anitabi dataset (network)
  └─ anitabi-points.mjs  ──→ public/data/travel/just-because/anitabi-212278.json
public/assets/photos/pilgrimage/<id>/compare/*.webp + photos.json + both above
  └─ pilgrimage-map.mjs  ──→ content/travel/just-because/page.json
```

Every script has a sensible default for all of these paths — running
`node scripts/pilgrimage-map.mjs` with no flags works from the repo root.
