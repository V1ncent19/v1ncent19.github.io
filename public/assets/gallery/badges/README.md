# Gallery badges (travel stamps)

Each gallery photo can show a composed travel-stamp badge: a **shared frame**
(two rings) plus a **per-key icon**, inlined into a single `<svg>` at build
time. A badge appears when BOTH halves are in place:

1. An SVG file here named after the badge key, e.g. `taipei.svg`
   → served conceptually at `/assets/gallery/badges/taipei.svg`.
2. The same key set on the photo in `content/gallery/items.json`
   → `"badge": "taipei"`.

No component code changes are needed. After adding or editing artwork, run
`npm run badges` (also runs automatically before `npm run build` and
`npm run dev`) — it regenerates `components/gallery/badge-art.generated.ts`
and **warns about items.json keys with no matching file**.

## How rendering works

`components/gallery/travel-stamps.tsx` composes ONE inline `<svg>`:
`badge-frame.svg` + `<key>.svg`, both flattened by the build script. Because
the SVG is inline (not `<img>`), the artwork's `stroke="currentColor"`
inherits the chip's CSS colour — tile accent tint, hover recolour and dark
mode all work. An unknown/empty key renders the dashed postmark placeholder
(decided at build time; no runtime 404).

## Icon file conventions

- **Icon only — do NOT bake in the two rings.** The frame lives solely in
  `badge-frame.svg` (the single source of truth) and is added at build time.
- Square `viewBox="0 0 100 100"`, artwork centred inside the inner ring
  (r = 38, i.e. roughly the 12–88 box), so it clears the frame.
- `fill="none"` + `stroke="currentColor"`, rounded joins, stroke-width
  3.5–5 on the 100 × 100 viewBox — bold enough to stay legible at 20px,
  where the badge renders on masonry hover cards.
- Root presentation attributes (stroke-width, linecap, linejoin, …) are
  preserved onto a wrapping `<g>` by the build script.
- Mirror-symmetric silhouettes for landmarks/architecture when the subject
  allows; avoid exposed line endings (projecting eaves are the exception).
- No baked-in text (stamps render at very different sizes, and a future
  stamp-passport page reuses the same artwork).
- Name files with the exact items.json key: lowercase, `-` between words.
