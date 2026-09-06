"use client";

import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Camera,
  ChevronUp,
  Download,
  LayoutGrid,
  MapPin,
  Shuffle,
  Star,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { GalleryItem } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { TravelStamp } from "./travel-stamps";

type SortMode = "date" | "place" | "shuffle";

/* ----------------------------------------------------------------------------
 * Column layout
 * -------------------------------------------------------------------------
 * The grid is split into N explicit flex columns (user picks 3/4/5, default 4)
 * because we need row-band time ordering: items are handed to columns in a
 * round-robin, so the top band reads 1 2 3, the next 4 5 6, … — temporally
 * adjacent frames sit next to each other across columns (CSS multi-column, by
 * contrast, fills one column before the next and scatters times across rows).
 * Round-robin means a very tall frame makes its column drift a little — that
 * staggered drift is the accepted masonry look. On narrow screens the count is
 * clamped down to whatever keeps each tile ≥ MIN_TILE px wide.
 * ------------------------------------------------------------------------- */
const GAP = 12; // gap-3
const MIN_TILE = 148; // smallest comfortable thumb width, px
const COLUMN_CHOICES = [2,3,4] as const;
const DEFAULT_COLUMNS = 3;

/* Lightbox geometry (2026-09-04, Request B): on wide screens the opened card is
 * a two-pane row — a left image column whose WIDTH hugs the photo's own aspect
 * (so a portrait renders tall with no black side margins) plus a fixed-width
 * caption rail on the right. Below the breakpoint it falls back to the stacked
 * image-over-caption card. Equal-height cards were dropped with this change:
 * the card now takes the natural height of whichever pane is taller.
 */
const LIGHTBOX_TWO_COL = 768; // px overlay content width that enables the panes
const CAPTION_RAIL_NARROW = 320; // rail width below the widest desktop widths
const CAPTION_RAIL_WIDE = 380;

const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic date strings (no locale API → identical on server & client). */
function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return lang === "zh" ? `${y}年${m}月${d}日` : `${EN_MONTHS[m - 1]} ${d}, ${y}`;
}

/** "YYYY-MM-DD" → month-year label ("Sep 2024" / "2024年9月"). */
function formatYearMonth(iso: string, lang: Lang): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return lang === "zh" ? `${y}年${m}月` : `${EN_MONTHS[m - 1]} ${y}`;
}

/** Compact, language-neutral "2026.08" used on the resting glass bar. */
function formatDotMonth(iso: string): string {
  const [y, m] = iso.split("-");
  if (!y || !m) return iso;
  return `${y}.${m}`;
}

/** Whole days from a "YYYY-MM-DD" capture date to today (0 = today; null when
 * the date is missing). Both instants are local midnights compared as UTC so a
 * daylight-saving shift can never make the count one day off. */
function wholeDays(iso: string): number | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  const then = new Date(y, m - 1, d);
  const midnight = (t: Date) =>
    Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((midnight(today) - midnight(then)) / 86400000);
}

/** Relative age for the hover card ("N days ago" / "N 天前"); null when the
 * date is missing or in the future (caller then keeps the absolute date). */
function daysAgoLabel(iso: string, lang: Lang): string | null {
  const days = wholeDays(iso);
  if (days === null || days < 0) return null;
  if (days === 0) return lang === "zh" ? "今天" : "Today";
  if (days === 1) return lang === "zh" ? "昨天" : "Yesterday";
  return lang === "zh" ? `${days} 天前` : `${days} days ago`;
}

type LocalField = "place" | "placeLocal" | "title";

/** Read the language-localised field, falling back to the other language. */
function localized(
  item: GalleryItem,
  field: LocalField,
  lang: Lang,
): string {
  const other = lang === "en" ? "zh" : "en";
  const rec = item as unknown as Record<string, string>;
  return (rec[`${field}_${lang}`] || rec[`${field}_${other}`] || "").trim();
}

/** Route-appropriate "place · placeLocal" line for the lightbox header. */
function locText(item: GalleryItem, lang: Lang): string {
  return [
    localized(item, "place", lang),
    localized(item, "placeLocal", lang),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Accessible one-line description (title · place · date) fallback. */
function describe(item: GalleryItem, lang: Lang): string {
  return [
    localized(item, "title", lang) || locText(item, lang),
    formatDate(item.date, lang),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Decimal degrees → "22.625°N, 120.274°E" (trailing zeros trimmed). */
function coordsLine(item: GalleryItem): string | null {
  if (typeof item.lat !== "number" || typeof item.lon !== "number") return null;
  const coord = (value: number, axis: "lat" | "lon") => {
    const s = Number(Math.abs(value).toFixed(3)).toString();
    const hemi =
      axis === "lat"
        ? value >= 0
          ? "N"
          : "S"
        : value >= 0
          ? "E"
          : "W";
    return `${s}°${hemi}`;
  };
  return `${coord(item.lat, "lat")}, ${coord(item.lon, "lon")}`;
}

/**
 * Per-item theme accent as CSS variables: `--tile-accent` (the strong colour —
 * resting dot, badge + hover title) and `--tile-soft` (a translucent tint for
 * badge chips). The `featured` (精选集) flag is the source of truth: featured
 * photos always take the curated orange-red `--curated` (theme-paired like the
 * brand, so dark mode gets its brighter shade); everything else falls back to
 * the site brand — the default blue. `color` in items.json is derived from
 * `featured` on each gallery:gen run, so for featured rows it is informational
 * (the live accent keys off the flag and recolours instantly when you flip it);
 * for non-featured rows a hand-written `color` still acts as an override.
 */
function accentVars(item: GalleryItem): CSSProperties {
  const accent =
    item.featured === true
      ? "var(--curated)"
      : item.color.trim() || "var(--brand)";
  return {
    "--tile-accent": accent,
    "--tile-soft": `color-mix(in srgb, ${accent} 13%, transparent)`,
  } as CSSProperties;
}

/**
 * Decorative world map for the open card. The sheet is an external amCharts
 * Mercator SVG (public/assets/gallery/worldOutlineLow.svg, kept untouched);
 * its viewBox is "-2 168.36 964 623.29" and its path data was projected with
 * the world centred at x = 480 (lon 0) and the equator at y = 610, at 960
 * viewBox units per 2π radians of longitude.
 */
const WORLD_MAP_SRC = "/assets/gallery/worldOutlineLow.svg";
const WORLD_VB = { x: -2, y: 168.36, w: 964, h: 623.29 } as const;

/**
 * Mercator-project one lat/lon into the world map's OWN user coordinates.
 * Returns the raw SVG-space x/y (same coordinate system as the sheet's path,
 * so the caller places a marker directly at these values — no viewBox-origin
 * subtraction and no linear lat/lon normalisation). Latitude is clamped to
 * ±85° so `ln(tan(π/4 + φ/2))` never diverges. Returns null for non-finite
 * input or a point that projects outside the drawn sheet, so the caller just
 * omits the marker (never shows a dot at 0,0 or at a faked location).
 */
function projectToWorldMap(
  latitude: number,
  longitude: number,
): { x: number; y: number } | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const lat = Math.max(-85, Math.min(85, latitude));
  const scale = 960 / (2 * Math.PI);
  const x = ((longitude + 180) / 360) * 960;
  const latRad = lat * (Math.PI / 180);
  const y = 610 - scale * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  if (x < 0 || x > WORLD_VB.w) return null;
  if (y < WORLD_VB.y || y > WORLD_VB.y + WORLD_VB.h) return null;
  return { x, y };
}

/**
 * Largest on-screen size for the lightbox image that fits a `maxW × maxH`
 * box while keeping the photo's own aspect ratio (from the generated manifest
 * dimensions). The image column is then given exactly this size, so the black
 * stage hugs the photo — no object-contain side margins.
 */
function fitImage(
  item: GalleryItem,
  maxW: number,
  maxH: number,
): { imgW: number; imgH: number } {
  if (maxW <= 0 || maxH <= 0) return { imgW: 0, imgH: 0 };
  const ratio =
    item.width > 0 && item.height > 0 ? item.width / item.height : 1.5;
  const imgW = Math.min(maxW, Math.round(maxH * ratio));
  return { imgW, imgH: Math.round(imgW / ratio) };
}

/** Small deterministic PRNG (mulberry32) so a shuffle is stable for a seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates driven by the given PRNG (seeded by the shuffle nonce). */
function shuffleList<T>(list: readonly T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function GalleryView({
  lang,
  items,
}: {
  lang: Lang;
  items: GalleryItem[];
}) {
  const s = copy[lang];
  const unit = lang === "zh" ? "张" : "photos";

  const [mode, setMode] = useState<SortMode>("date");
  /** Sort direction for the date/place keys ("shuffle" ignores it). Each key
   *  carries its own natural default: newest-first for dates, A→Z for places. */
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  /** Curated-collection filter (精选集): when active, only `featured` rows show. */
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const [prefCols, setPrefCols] = useState<number>(DEFAULT_COLUMNS);
  const [containerW, setContainerW] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  /** Lightbox overlay's content box (viewport minus its padding), px. */
  const [box, setBox] = useState({ w: 0, h: 0 });

  /* Shared-element open/close (2026-09-04, Request C). No on-screen prev/next
   * arrows any more — switching is keyboard-only. Open expands the panel from
   * the clicked thumbnail's rect; close collapses back to it. To keep the Close
   * button from drifting between photos it is pinned to the overlay (viewport),
   * not anchored to the image stage whose size changes per photo. */
  const tileRect = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelStarted = useRef(false); // entrance FLIP ran for this open session
  const closingRef = useRef(false); // guards double close (ref: survives renders)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false); // drives .gb-overlay-out

  /** Curated filter applied: everything, or only `featured` rows. */
  const visible = useMemo(
    () => (featuredOnly ? items.filter((i) => i.featured === true) : items),
    [items, featuredOnly],
  );

  /** Photos in the current display order. Date = newest/oldest by `dir`;
   *  place = alphabetical by `dir` (unlabelled frames always sink); the
   *  tiebreaker follows the same direction. Featured rows no longer lead
   *  (2026-09-05 user decision, supersedes Task D #2's curated-first band). */
  const ordered = useMemo(() => {
    if (mode === "shuffle") return shuffleList(visible, shuffleNonce);
    const flip = dir === "asc" ? 1 : -1; // asc: natural order; desc: reversed
    if (mode === "place") {
      return [...visible].sort((a, b) => {
        const pa = localized(a, "place", lang).toLowerCase();
        const pb = localized(b, "place", lang).toLowerCase();
        if (!pa && pb) return 1; // unlabelled frames sink to the end
        if (pa && !pb) return -1;
        if (pa !== pb) return (pa < pb ? -1 : 1) * flip;
        return (a.date || "").localeCompare(b.date || "") * flip;
      });
    }
    return [...visible].sort(
      (a, b) =>
        ((a.date || "").localeCompare(b.date || "") ||
          a.id.localeCompare(b.id)) * flip,
    );
  }, [visible, mode, dir, lang, shuffleNonce]);

  // Measure the grid once + on resize (state updates only inside rAF / events).
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = requestAnimationFrame(() => {
        setContainerW(gridRef.current?.clientWidth ?? 0);
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  // While the lightbox is open, keep the overlay's usable content box measured
  // (viewport minus the overlay's own padding). Sizes only feed the adaptive
  // two-pane geometry, so they update inside rAF and never race a key press.
  useEffect(() => {
    if (openIdx === null) return;
    let raf = 0;
    const measure = () => {
      raf = requestAnimationFrame(() => {
        const el = overlayRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        setBox({ w: Math.max(0, rect.width - px), h: Math.max(0, rect.height - py) });
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [openIdx]);

  /**
   * Column layout numbers. `fits` = how many columns the measured container can
   * hold at MIN_TILE each; `columns` = the user's preference clamped to that.
   * Before the container is measured (SSR + first client render) `fits` is
   * irrelevant and we render exactly `prefCols`, keeping hydration DOM equal.
   */
  const { columns, fits } = useMemo(() => {
    if (containerW <= 0) {
      return { columns: prefCols, fits: COLUMN_CHOICES.length };
    }
    const fits = Math.max(
      1,
      Math.floor((containerW + GAP) / (MIN_TILE + GAP)),
    );
    return { columns: Math.max(1, Math.min(prefCols, fits)), fits };
  }, [containerW, prefCols]);

  /** Round-robin split of the ordered photos into columns (see header note). */
  const columnList = useMemo(() => {
    const cols: { item: GalleryItem; index: number }[][] = Array.from(
      { length: columns },
      () => [],
    );
    ordered.forEach((item, i) => cols[i % columns].push({ item, index: i }));
    return cols;
  }, [ordered, columns]);

  /* FLIP reorder animation (2026-09-05, Task D #6 — user-approved). When the
     display order or column count changes (sort chip, featured toggle, column
     buttons), tiles glide to their new slots instead of teleporting.
     Mechanics: the previous SETTLED rect of every tile is kept in prevRectsRef
     (captured on each stable layout). On the first commit whose order signature
     differs, each still-present tile is snapped back to its old rect (invert),
     then a double-rAF releases it to rest (play) so the browser interpolates.
     Tiles that just entered fade in; removed tiles are unmounted before the
     effect runs. Tiles are keyed by item.id across the whole grid, so even a
     tile that moves to a different column (React remounts it there) is matched
     through the id → rect map. Transforms are written to the <button> elements
     directly — React never sets `transform` on them — so no state churn. Runs
     in a layout effect so the invert lands before the first painted frame.
     Reduced motion skips the whole thing (the global rule would flatten it, but
     this avoids the single-frame snap it would otherwise leave). */
  const prevSig = useRef<string>("");
  const prevRects = useRef<Map<string, DOMRect> | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const els = Array.from(grid.querySelectorAll<HTMLElement>("[data-gid]"));
    const now = new Map<string, DOMRect>();
    for (const el of els) {
      const id = el.dataset.gid;
      if (id) now.set(id, el.getBoundingClientRect());
    }
    const sig = `${columns}|${ordered.map((i) => i.id).join(",")}`;
    const prev = prevRects.current;
    const changed = prevSig.current !== "" && prevSig.current !== sig;
    prevSig.current = sig;
    prevRects.current = now;
    if (!changed || !prev) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Invert — snap every persistent tile back to where it just was.
    for (const el of els) {
      const id = el.dataset.gid;
      if (!id) continue;
      const nr = now.get(id);
      if (!nr) continue;
      el.style.transition = "none";
      const pr = prev.get(id);
      if (pr && (pr.left !== nr.left || pr.top !== nr.top)) {
        el.style.transform =
          `translate(${pr.left - nr.left}px, ${pr.top - nr.top}px)`;
        el.style.willChange = "transform";
      } else if (!pr) {
        el.style.opacity = "0"; // brand-new tile — fade it in
      }
    }

    // Play — release everything to rest on the next frames.
    grid.style.pointerEvents = "none";
    if (animTimer.current) clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => {
      grid.style.pointerEvents = "";
      for (const el of els) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.willChange = "";
        el.style.opacity = "";
      }
    }, 480);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const el of els) {
          const id = el.dataset.gid;
          if (!id || !now.has(id)) continue;
          el.style.transition =
            "transform 420ms var(--ease), opacity 240ms ease";
          el.style.transform = "";
          el.style.opacity = "1";
        }
      }),
    );
    return () => cancelAnimationFrame(raf);
  }, [ordered, columns]);

  // Clear a pending FLIP cleanup if the grid unmounts mid-animation.
  useEffect(
    () => () => {
      if (animTimer.current) clearTimeout(animTimer.current);
    },
    [],
  );

  function sortTo(next: SortMode) {
    if (next === "shuffle") setShuffleNonce((n) => n + 1);
    // Each sort key carries its natural default direction: newest-first for
    // dates, A→Z for places. The toggle then flips from there.
    setDir(next === "place" ? "asc" : "desc");
    setMode(next);
  }

  const chips = [
    { key: "date" as const, label: s.gallery.byDate, icon: ArrowDownUp },
    { key: "place" as const, label: s.gallery.byPlace, icon: MapPin },
    { key: "shuffle" as const, label: s.gallery.shuffle, icon: Shuffle },
  ];

  const active = ordered[openIdx ?? -1];
  const metaChip = active ? photoMeta(active, lang) : null;

  /** Open a tile: capture its rect for the shared-element animation, set the
   * overlay's box synchronously (no stacked-layout flash on wide screens), and
   * reset the per-session animation guards. */
  const openAt = (index: number) => {
    const item = ordered[index];
    const tile = item
      ? (document.querySelector(`[data-gid="${CSS.escape(item.id)}"]`) as
          | HTMLElement
          | null)
      : null;
    const r = tile?.getBoundingClientRect();
    tileRect.current = r
      ? { x: r.x, y: r.y, w: r.width, h: r.height }
      : null;
    triggerRef.current = tile;
    closingRef.current = false;
    panelStarted.current = false;
    setClosing(false);
    const pad = window.innerWidth >= 640 ? 24 : 12;
    setBox({
      w: Math.max(0, window.innerWidth - pad * 2),
      h: Math.max(0, window.innerHeight - pad * 2),
    });
    setOpenIdx(index);
  };

  /**
   * Close with a shared-element collapse: shrink the panel back onto the
   * thumbnail it opened from (and fade the overlay), then unmount after the
   * transition. Reached from the Close button, the backdrop (click-any-blank)
   * and Escape; arrow keys never call this.
   */
  const requestClose = useCallback(() => {
    if (openIdx === null || closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const panel = dialogRef.current;
    // Re-measure the trigger tile NOW instead of reusing the rect captured at
    // open time: the tile was hovered when clicked (its -4px hover lift shifts
    // the rect up), and by close the pointer is over the overlay, so the
    // resting rect is the correct collapse target — reusing the stale one made
    // the panel land ~4px high and pop on unmount.
    const r = triggerRef.current?.getBoundingClientRect();
    const T =
      r && r.width > 0 && r.height > 0
        ? { x: r.x, y: r.y, w: r.width, h: r.height }
        : tileRect.current;
    const unmount = () => {
      // preventScroll: plain focus() scrolls a not-fully-visible tile into
      // view (honouring scroll-padding-top) WHILE the scrollbar is hidden by
      // the scroll lock — the viewport then sits at a different offset when
      // the overlay unmounts, which reads as a vertical page jump on close.
      triggerRef.current?.focus({ preventScroll: true });
      setOpenIdx(null);
    };
    if (!panel || !T || T.w <= 0 || T.h <= 0) {
      closeTimer.current = setTimeout(unmount, 180);
      return;
    }
    const P = panel.getBoundingClientRect();
    if (P.width === 0 || P.height === 0) {
      unmount();
      return;
    }
    const ox = T.x + T.w / 2 - P.x;
    const oy = T.y + T.h / 2 - P.y;
    const s = Math.max(0.02, Math.min(T.w / P.width, T.h / P.height));
    panel.style.transformOrigin = `${ox}px ${oy}px`;
    panel.style.transition = "transform 240ms var(--ease), opacity 190ms ease";
    panel.style.transform = `scale(${s})`;
    panel.style.opacity = "0";
    closeTimer.current = setTimeout(unmount, 280);
  }, [openIdx]);

  const isOpen = openIdx !== null;

  // Scroll-lock the page while the lightbox is open, WITHOUT the sideways
  // jitter: hiding the scrollbar (`overflow:hidden`) on classic scrollbars
  // widens the layout by the scrollbar width, so centred columns would
  // recentre — a visible left/right shift when the box opens and again when
  // the scrollbar returns at unmount. Reserving that same width as body
  // padding-right keeps the page pixel-identical for the whole session. Keyed
  // on the boolean (not openIdx) so ←/→ photo changes never re-run it.
  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadRight = body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadRight;
    };
  }, [isOpen]);

  // While open: keep focus inside, and let Esc / arrow keys navigate. There
  // are no on-screen prev/next buttons any more; ←/→ switch photos, Esc (or
  // any non-button click) animates out.
  useEffect(() => {
    if (openIdx === null) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (closingRef.current) return;
      if (e.key === "Escape") {
        requestClose();
      } else if (e.key === "ArrowRight") {
        setOpenIdx((i) => (i === null ? i : (i + 1) % ordered.length));
      } else if (e.key === "ArrowLeft") {
        setOpenIdx((i) =>
          i === null ? i : (i - 1 + ordered.length) % ordered.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, ordered.length, requestClose]);

  // Warm the cache for the current + both neighbour `large` images so arrow
  // switching never waits on a decode; the only visible cost is the quick
  // .gb-img-in fade on the keyed <img>.
  useEffect(() => {
    if (openIdx === null) return;
    for (let k = -1; k <= 1; k += 1) {
      const item = ordered[(openIdx + k + ordered.length) % ordered.length];
      if (item?.large) {
        const im = new Image();
        im.decoding = "async";
        im.src = item.large;
      }
    }
  }, [openIdx, ordered]);

  /**
   * Shared-element open: expand the panel from the clicked thumbnail's rect.
   * Runs once per open session (panelStarted); photo changes while open only
   * fade the <img> (keyed remount → .gb-img-in), they never replay this.
   * Set in a layout effect so the first painted frame is already scaled down.
   */
  useLayoutEffect(() => {
    if (openIdx === null || panelStarted.current) return;
    const panel = dialogRef.current;
    const T = tileRect.current;
    if (!panel || !T || T.w <= 0 || T.h <= 0) return;
    const P = panel.getBoundingClientRect();
    if (P.width === 0 || P.height === 0) return;
    const ox = T.x + T.w / 2 - P.x;
    const oy = T.y + T.h / 2 - P.y;
    const s = Math.max(0.02, Math.min(T.w / P.width, T.h / P.height));
    panel.style.transformOrigin = `${ox}px ${oy}px`;
    panel.style.transition = "none";
    panel.style.transform = `scale(${s})`;
    panel.style.opacity = "0";
    panelStarted.current = true;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.transition =
          "transform 360ms var(--ease), opacity 200ms ease";
        panel.style.transform = "scale(1)";
        panel.style.opacity = "1";
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [openIdx]);

  // Clear a pending close timer if the component unmounts mid-animation.
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  /* Two-pane geometry for the opened card. `wide` mirrors the Tailwind break
   * used by the responsive class switch below (LIGHTBOX_TWO_COL px content box).
   * When wide, the caption rail takes a fixed width and the image column the
   * rest — but the image column is then sized to HUG the photo's own aspect
   * (fitImage), so a portrait is tall and never sits in a wide black band. */
  const wide = box.w >= LIGHTBOX_TWO_COL;
  const railW = box.w >= 1040 ? CAPTION_RAIL_WIDE : CAPTION_RAIL_NARROW;
  const fit =
    active && wide
      ? fitImage(active, Math.max(0, box.w - railW), Math.max(0, box.h))
      : { imgW: 0, imgH: 0 };
  const paneImage = fit.imgW > 0 && fit.imgH > 0 ? fit : null;

  /**
   * Photo overlays of the image stage: frosted meta chip bottom-left, position
   * counter bottom-right. Both track the photo's own corners (they annotate the
   * image), so they move with it across aspect changes — that is intended. The
   * Close button lives here too (2026-09-05 mobile review, see `closeButton`).
   */
  const stageControls = () =>
    active ? (
      <>
        {metaChip ? (
          <span
            aria-hidden
            className="ui-text pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[75%] items-center gap-1 rounded-lg border border-white/20 bg-black/55 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/95 backdrop-blur-md tabular-nums"
          >
            <span className="min-w-0 truncate">{metaChip}</span>
          </span>
        ) : null}
        <span
          aria-hidden
          className="ui-text pointer-events-none absolute right-3 bottom-3 z-20 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium tracking-wider text-white/90 backdrop-blur-md tabular-nums"
        >
          {(openIdx ?? 0) + 1} / {ordered.length}
        </span>
      </>
    ) : null;

  /**
   * Close button of the opened card (2026-09-05 mobile review): lives INSIDE
   * the image stage at the photo's top-right corner — on a phone the card
   * spans nearly the full viewport, so a viewport-fixed ✕ visually fused with
   * the card's corner while floating over the dimmed page behind it. Anchored
   * to the stage it reads as part of the photo viewer (and rides the FLIP
   * entrance with the panel). Rendered right after `stageControls()` in both
   * branches; the stage chips are pointer-events-none, this one is interactive.
   */
  const closeButton = (
    <button
      type="button"
      aria-label={s.gallery.close}
      title={s.gallery.close}
      onClick={requestClose}
      className="absolute top-3 right-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <X className="h-5 w-5" aria-hidden />
    </button>
  );

  /**
   * Caption content of the opened card (both layouts). Redesigned 2026-09-05
   * as an editorial "exhibition card" (user brief): the travel-stamp badge is
   * now a large emblem / "seal" left-aligned at the top of the rail, the
   * per-language `place` / `placeLocal` sit beneath as restrained
   * theme-coloured metadata, the authored `title` is the big serif focal
   * point, and `alt` reads as a light italic quote under a large decorative
   * quotation mark. The download link (shown only when the item shares an
   * `originalUrl`) becomes a full-width CTA that settles at the bottom of the
   * rail on the two-pane layout (`pin`) while stacked/mobile content flows
   * naturally. As before, the accent location block is withheld while `title`
   * is empty — then the heading itself falls back to the place line, so the
   * two would just duplicate. `alt` is deliberately a SINGLE language-neutral
   * caption (2026-09-05) — shown verbatim in both languages, never translated.
   * The month/country/coords line lives in the frosted chip over the image
   * instead.
   */
  const captionContent = (item: GalleryItem, pin: boolean) => {
    const title = localized(item, "title", lang);
    const hasTitle = title.length > 0;
    const place = localized(item, "place", lang);
    const spot = localized(item, "placeLocal", lang);
    const altText = item.alt.trim();
    const heading =
      "font-serif font-bold text-ink break-words " +
      (pin
        ? "text-[1.65rem] leading-[1.2]"
        : "text-[1.8rem] leading-[1.18] sm:text-[2rem]");
    // Metadata only beside an authored title (else it would duplicate the
    // heading's own place fallback); each line shown when it has content.
    const meta = hasTitle && Boolean(place || spot);
    return (
      <div
        className={pin ? "flex w-full flex-1 flex-col" : "flex w-full flex-col"}
      >
        {/* Emblem — the entry's "seal": the stamp enlarged to ~40% of the rail
            content width, square, on the faint theme tint. Left-aligned at the
            top to sit flush with the metadata / title below; no heavy card. */}
        <div className="flex w-full">
          <StampBadge
            preset={item.badge}
            box="aspect-square w-[clamp(5rem,40%,7.5rem)] rounded-2xl"
            mark="h-[70%] w-[70%]"
          />
        </div>

        {meta ? (
          <div className="mt-7">
            {place ? (
              <p className="ui-text text-[11.5px] font-bold uppercase tracking-[0.16em] text-[var(--tile-accent)]">
                {place}
              </p>
            ) : null}
            {spot && spot !== place ? (
              <p className="ui-text mt-1 text-xs font-semibold text-[var(--tile-accent)] opacity-75">
                {spot}
              </p>
            ) : null}
            <h2 className={`${heading} mt-4`}>{bigTitle(item, lang)}</h2>
          </div>
        ) : (
          <h2 className={`${heading} mt-7`}>{bigTitle(item, lang)}</h2>
        )}

        {/* Location map — sits between the title block and the alt quote:
            a subtle world outline with one breathing dot at the capture point.
            Decorative (aria-hidden inside); place/date lines carry the info. */}
        <div className="mt-7">
          <WorldLocationMap lat={item.lat} lon={item.lon} />
        </div>

        {/* Alt quote — light editorial treatment, not the old bordered card:
            a large accent quotation mark with the authored text flowing
            italic beside/under it. Hidden while the field is empty. */}
        {altText ? (
          <blockquote className="mt-7">
            <span
              aria-hidden
              className="float-left mr-2 -mt-1 select-none font-serif text-[2.6rem] leading-[0.8] text-[var(--tile-accent)]"
            >
              “
            </span>
            <p className="font-serif text-[15px] leading-relaxed text-muted italic">
              {altText}
            </p>
          </blockquote>
        ) : null}

        {item.originalUrl ? (
          <div className={pin ? "mt-auto pt-8" : "mt-7"}>
            <a
              href={item.originalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ui-text inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-on-brand shadow-sm transition hover:bg-brand-strong hover:no-underline"
            >
              <Download className="h-4 w-4" aria-hidden />
              {s.gallery.downloadOriginal}
            </a>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        {/* ---- Header / intro ---- */}
        {/* pt-2 sm:pt-4 keeps the § title row aligned with every other page's
            header (PageHeader / blog / CV use the same top padding; Task D #3). */}
        <header className="flex flex-col justify-between gap-6 pt-2 pb-8 sm:pt-4 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
              <span
                aria-hidden
                className="font-serif text-xl italic font-normal leading-none text-brand"
              >
                §
              </span>
              {s.gallery.title}
            </h1>
            <p className="text-[1.05rem] leading-relaxed text-muted">
              {s.gallery.lead}
            </p>
          </div>

          {/* Census tile */}
          <div className="flex shrink-0 items-center gap-4 self-start rounded-xl border border-line bg-surface p-4 shadow-sm md:self-auto">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-sink text-brand">
              <Camera className="h-6 w-6" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="ui-text text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {s.gallery.statLabel}
              </span>
              <span className="font-serif text-2xl font-bold leading-tight text-ink">
                {items.length}
                <span className="ml-1.5 text-base font-medium text-muted">
                  {unit}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* ---- Sort strip + column chooser ---- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface-tint px-4 py-3">
          {/* Curated filter (精选集) — pinned to the very front of the strip.
              The accent follows the same rule as the tiles — featured = orange. */}
          <button
            type="button"
            onClick={() => setFeaturedOnly((v) => !v)}
            aria-pressed={featuredOnly}
            className={[
              "ui-text inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:no-underline",
              featuredOnly
                ? "border-[var(--curated)] bg-[var(--curated-soft)] text-[var(--curated)]"
                : "border-line bg-surface text-muted shadow-sm hover:bg-surface-tint hover:text-ink",
            ].join(" ")}
          >
            <Star
              className="h-3.5 w-3.5"
              aria-hidden
              fill={featuredOnly ? "currentColor" : "none"}
            />
            {s.gallery.featured}
          </button>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="ui-text text-xs font-medium uppercase tracking-widest text-muted">
              {s.gallery.filterLabel}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {chips.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => sortTo(key)}
                  aria-pressed={mode === key}
                  className={[
                    "ui-text inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:no-underline",
                    mode === key
                      ? "border-brand/30 bg-brand text-on-brand"
                      : "border-line bg-surface text-muted shadow-sm hover:bg-surface-tint hover:text-ink",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              ))}
              {/* Direction toggle (date/place only — shuffle has no order).
                  Icon + label mirror the current direction; place uses the
                  neutral A→Z / Z→A shorthand. */}
              {mode !== "shuffle" ? (
                <button
                  type="button"
                  onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
                  aria-label={s.gallery.sortDir}
                  title={s.gallery.sortDir}
                  className="ui-text inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-muted shadow-sm transition-colors hover:text-ink"
                >
                  {dir === "desc" ? (
                    <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ArrowUpNarrowWide className="h-3.5 w-3.5" aria-hidden />
                  )}
                  <span className="text-xs font-semibold">
                    {mode === "place"
                      ? dir === "asc"
                        ? "A→Z"
                        : "Z→A"
                      : dir === "desc"
                        ? s.gallery.dirNew
                        : s.gallery.dirOld}
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Column count: 3 / 4 / 5, default 4 (buttons that cannot fit are
              dimmed). Mobile-only decision 2026-09-05: hidden below md — the
              width clamp alone decides 1/2 columns there, freeing the strip's
              right side for the sort controls. Desktop keeps manual control. */}
          <div className="ml-auto hidden items-center gap-2.5 md:flex">
            <span className="ui-text hidden items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted sm:inline-flex">
              <LayoutGrid className="h-3.5 w-3.5 text-brand" aria-hidden />
              {s.gallery.columns}
            </span>
            <div
              role="group"
              aria-label={s.gallery.columns}
              className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 shadow-sm"
            >
              {COLUMN_CHOICES.map((n) => {
                // A choice is unselectable only when the container literally
                // cannot fit that many MIN_TILE-wide columns right now.
                const disabled = containerW > 0 && n > fits;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPrefCols(n)}
                    disabled={disabled}
                    aria-pressed={columns === n}
                    className={[
                      "ui-text inline-flex h-6.5 min-w-[26px] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums transition-colors",
                      columns === n
                        ? "bg-brand text-on-brand"
                        : disabled
                          ? "cursor-not-allowed text-faint"
                          : "text-muted hover:bg-surface-sink hover:text-ink",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---- Masonry grid (explicit columns); curated filter with no picks
            yet renders a friendly empty state instead ---- */}
        {visible.length === 0 ? (
          <div className="mt-8 flex items-center justify-center rounded-xl border border-dashed border-line bg-surface-tint/60 px-6 py-14 text-center">
            <p className="ui-text max-w-md text-sm leading-relaxed text-muted">
              {s.gallery.featuredEmpty}
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="mt-8 flex items-start gap-3">
            {columnList.map((col, ci) => (
              <div key={ci} className="flex min-w-0 flex-1 flex-col gap-3">
                {col.map(({ item, index }) => (
                  <GalleryTile
                    key={item.id}
                    item={item}
                    lang={lang}
                    onOpen={() => openAt(index)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ---- Colophon / storage note ---- */}
        <div className="mt-8 flex items-start gap-3.5 rounded-xl border border-line bg-surface-tint p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand">
            <Camera className="h-5 w-5" aria-hidden />
          </span>
          <p className="ui-text pt-1 text-sm leading-relaxed text-muted">
            {s.gallery.note}
          </p>
        </div>

        {/* ---- Lightbox ----
            Portalled to <body> (same trick as the blog TOC): rendered inline
            it lives inside <main>'s `relative z-10` stacking context, so even
            at z-50 the whole overlay painted BELOW the sticky z-40 capsule
            nav — on mobile the photo's top edge was covered by the nav bar.
            Outside of main it also stays clear of the route-fade transform. */}
        {openIdx !== null && active
          ? createPortal(
              <div
            ref={overlayRef}
            className={
              (closing ? "gb-overlay-out " : "gb-overlay-in ") +
              "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6"
            }
            role="presentation"
            onClick={(e) => {
              // Clicking ANY non-interactive surface closes the lightbox — the
              // backdrop, the photo, the caption, the image stage… only actual
              // controls (Close button, download link) are exempt, and they
              // close/navigate through their own handlers.
              if (closingRef.current) return;
              const t = e.target as HTMLElement;
              if (t.closest("button, a, [role='button'], input, select, textarea, label, summary")) {
                return;
              }
              requestClose();
            }}
          >
            {/* Frosted dim behind everything (no own handler — the overlay
                root's non-button click close covers it). */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-hidden
            />

            {wide && paneImage ? (
              /* Desktop / two-pane: the left image column is EXACTLY as large as
                 the fitted photo (paneImage hugs the photo's own aspect), so a
                 portrait renders tall with no black side margins; the caption
                 lives in a fixed-width rail on the right. The card takes the
                 natural height of whichever pane is taller — the equal-height
                 rule was dropped with this change (2026-09-04). Panel entrance
                 (expand from the clicked thumbnail) is driven by inline FLIP
                 styles from the useLayoutEffect above, not a CSS animation. */
              <figure
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={s.gallery.title}
                className="relative z-10 flex rounded-2xl border border-line bg-surface text-ink shadow-2xl outline-none"
                style={{ width: paneImage.imgW + railW }}
              >
                <div
                  className="relative flex-none self-center overflow-hidden bg-black/95"
                  style={{ width: paneImage.imgW, height: paneImage.imgH }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={active.id}
                    src={active.large}
                    alt={active.alt.trim() || describe(active, lang)}
                  className="gb-img-in block h-full w-full select-none"
                />
                {stageControls()}
                {closeButton}
              </div>
                <aside
                  style={{
                    ...accentVars(active),
                    width: railW,
                    maxHeight: box.h,
                  }}
                  className="
                    flex
                    min-h-0
                    flex-col
                    overflow-y-auto
                    bg-surface
                    px-8
                    py-7
                  "
                >
                  {captionContent(active, true)}
                </aside>
              </figure>
            ) : (
              /* Narrow / stacked fallback (below LIGHTBOX_TWO_COL px): image over
                 the caption as before, but the card has no fixed height and tall
                 content is reached by scrolling the overlay itself. */
              <figure
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={s.gallery.title}
                className="relative z-10 flex h-[min(90vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-2xl outline-none"
              >
                <div className="relative flex h-[min(52vh,540px)] flex-none items-center justify-center overflow-hidden bg-black/95">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={active.id}
                    src={active.large}
                    alt={active.alt.trim() || describe(active, lang)}
                    className="gb-img-in h-full w-full object-contain select-none"
                  />
                  {stageControls()}
                  {closeButton}
                </div>
                <div
                  style={accentVars(active)}
                  className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-surface p-6 md:p-8"
                >
                  {captionContent(active, false)}
                </div>
              </figure>
            )}
              </div>,
              document.body,
            )
          : null}
      </div>
    </section>
  );
}

/**
 * Main heading of the opened card: the per-language `title`. Until the user
 * writes one it falls back to the place line, then to the month-year.
 */
function bigTitle(item: GalleryItem, lang: Lang): string {
  const title = localized(item, "title", lang);
  if (title) return title;
  const place = locText(item, lang);
  if (place) return place;
  return formatYearMonth(item.date, lang);
}

/**
 * Frosted chip text over the lightbox image: year-month · country code ·
 * coordinates (each piece only when present). Returns "" when there is nothing
 * to show so the caller can omit the chip entirely.
 */
function photoMeta(item: GalleryItem, lang: Lang): string {
  const when = formatYearMonth(item.date, lang);
  const cc = item.country_code.trim();
  const coord = coordsLine(item);
  return [when, cc, coord].filter(Boolean).join(" · ");
}

/**
 * Tinted square chip that hosts a photo's travel-stamp badge — small on the
 * masonry hover card, large as the caption rail's emblem/seal. Colour comes
 * from the --tile-accent / --tile-soft CSS vars set by the nearest accentVars.
 * The caller supplies the full box geometry (size + rounding) so the same
 * component scales from h-7 tile chip to the ~40%-of-rail emblem.
 */
function StampBadge({
  preset,
  box,
  mark,
}: {
  preset: string;
  box: string;
  mark: string;
}) {
  return (
    <span
      aria-hidden
      className={
        "relative flex shrink-0 items-center justify-center bg-[var(--tile-soft)] text-[var(--tile-accent)] " +
        box
      }
    >
      <span className="pointer-events-none absolute inset-[3%] rounded-full border-[1.5px] border-dashed border-current opacity-90" />
      <span className="pointer-events-none absolute inset-[12%] rounded-full border border-current opacity-45" />
      <TravelStamp preset={preset} className={`relative z-10 ${mark}`} />
    </span>
  );
}

/**
 * Decorative one-dot location map shown in the open card's caption between the
 * title and the alt quote. Minimal world outline (external asset, as-is) with
 * EXACTLY ONE breathing marker at the photo's capture point — no pins, labels,
 * grid, zoom or controls, and no map library. Purely decorative: place / date
 * carry the information, so the whole block is aria-hidden.
 *
 * The dot is a <circle> in an overlay <svg> that shares the sheet's viewBox, so
 * it is placed at the RAW projected x/y (projectToWorldMap) — SVG children
 * already use the sheet's user coordinate system, no viewBox-origin arithmetic.
 * The overlay box always matches the <img>'s rendered box (same aspect ratio),
 * so the marker lands exactly on the geographic point at any size. Marker
 * colour is the card accent via --tile-accent (set on the caption rail). The
 * halo only animates when motion is allowed; its resting state is opacity 0, so
 * under prefers-reduced-motion (or before the first tick) it is simply a static
 * dot. Missing / non-finite / off-sheet coords render the map without a marker.
 */
function WorldLocationMap({
  lat,
  lon,
}: {
  lat: number | null;
  lon: number | null;
}) {
  const pt =
    lat !== null && lon !== null ? projectToWorldMap(lat, lon) : null;
  return (
    <div
      aria-hidden
      className="world-map pointer-events-none mx-auto w-[88%] select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WORLD_MAP_SRC}
        alt=""
        draggable={false}
        className="world-map-img block w-full"
      />
      {pt ? (
        <svg
          className="world-map-marker"
          viewBox={`${WORLD_VB.x} ${WORLD_VB.y} ${WORLD_VB.w} ${WORLD_VB.h}`}
          focusable="false"
        >
          <circle className="world-map-halo" cx={pt.x} cy={pt.y} r={11} />
          <circle className="world-map-core" cx={pt.x} cy={pt.y} r={11} />
        </svg>
      ) : null}
    </div>
  );
}

/**
 * One masonry tile. At rest a thin frosted-glass bar floats over the frame's
 * lower edge: a theme-coloured dot + per-language place · YYYY.MM. On hover the
 * frame zooms, the bottom gradient deepens, the whole tile lifts, and the bar
 * morphs into a themed card (bg-surface, so it follows light/dark — Task D #7):
 * travel-stamp badge + theme-coloured place title + muted placeLocal line, a
 * divider, then a relative date — "N days ago" once mounted (left) ·
 * coordinates (right). The card reveal grows to its own height (grid-rows
 * 0fr→1fr), so short and long captions both animate smoothly.
 */
function GalleryTile({
  item,
  lang,
  onOpen,
}: {
  item: GalleryItem;
  lang: Lang;
  onOpen: () => void;
}) {
  const ym = formatYearMonth(item.date, lang);
  const place = localized(item, "place", lang);
  const spot = localized(item, "placeLocal", lang);
  const base = place || spot; // what the resting bar + accent title show
  const big = base || ym;
  const sub = spot && spot !== base ? spot : ""; // grey placeLocal line
  const rest = base ? `${base} · ${formatDotMonth(item.date)}` : ym;
  const coord = coordsLine(item);

  // Hover-card time flips from the absolute month-year to a client-computed
  // "N days ago" (Task D #7). `client` flips true only after hydration (this
  // uses useSyncExternalStore so there is no set-state-in-effect), keeping the
  // first client render identical to the SSG HTML and avoiding a mismatch.
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const ago = daysAgoLabel(item.date, lang);
  const when = client && ago ? ago : ym;

  return (
    <button
      type="button"
      onClick={onOpen}
      data-gid={item.id}
      style={accentVars(item)}
      aria-label={item.alt.trim() || describe(item, lang)}
      className="group relative block w-full overflow-hidden rounded-xl border border-line bg-surface text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-line-strong hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumb}
          alt=""
          loading="lazy"
          decoding="async"
          width={item.width}
          height={item.height}
          style={{ aspectRatio: `${item.width} / ${item.height}` }}
          className="block h-auto w-full transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Bottom gradient deepens on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-50 transition-opacity duration-500 group-hover:opacity-80"
        />

        {/* Caption: frosted bar (rest) morphs into the white card (hover).
            Two stacked rows, each animating its own grid height: rest 1fr→0fr
            as the detail 0fr→1fr grows into place. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-2 z-10 overflow-hidden rounded-lg border border-white/15 bg-black/45 shadow-sm backdrop-blur-md transition-all duration-500 ease-out group-hover:rounded-xl group-hover:border-line group-hover:bg-surface group-hover:shadow-lg"
        >
          {/* Resting frosted line */}
          <div className="grid grid-rows-[1fr] transition-all duration-500 ease-out group-hover:grid-rows-[0fr] group-focus-visible:grid-rows-[0fr]">
            <div className="min-h-0 overflow-hidden">
              <div className="flex h-8 items-center justify-between gap-2 px-2.5 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0 sm:px-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tile-accent)]"
                  />
                  <span className="truncate text-[11px] font-medium tracking-wide text-white/95">
                    {rest}
                  </span>
                </span>
                <ChevronUp
                  className="h-3.5 w-3.5 shrink-0 text-white/70"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {/* Hover white card detail */}
          <div className="grid grid-rows-[0fr] transition-all duration-500 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col px-2.5 py-2 sm:px-3 sm:py-2.5">
                <div className="flex items-start gap-2">
                  <StampBadge
                    preset={item.badge}
                    box="mt-0.5 h-7 w-7 rounded-md"
                    mark="h-5.5 w-5.5"
                  />
                  <div className="min-w-0">
                    <p className="font-serif line-clamp-2 text-[13px] leading-snug font-bold text-[var(--tile-accent)]">
                      {big}
                    </p>
                    {sub ? (
                      <p className="mt-0.5 truncate text-[10.5px] font-medium text-muted">
                        {sub}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-line pt-1">
                  <span className="text-[10.5px] font-semibold text-ink tabular-nums">
                    {when}
                  </span>
                  {coord ? (
                    <span className="truncate text-[10px] tracking-wide text-muted/80 tabular-nums">
                      {coord}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
