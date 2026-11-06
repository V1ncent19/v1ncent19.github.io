# Travel content

`content/travel/<id>/` contains files a person edits: the hub card and each
trip's narrative. The folder name matches `card.json`'s `id` and the URL segment
(`/travel/<id>/` and `/travel/zh/<id>/`). `lib/travel/trips.ts` discovers cards
from these folders; no central card registry is needed.

```
content/travel/
  gallery/items.json        gallery text and photo metadata
  ptes-2025/               card.json, trip.json, scenes.json, attractions.json
  just-because/            card.json, story.json
  guatemala-2026/          card.json, story.json
  france-2024/             card.json, story.json
  egypt2026/               guide.md (direct URL only; no card.json)

generated/travel/
  ptes-2025/               sanitized track.json, diagnostics.json
  just-because/            page.json, route.json, anitabi-212278.json
  guatemala-2026/          data.json
  france-2024/             places.json, routes.json, archived research data

public/data/travel/
  ptes-2025/track.json     ignored runtime copy of the generated track
```

`generated/` is checked in: some inputs are private GPS or historical snapshots,
so a clean CI checkout cannot recreate every derivative. It is **not** a place
to edit prose. `out/` is Next.js's final static export and must not be used as a
source directory. `public/` holds assets the browser fetches by URL; the PTES
track keeps its existing URL because its 1.6 MB payload is too large to import
into the initial page bundle. `npm run sync:data` mirrors it byte for byte from
`generated/` during `predev` and `prebuild`.

## Editing a trip

| Trip | Edit | Generated data used by the page |
|---|---|---|
| PTES | `card.json`, `trip.json`, `scenes.json`, `attractions.json` | `generated/travel/ptes-2025/track.json` (fetched through the unchanged public URL) |
| Just Because! | `card.json`, `story.json` (title, overview, ending, per-stop notes) | `generated/travel/just-because/page.json` (stops, route, attribution) |
| Guatemala | `card.json`, `story.json` (chapters, prose, captions, camera) | `generated/travel/guatemala-2026/data.json` (GPS and photo placement) |
| France 2024 | `card.json`, `story.json` | `generated/travel/france-2024/places.json` and `routes.json` (marker positions and visit order) |

The definition in `lib/travel/log/definitions/<id>.ts` combines the authored
and generated files at build time. The two route files for each trip select that
definition and a language. Shared components do not import trip-specific data.

For new trips, add a `card.json`, a definition, and the thin English and Chinese
route pages. Keep prose in `content/`, derived map data in `generated/`, and
browser-fetched assets in `public/`. Preserve private GPS and original media in
ignored `assets-src/`; sanitize any coordinates before committing derivatives.

The common shell, layouts, transitions and mobile split are documented in
`structure_file/FEATURE_TRAVEL_LOG.md`. Trip-specific generation and privacy
rules are in `FEATURE_PILGRIMAGE.md`, `FEATURE_GUATEMALA_TERRAIN_LOG.md`, and
`content/travel/france-2024/README.md`.

`egypt2026/` is an unlisted itinerary draft at `/travel/egypt2026/`, not a
registered travel log. It has no `card.json`, so it does not appear in the
Travel hub, Blog, Recent Posts, or site navigation. `noindex` is a search
request, not access control; the page and repository content remain public.
