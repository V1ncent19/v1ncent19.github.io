# Adding Gallery Photos — Workflow

How to add new photos (new trips, or digitised/old shots being organised) to the
Gallery. The live reference for every rule below is `scripts/gallery.mjs`
(`npm run gallery:gen`); if this doc and the script ever disagree, the script wins.

## The three-step loop

```text
1. Drop full-res originals into GalleryPhoto/   (git-ignored, never pushed)
2. npm run gallery:gen                          (writes webp tiers + merges items.json)
3. Fill the human fields in content/gallery/items.json, then build/preview
```

## 1. Originals → GalleryPhoto/

- **Accepted formats:** JPEG and PNG only (the script filters `\.jpe?g$|\.png$`).
  iPhone HEIC files must be converted to JPEG first.
- **Naming is free** but then **must stay stable**: the photo `id` is derived
  from the filename (`IMG_2408.jpeg` → `img-2408`, slugified NFKC/lowercased,
  `()` → spaces, runs of non-alnum → `-`). Renaming an existing file later makes
  it look like a NEW photo and orphans the old manifest row.
- **Duplicates:** same slug in one batch auto-suffixes `-2`, `-3`…
  (`IMG_123 (1).JPG` and `IMG_123 (2).JPG` are distinct photos). Re-copying the
  *same* filename is the only true duplicate — it just re-merges.

## 2. `npm run gallery:gen`

For every source file the script:

- auto-orients via sharp and writes the two committed web tiers:
  - `public/assets/gallery/thumb/<id>.webp` (~480px long edge)
  - `public/assets/gallery/large/<id>.webp` (~1680px long edge)
  - both q78; the ~142 MB originals stay in `GalleryPhoto/` and are never committed.
- merges `content/gallery/items.json`, **matching rows by the original filename**:
  - existing row → only the generated fields are refreshed;
  - new file → a new row is appended, then all rows are sorted date-desc.
- fills automatically: `date` (EXIF `DateTimeOriginal` → `YYYY-MM-DD`),
  `lat` / `lon` (EXIF GPS as decimal degrees; `null` when absent),
  oriented `width`/`height`, and the `thumb`/`large` asset URLs.
- **never overwrites** the human fields: the bilingual block
  (`place_en`/`place_zh`, `placeLocal_en`/`placeLocal_zh`,
  `title_en`/`title_zh`, single language-neutral `alt`),
  `country_code`, `originalUrl`, `featured`, `badge`. Any extra key a human
  adds to a row survives the merge untouched.
- `color` is derived from `featured` each run (curated → `#c8441f`, else `""`);
  it is not a hand-edited field.
- warns (does not delete) when a manifest row's source file is missing — an
  "orphan". Delete the row to drop a photo.

## 3. Fill the human fields

New rows come in with all human text empty. Edit `content/gallery/items.json`
directly — there is **no need to re-run `gallery:gen`** after editing text, since
human fields are read live from the manifest at build time.

Optional per-row human metadata:

| field | meaning |
|---|---|
| `place_en` / `place_zh` | region · city, e.g. `Kaohsiung, Taiwan` / `高雄`; foreign = `国家-城市` |
| `placeLocal_en` / `placeLocal_zh` | the specific spot/scenic name, e.g. `Shoushan Lookout` / `壽山觀景臺` |
| `title_en` / `title_zh` | heading of the opened card (blank → falls back to place) |
| `alt` | single language-neutral body/description copy |
| `country_code` | ISO alpha-2 shown in the image-chip (e.g. `TW`) |
| `featured` | curated: pinned first in the default order + orange-red accent |
| `badge` | reserved travel-stamp preset key (renders the placeholder until vectors exist) |
| `originalUrl` | optional link to a full-res original (adds the download button) |
| `color` | **do not set** — derived from `featured` |

**Language pairs cross-fallback**: an empty `*_en` shows the `*_zh` value on the
EN page and vice versa (`localized()` in `gallery-view.tsx`), so a single
language is enough to make both routes readable.

## Common gotchas

- **Old photos with no GPS** → `lat`/`lon` are `null`, so the lightbox world map
  renders with **no marker dot** (by design — never a fake 0,0 pin). To get a dot,
  hand-write `lat`/`lon` into the row: the merge keeps a human value whenever the
  source file has no GPS tag. (If the source DOES carry GPS, EXIF wins each run.)
- **Removing a photo:** move the original out of `GalleryPhoto/` AND delete its
  row from items.json (the script never deletes rows). Optionally delete the
  leftover `<id>.webp` files in `thumb/`/`large/`.
- **Filenames = identity.** To correct an id/typo, keep the filename and only edit
  the `id` string in items.json if you must — but prefer renaming before the first
  `gallery:gen` run.

## AI-assist drafting of place/placeLocal

Because every row already carries EXIF GPS for real captures, an assistant can
draft the human text instead of typing it from scratch:

1. run `npm run gallery:gen`;
2. reverse-geocode each row with an empty `place` via Photon
   (`https://photon.komoot.io/reverse?lat=..&lon=..` — OSM data; note
   Nominatim may time out from some networks);
3. fill `place_en`/`place_zh` (city/country level) always, and
   `placeLocal_en`/`placeLocal_zh` **only where the GPS sits on a single iconic
   landmark**; leave ambiguous city-street shots blank for the human;
4. report the mapping with confidence so the user eyeballs each name against the
   real photo — placeLocal depends on what the photo *shows*, which coordinates
   alone cannot prove.

The user reviews/edits the names afterwards; everything is a plain `git diff`.
