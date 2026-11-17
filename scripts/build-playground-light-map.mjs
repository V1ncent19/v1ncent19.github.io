import { readFile, writeFile } from "node:fs/promises";
import { geoMercator, geoPath } from "d3-geo";

// Natural Earth Admin 0 Map Units 1:110m, v5.1.2, public domain.
// https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_map_units.geojson
const source = process.argv[2];
if (!source) throw new Error("Pass the Natural Earth map units GeoJSON file as the first argument.");

const { features } = JSON.parse(await readFile(source, "utf8"));
const width = 360;
const north = 84;
const south = -72;
const projection = geoMercator().scale(width / (2 * Math.PI)).translate([width / 2, 0]).precision(.16);
const top = projection([0, north])[1];
const height = projection([0, south])[1] - top;
projection.translate([width / 2, -top]).clipExtent([[0, 0], [width, height]]);
const path = geoPath(projection).digits(1);

const regions = new Map();
for (const unit of features) {
  const region = unit.properties.SUBREGION.replace("South-Eastern", "South-eastern");
  const outline = path(unit);
  if (outline) regions.set(region, (regions.get(region) ?? "") + outline);
}

const output = { width, height, north, regions: [...regions].sort(([a], [b]) => a.localeCompare(b, "en")) };
await writeFile(new URL("../generated/playground/light-map.json", import.meta.url), `${JSON.stringify(output)}\n`);
