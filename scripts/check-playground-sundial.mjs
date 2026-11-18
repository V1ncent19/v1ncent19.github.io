import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { windows } from "../assets-src/playground/window-gallery.mjs";

const fromRoot = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFile(fromRoot(path), "utf8");
const manifest = JSON.parse(await read("content/playground/travelogues.json"));
const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
};
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(ts.transpile(source, compilerOptions)).toString("base64")}`;
const layoutUrl = moduleUrl(await read("components/playground/sundial-layout.ts"));
const { sundialLayout, WINDOW_WIDTH, TREE_SEAT_BASE_RADIUS } = await import(layoutUrl);
const { worldLightSnapshot, equatorialSunrise, lightElevation, resumeSundialClock, sundialTimeAt, SUNDIAL_EXPOSURE } =
  await import(moduleUrl((await read("components/playground/sundial-world-light.ts"))
    .replace('"astronomy-engine"', JSON.stringify(pathToFileURL(createRequire(import.meta.url).resolve("astronomy-engine")).href))));
const { sundialInlay } = await import(moduleUrl((await read("components/playground/sundial-inlay.ts"))
  .replace('"./sundial-layout"', JSON.stringify(layoutUrl))));
const { createSundialHover } = await import(moduleUrl((await read("components/playground/sundial-hover.ts"))
  .replace('"three"', JSON.stringify(import.meta.resolve("three")))));

const entries = manifest.travelogues;
assert.equal(manifest.version, 1);
assert(entries.length > 0);
assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length);
await Promise.all(entries.flatMap(({ tripId, assetId }) => {
  const entry = windows.find(({ id }) => id === assetId);
  assert(entry, `Unknown glass: ${assetId}`);
  return [
    access(fromRoot(`assets-src/playground/${entry.file}`)),
    access(fromRoot(`content/travel/${tripId}/card.json`)),
    access(fromRoot(`app/travel/${tripId}/page.tsx`)),
    access(fromRoot(`app/travel/zh/${tripId}/page.tsx`)),
  ];
}));
await Promise.all(["gallery-window.webp", "gallery-window-optics.png", "gallery-window-light.webp", "gallery-window-pane-ids.png"]
  .map((file) => access(fromRoot(`public/assets/playground/glass/${file}`))));
await access(fromRoot("public/assets/playground/sundial/uzumakinoharu-loop.mp3"));
await access(fromRoot("public/assets/home/nav/playground.webp"));
const paneNetworks = JSON.parse(await read("generated/playground/pane-networks.json"));
assert.deepEqual(paneNetworks.map(({ id }) => id), windows.map(({ id }) => id));
for (const { pieces } of paneNetworks) {
  assert(pieces.some((piece) => piece?.neighbors.length > 1));
  pieces.forEach((piece, id) => piece?.neighbors.forEach((neighbor) => assert(pieces[neighbor]?.neighbors.includes(id))));
}

const current = sundialLayout(entries);
const initialFour = sundialLayout([1, 3, 5, 7].map((number) => ({ slotId: `ring-1-0${number}` })));
const eight = sundialLayout(Array.from({ length: 8 }, (_, i) => ({ slotId: `ring-1-0${i + 1}` })));
const twelve = sundialLayout([...eight.windows.map(({ id }) => ({ slotId: id })), ...[1, 4, 7, 10].map((number) => ({ slotId: `ring-2-${String(number).padStart(2, "0")}` }))]);
assert.equal(current.windows.length, entries.length);
const currentRoutes = sundialInlay(current).lengths;
assert.equal(currentRoutes.length, entries.length);
assert(currentRoutes.every((length) => Number.isFinite(length) && length > 0));
assert.equal(initialFour.spare.length, 4);
assert.equal(initialFour.plate, 11.8);
assert.deepEqual(initialFour.slots.map(({ radius }) => radius), [7.05, 8.21, 9.07, 9.70, 7.27, 8.03, 8.91, 9.87]);
assert.equal(eight.spare.length, 0);
assert.equal(twelve.windows.length, 12);
assert(twelve.plate > eight.plate);
for (const layout of [current, eight, twelve]) {
  for (let i = 0; i < layout.windows.length; i++) {
    const a = layout.windows[i];
    for (const b of layout.windows.slice(i + 1)) {
      assert(Math.hypot(a.x - b.x, a.z - b.z) >= WINDOW_WIDTH + 1, `${a.id} is too close to ${b.id}`);
    }
  }
}
for (const first of eight.windows) assert.deepEqual(first, twelve.windows.find(({ id }) => first.id === id));
assert.throws(() => sundialLayout([{ slotId: "ring-1-01" }, { slotId: "ring-1-01" }]));

const inlay = sundialInlay(initialFour);
const fullInlay = sundialInlay(eight);
const point = (radius, bearing, [x, z] = [0, 0]) => [x + radius * Math.sin(bearing), z - radius * Math.cos(bearing)];
const arcEnds = ([radius, bearing, span], direction, center) => [
  point(radius, bearing - direction * span, center), point(radius, bearing + direction * span, center), 2 * radius * span,
];
const pieces = ({ arcs, radials, elbows }) => [
  ...arcs.map(({ shape, timing }) => ({ timing, ends: arcEnds(shape, timing[3]) })),
  ...radials.map(({ shape: [bearing, inner, outer], timing }) => ({
    timing, ends: [point(inner, bearing), point(outer, bearing), outer - inner],
  })),
  ...elbows.map(({ shape: { arc, center }, timing }) => ({ timing, ends: arcEnds(arc, timing[3], center) })),
];
const connected = pieces(fullInlay);
assert.deepEqual(pieces(inlay).map(({ ends }) => ends), connected.map(({ ends }) => ends));
assert.equal(inlay.junctions.length, 3);
assert.deepEqual(connected.filter(({ timing }) => timing[1] >= 0)
  .map(({ timing: [a, b, start] }) => [a + 1, b + 1, start]), [[7, 8, 0], [3, 2, 0], [5, 6, 0]]);
assert(pieces(inlay).some(({ timing }) => timing[0] === -1 && timing[1] === -1));
const close = (a, b) => assert(Math.abs(a - b) < 1e-8);
for (const [i, slot] of eight.windows.entries()) {
  const route = connected.filter(({ timing: [owner, other] }) => owner === i || other === i)
    .sort((a, b) => a.timing[2] - b.timing[2]);
  let distance = 0;
  let prior = route[0].ends[0];
  close(Math.hypot(...prior), TREE_SEAT_BASE_RADIUS - .020);
  for (const { timing, ends: [from, to, length] } of route) {
    close(timing[2], distance);
    close(Math.hypot(from[0] - prior[0], from[1] - prior[1]), 0);
    distance += length;
    prior = to;
  }
  close(distance, fullInlay.lengths[i]);
  close(Math.atan2(prior[0], -prior[1]) - Math.atan2(slot.x, -slot.z), 0);
  assert(Math.hypot(prior[0] - slot.x, prior[1] - slot.z) < .27);
}
for (const [index, length] of inlay.lengths.entries()) {
  const hover = createSundialHover(inlay.lengths.length);
  hover.advance(index, false, false, 1 / 60, inlay.lengths);
  assert(hover.inlay.value[index].x < length);
  assert.equal(hover.illumination.value[index], 0);
  let glowBeforeArrival = false;
  for (let frame = 0; frame < 100; frame++) {
    const previous = hover.illumination.value[index];
    hover.advance(index, false, false, 1 / 60, inlay.lengths);
    assert(Math.abs(hover.illumination.value[index] - previous) < .09);
    glowBeforeArrival ||= hover.inlay.value[index].x < length && hover.illumination.value[index] > .01;
  }
  assert(glowBeforeArrival);
  assert(hover.illumination.value[index] > .99);
  assert.equal(hover.illumination.value.filter((value) => value > 0).length, 1);
  const lit = hover.inlay.value[index].x;
  for (let frame = 0; frame < 15; frame++) hover.advance(-1, false, false, 1 / 60, inlay.lengths);
  assert(hover.inlay.value[index].x < lit && hover.inlay.value[index].y > 0);
  for (let frame = 0; frame < 40; frame++) hover.advance(-1, false, false, 1 / 60, inlay.lengths);
  assert.equal(hover.inlay.value[index].y, 0);
  assert.equal(hover.illumination.value[index], 0);
}

assert.equal(SUNDIAL_EXPOSURE, .90);
const date = new Date("2026-11-23T17:37:00Z");
const sky = worldLightSnapshot(date);
// Compare against NASA JPL Horizons topocentric, airless observations.
for (const [longitude, latitude, sunAz, sunEl, moonAz, moonEl] of [
  [-87.6298, 41.8781, 180.006, 27.672, 14.399, -25.421],
  [2.3522, 48.8566, 256.208, -15.248, 84.946, 24.825],
  [103.8519, 1.2903, 150.407, -67.799, 311.987, 56.862],
  [174.7633, -36.8485, 110.858, 6.332, 284.637, -19.118],
]) {
  const local = sky.at({ longitude, latitude });
  for (const [ray, azimuth, elevation] of [[local.sun, sunAz, sunEl], [local.moon, moonAz, moonEl]]) {
    assert(Math.abs(Math.hypot(...ray) - 1) < 1e-10);
    assert(Math.abs(lightElevation(ray[1]) - elevation) < .03);
    assert(Math.abs((Math.atan2(ray[0], -ray[2]) * 180 / Math.PI + 360) % 360 - azimuth) < .03);
  }
}
const [longitude, latitude] = sky.midnight;
assert(lightElevation(sky.at({ longitude, latitude }).sun[1]) < -89.8);
const opening = equatorialSunrise(sky);
const oneDay = 86_400_000;
const parked = { time: date.valueOf(), runningSince: null };
const running = resumeSundialClock(parked, 600);
assert.equal(sundialTimeAt(parked, 240_600), parked.time);
assert.equal(sundialTimeAt(running, 600), parked.time);
assert.equal(resumeSundialClock(running, 120_600), running);
assert.equal(sundialTimeAt(running, 240_600), parked.time + oneDay * .7);
const simulatedDay = 240_000 / .7;
const dayLater = worldLightSnapshot(new Date(sundialTimeAt(running, 600 + simulatedDay)));
assert.notDeepEqual(dayLater.at(opening), sky.at(opening));
// Openings around solstices and equinoxes must always be on the morning
// side and high enough to light the floor.
for (const base of ["2026-03-20", "2026-06-21", "2026-09-22", "2026-12-21"]) {
  for (const hour of ["00", "06", "12", "18"]) {
    const snapshot = worldLightSnapshot(new Date(`${base}T${hour}:00:00Z`));
    const position = equatorialSunrise(snapshot);
    const { sun } = snapshot.at(position);
    assert.equal(position.latitude, 0);
    assert(position.longitude >= -180 && position.longitude < 180);
    assert(sun[0] > .85 && Math.abs(lightElevation(sun[1]) - 11) < .01);
  }
}
console.log("[playground] glass, bilingual routes, window slots, connected inlays and world lighting verified.");
