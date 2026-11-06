# Europe 2024: reconstructed travel log

This is a draft public derivative of the author's reviewed handwritten journal and timetable. The public map shows **place markers only**. It does not draw walking, metro, rail, boat, or schematic connections. The original scans, full review exports, exact accommodation addresses, and source annotations stay in the private review workspace.

| File | Purpose |
|---|---|
| `card.json` | Featured Travel card and draft label; no pinned badge |
| `story.json` | Twelve days, 67 reading chapters from 80 reviewed manuscript fragments, and timetable anchors |
| `generated/travel/france-2024/places.json` | Public landmark, restaurant and station-area coordinates, source and precision |
| `generated/travel/france-2024/routes.json` | Archived 135-leg reviewed place ledger; used at build time only to order each day's markers |
| `generated/travel/france-2024/{route,metro}-geometries.json` | Archived navigation and track candidates; **not imported by the site** |
| `generated/travel/france-2024/*-source-cache.json` | Archived public routing and rail source responses; no site runtime calls |
| `generated/travel/france-2024/geocode-cache.json`, `geocode-review.csv` | One-time public place lookup and matching review |

The site derives a compact ordered place-ID list for each day from the reviewed ledger and any story block focus places. The client receives this list and the public place records, never route geometry. Daily markers carry no numbers; the overview marks Paris, Köln, Amsterdam and Rouen. Clicking a marker navigates to its restaurant review or diary block when one exists. The timetable remains available below each day's prose. Unlocated private stays and uncertain boarding points have no marker. Marker positions are reviewed public-place coordinates, not recorded GPS visits.

The map uses small unnumbered place dots, with collision-aware labels at city zoom. Blue circles mark general places, terracotta rounded squares mark the eight located dining places, and muted circles mark transit points; the lower-left legend renders those marker shapes. The existing `Fr2024Cuisine.md` blog article is parsed at build time by `lib/travel/log/definitions/france-cuisine.ts`: all 16 reviews appear once in visit-day reading order, with a short return-visit pointer for the second Café du Marché meal. Each full review links directly to its heading in the original blog post. The visit metadata records date, meal, known timetable hour and the preceding story block; menu and price lines are styled separately from commentary without rewriting the source. Les Rupins is placed on March 14 evening, Bouillon République on March 15 lunch, and Pierre Hermé on March 17 after the Opéra visit per the author's later correction. The exact time and position within March 15 of Bouillon République remain unverified; the current placement after Versailles is editorial. The 8 locations without reliable public coordinates have no invented marker.

The reading chapters combine adjacent manuscript fragments about the same place or episode. Original Chinese/French place-name lines are chapter titles, not repeated in the body. Each day displays a Chinese title, foreign-language subtitle and cleaned manuscript weather; the sticky capsule carries the day number, Chinese title and date. All 80 previously displayed blocks remain traceable through 85 source IDs: 79 in daily chapters or day metadata, and six across five afterword blocks. Source IDs are retained in JSON but hidden from the reading page, as are empty timetable controls. The editorial rules and the author's Pierre Hermé timetable correction live in `scripts/france_2024_editorial.py` and are applied whenever `scripts/build-france-2024.py` regenerates the public story.

The header uses the same centered reading column as the daily chapters. The manual-map resume control is shared with PTES, with a Chinese label on the Chinese route. Internal timetable correction notes remain in the data but are not shown as travel prose. The public introduction and closing copy use travelogue language; manuscript text retains the author's wording apart from spacing and typographic corrections. The builder applies Chinese/Latin spacing to displayed diary and timetable text on regeneration.

The top-right map controls now match PTES: the shared page appearance selector plus toggled satellite/terrain basemaps. They keep their position while the reader drags the map; the resume button alone returns the camera to the story. Returning to the introduction restores the four-city overview. The header has no bottom divider.

The twelve day subtitles follow the author's revised Chinese headings and are defined in `scripts/build-france-2024.py`. Artworks and other titled works use `『』`. The Orsay passage pairs sixteen titles with the manuscript's parallel artist list; the fifteenth attribution is corrected from Courbet to Thomas Couture using the Musée d'Orsay collection record. These display edits are preserved in `scripts/france_2024_editorial.py` when the private review is rebuilt.

To rebuild after manuscript or place corrections:

1. Update the private reconciled review and `route-ledger-v2.json` outside the repository. Do not copy originals or exact lodging addresses here.
2. Review public place aliases, coordinates and ambiguous matches in `generated/travel/france-2024/geocode-review.csv`. If the cache changes, run `python scripts/build-france-2024-places.py`.
3. Run `python scripts/build-france-2024.py --review-dir <private-review-dir>` to regenerate `content/travel/france-2024/story.json` and `generated/travel/france-2024/routes.json`; the editorial grouping runs automatically. Inspect date, order, source IDs and privacy. The route ledger still supplies marker order, but does not become a visible route.
4. If the cuisine article changes, confirm its headings still match `france-cuisine.ts` and recheck date/place mapping. The page builder fails if a new review has no mapping.
5. Build the site, then run `scripts/check-france-2024.mjs` with Playwright/Chrome. Check both languages at desktop and mobile widths, marker navigation, inline dining order, timetable display and rail placement.

Place lookup used public OpenStreetMap Nominatim results under its [usage policy](https://operations.osmfoundation.org/policies/nominatim/). The basemap uses CARTO tiles with visible [CARTO](https://carto.com/attribution/) and [OpenStreetMap](https://www.openstreetmap.org/copyright) attribution. The page makes no runtime geocoding or routing requests.
