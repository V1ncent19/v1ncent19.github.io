# Gallery badges (travel stamps)

Drop-in folder for the travel-stamp artwork shown on each gallery photo.
A badge appears when BOTH halves are in place:

1. An SVG file here named after the badge key, e.g. `taipei.svg`
   → served at `/assets/gallery/badges/taipei.svg`.
2. The same key set on the photo in `content/gallery/items.json`
   → `"badge": "taipei"`.

No code change is needed: `components/gallery/travel-stamps.tsx` renders
`<img src="/assets/gallery/badges/<key>.svg">` optimistically, and if a key has
no matching `.svg` yet, the dashed placeholder is shown instead (never a broken
image). Remove the `"badge"` key (or leave it `""`) to keep the placeholder.

Conventions:

- **Square viewBox** (e.g. `viewBox="0 0 48 48"`), artwork centred. A stamp
  renders at three sizes — 20px (photo-tile hover card), 36–40px (lightbox
  caption), larger still on a future stamp-passport page — so keep the drawing
  bold and legible at 20px. `object-fit: contain` is applied.
- Real multi-colour stamps are fine as-is. Inline fallback stamps use
  `currentColor` so they can be recoloured per theme; file SVGs don't inherit it.
- A stamp that will also appear on the real stamp-passport page should be drawn
  without baked-in text (it renders at two very different sizes), matching the
  passport design in `new/CONTENT_MODEL.md`.
- Name files with the exact key used in `items.json` (lowercase, `-` between
  words); the `<img>` URL is case-sensitive.
