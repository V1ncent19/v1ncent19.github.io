export interface TravelWindow {
  id: string;
  assetId: string;
  slotId: string;
  atlasIndex: number;
  label: string;
  title: string;
  summary: string;
  href: string;
}

export const PORTAL_DURATION = 940;
export const WINDOW_SCALE = 0.63;
export const WINDOW_WIDTH = 3.8 * WINDOW_SCALE;
export const GOTHIC_SILL_DEPTH = .831;
export const TREE_SEAT_BASE_RADIUS = 1.54;
export const SUNDIAL_PAVING_INSET = .115;
const FIRST_PLATE_RADIUS = 11.8;
const RING_BASE_RADIUS = 8.35;
const RING_STEP = 4.35;
const START_BEARING = 78;
const radians = Math.PI / 180;
const firstRing = [
  [80, 7.05], [128, 8.21], [170, 9.07], [217, 9.70],
  [260, 7.27], [308, 8.03], [350, 8.91], [37, 9.87],
] as const;

export interface Slot {
  id: string;
  ring: number;
  angle: number;
  radius: number;
  x: number;
  z: number;
  yaw: number;
}

function slotsForRing(ring: number): Slot[] {
  const count = 8 + (ring - 1) * 4;
  return Array.from({ length: count }, (_, index) => {
    const [bearing, radius] = ring === 1 ? firstRing[index]
      : [START_BEARING + (360 / count) * index, RING_BASE_RADIUS + (ring - 1) * RING_STEP];
    const angle = bearing * radians;
    return {
      id: `ring-${ring}-${String(index + 1).padStart(2, "0")}`,
      ring, angle, radius, x: radius * Math.sin(angle), z: -radius * Math.cos(angle), yaw: -angle,
    };
  });
}

export function sundialLayout(entries: Pick<TravelWindow, "slotId">[]) {
  const rings = entries.map(({ slotId }) => {
    const match = /^ring-([1-9]\d*)-\d{2}$/.exec(slotId);
    if (!match || Number(match[1]) > 8) throw new Error(`Invalid sundial slot: ${slotId}`);
    return Number(match[1]);
  });
  const outerRing = Math.max(1, ...rings);
  const plate = FIRST_PLATE_RADIUS + (outerRing - 1) * RING_STEP;
  const slots = Array.from({ length: outerRing }, (_, i) => slotsForRing(i + 1)).flat();
  const occupied = new Set<string>();
  const windows = entries.map(({ slotId }) => {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot || occupied.has(slotId)) throw new Error(`Unknown or duplicate sundial slot: ${slotId}`);
    occupied.add(slotId);
    return slot;
  });
  return { slots, windows, plate, island: plate + .36, spare: slots.filter((slot) => !occupied.has(slot.id)) };
}
