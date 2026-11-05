# assets/vendor — third-party files

Everything else under `public/assets/` was made or shot by the site owner.
The files here were **not**: they are geography data from outside projects,
kept in the repo so the site has no runtime dependency on a third-party CDN.
This directory exists so that "is this mine?" is answerable by looking at the
path alone.

## `land-110m.json`

Natural Earth 110m land polygons, as TopoJSON — the `land-110m.json` object
from Mike Bostock's [`world-atlas`](https://github.com/topojson/world-atlas)
package (v2), redistributed from the
[Natural Earth](https://www.naturalearthdata.com/) public-domain dataset.

- **Licence: public domain.** Natural Earth states: "All versions of Natural
  Earth vector and raster data are in the public domain." No attribution is
  legally required; credit is given here anyway.
- Fetched at runtime by `components/about/travel-globe.tsx` to draw the land
  on the draggable orthographic globe. If the fetch fails the globe still
  renders as a sphere with a graticule, so this file degrades gracefully.

## `worldOutlineLow.svg`

A low-detail Mercator world outline, generated from
[amCharts geodata](https://www.amcharts.com/) (header comment in the file
reads `Generated from amCharts geodata | Mercator projection`).

- **Licence: amCharts free-licence terms** — the map data may be used freely,
  but amCharts asks that the map be attributed where it is visible. It is used
  here only as a faint decorative backdrop behind coordinates in the gallery
  lightbox (`components/gallery/gallery-view.tsx`), not as a navigational map.
- Multiplied into the layout at a fixed viewBox, so it is never re-projected;
  the file is stored untouched to keep its pre-computed path data valid.

## Adding a file here

Only if it is third-party and shipped as-is. Add an entry above with the
source, the licence, and what loads it — a vendor file with no stated licence
is a liability, not an asset. Anything you authored or photographed belongs
elsewhere under `public/assets/`.
