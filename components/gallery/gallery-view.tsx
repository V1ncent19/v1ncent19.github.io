"use client";

import {
  ArrowDownUp,
  Camera,
  ChevronUp,
  Download,
  LayoutGrid,
  MapPin,
  Shuffle,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

type LocalField = "place" | "placeLocal" | "title" | "alt";

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
 * badge chips). Falls back to the site brand while `color` is still empty.
 */
function accentVars(item: GalleryItem): CSSProperties {
  const accent = item.color.trim() || "var(--brand)";
  return {
    "--tile-accent": accent,
    "--tile-soft": `color-mix(in srgb, ${accent} 13%, transparent)`,
  } as CSSProperties;
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

  /** Photos in the current display order (default: newest first). */
  const ordered = useMemo(() => {
    if (mode === "shuffle") return shuffleList(items, shuffleNonce);
    if (mode === "place") {
      return [...items].sort((a, b) => {
        const pa = localized(a, "place", lang).toLowerCase();
        const pb = localized(b, "place", lang).toLowerCase();
        if (!pa && pb) return 1; // unlabelled frames sink to the end
        if (pa && !pb) return -1;
        if (pa !== pb) return pa < pb ? -1 : 1;
        return (b.date || "").localeCompare(a.date || "");
      });
    }
    return [...items].sort(
      (a, b) =>
        (b.date || "").localeCompare(a.date || "") || a.id.localeCompare(b.id),
    );
  }, [items, mode, lang, shuffleNonce]);

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

  function sortTo(next: SortMode) {
    if (next === "shuffle") setShuffleNonce((n) => n + 1);
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
    const T = tileRect.current;
    const unmount = () => {
      triggerRef.current?.focus();
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
   * Close button is NOT here: it is pinned to the overlay so it never drifts.
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
   * Caption content of the opened card (both layouts): title block LEFT (small
   * bold accent place · placeLocal over the big serif title), travel-stamp
   * badge RIGHT. The authored `alt` body (alt_en on the EN route / alt_zh on
   * ZH, falling back to the other language) renders as a bordered info card
   * below the header, mirroring the Stitch sample's description box, and the
   * download button follows that card. The month/country/coords line lives in
   * the frosted chip over the image instead. Everything sits in ONE wrapper so
   * the aside lays it out as a top-aligned column and alt + download stay
   * consecutive (nothing is pinned to the rail bottom any more).
   */
  const captionContent = (item: GalleryItem) => {
    const altText = localized(item, "alt", lang);
    return (
      <div className="flex w-full flex-col gap-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 space-y-2 pt-0.5">
            {/* The accent kicker only accompanies an authored title — until
                `title` is filled it would duplicate the h2, so it is withheld
                and the h2 shows the place by itself. */}
            {locText(item, lang) && localized(item, "title", lang) ? (
              <p className="ui-text flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-[var(--tile-accent)] md:text-sm">
                <MapPin
                  className="h-4 w-4 shrink-0 text-[var(--tile-accent)]"
                  aria-hidden
                />
                <span>{locText(item, lang)}</span>
              </p>
            ) : null}
            <h2 className="font-serif text-2xl leading-tight font-bold break-words text-ink">
              {bigTitle(item, lang)}
            </h2>
          </div>
          <StampBadge
            preset={item.badge}
            box="h-14 w-14 shrink-0 rounded-2xl md:h-16 md:w-16"
            mark="h-9 w-9 md:h-10 md:w-10"
          />
        </div>

        {/* Authored alt/description, Stitch-style info card. Hidden while the
            field is empty so there is never a blank box. */}
        {altText ? (
          <div className="rounded-xl border border-line bg-surface-tint p-5 shadow-sm">
            <p className="font-serif text-[15px] leading-relaxed text-muted italic">
              {altText}
            </p>
          </div>
        ) : null}

        {item.originalUrl ? (
          <a
            href={item.originalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ui-text inline-flex items-center gap-2.5 self-start rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand shadow-sm transition hover:bg-brand-strong hover:no-underline"
          >
            <Download className="h-4 w-4" aria-hidden />
            {s.gallery.downloadOriginal}
          </a>
        ) : null}
      </div>
    );
  };

  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        {/* ---- Header / intro ---- */}
        <header className="flex flex-col justify-between gap-6 pb-8 md:flex-row md:items-end">
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
            </div>
          </div>

          {/* Column count: 3 / 4 / 5, default 4 (buttons that cannot fit are dimmed) */}
          <div className="ml-auto flex items-center gap-2.5">
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

        {/* ---- Masonry grid (explicit columns) ---- */}
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

        {/* ---- Colophon / storage note ---- */}
        <div className="mt-8 flex items-start gap-3.5 rounded-xl border border-line bg-surface-tint p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand">
            <Camera className="h-5 w-5" aria-hidden />
          </span>
          <p className="ui-text pt-1 text-sm leading-relaxed text-muted">
            {s.gallery.note}
          </p>
        </div>

        {/* ---- Lightbox ---- */}
        {openIdx !== null && active ? (
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

            {/* Close is pinned to the overlay (viewport-fixed), NOT the image
                stage, so it never drifts between photos of different aspect. */}
            <button
              type="button"
              aria-label={s.gallery.close}
              title={s.gallery.close}
              onClick={requestClose}
              className="fixed top-3 right-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:top-4 sm:right-4"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>

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
                    alt={localized(active, "alt", lang) || describe(active, lang)}
                    className="gb-img-in block h-full w-full select-none"
                  />
                  {stageControls()}
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
                  {captionContent(active)}
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
                    alt={localized(active, "alt", lang) || describe(active, lang)}
                    className="gb-img-in h-full w-full object-contain select-none"
                  />
                  {stageControls()}
                </div>
                <div
                  style={accentVars(active)}
                  className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-surface p-6 md:p-8"
                >
                  {captionContent(active)}
                </div>
              </figure>
            )}
          </div>
        ) : null}
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
 * Tinted square chip that hosts a photo's travel-stamp badge. Colour comes
 * from the --tile-accent / --tile-soft CSS vars set by the nearest accentVars.
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
        "flex shrink-0 items-center justify-center rounded-lg bg-[var(--tile-soft)] text-[var(--tile-accent)] " +
        box
      }
    >
      <TravelStamp preset={preset} className={mark} />
    </span>
  );
}

/**
 * One masonry tile. At rest a thin frosted-glass bar floats over the frame's
 * lower edge: a theme-coloured dot + per-language place · YYYY.MM. On hover the
 * frame zooms, the bottom gradient deepens, the whole tile lifts, and the bar
 * morphs into a white card: travel-stamp badge + theme-coloured place title +
 * grey placeLocal line, a divider, then month-year (left) · coordinates
 * (right). The white-card reveal grows to its own height (grid-rows 0fr→1fr),
 * so short and long captions both animate smoothly.
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

  return (
    <button
      type="button"
      onClick={onOpen}
      data-gid={item.id}
      style={accentVars(item)}
      aria-label={localized(item, "alt", lang) || describe(item, lang)}
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
          className="pointer-events-none absolute inset-x-2 bottom-2 z-10 overflow-hidden rounded-lg border border-white/15 bg-black/45 shadow-sm backdrop-blur-md transition-all duration-500 ease-out group-hover:rounded-xl group-hover:border-white/40 group-hover:bg-white/95 group-hover:shadow-lg"
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
                    mark="h-5 w-5"
                  />
                  <div className="min-w-0">
                    <p className="font-serif line-clamp-2 text-[13px] leading-snug font-bold text-[var(--tile-accent)]">
                      {big}
                    </p>
                    {sub ? (
                      <p className="mt-0.5 truncate text-[10.5px] font-medium text-[#46545c]">
                        {sub}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-black/10 pt-1">
                  <span className="text-[10.5px] font-semibold text-[#161a1c] tabular-nums">
                    {ym}
                  </span>
                  {coord ? (
                    <span className="truncate text-[10px] tracking-wide text-[#46545c]/80 tabular-nums">
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
