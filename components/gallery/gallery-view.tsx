import { ArrowDownUp, Camera, Image as ImageIcon, MapPin, Shuffle } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

/**
 * Gallery page body, mirroring the Stitch "gallery — desktop masonry" content
 * area but speaking the home palette and only real facts. The old site has no
 * travel photographs yet (see CONTENT_MIGRATION_AUDIT), so the page renders the
 * archive shell — intro, census tile, sort strip — above an honest empty state
 * and a storage colophon, ready for frames to arrive during migration.
 */
export function GalleryView({ lang }: { lang: Lang }) {
  const s = copy[lang];
  const unit = lang === "zh" ? "张" : "frames";

  const sortActions = [
    { icon: ArrowDownUp, label: s.gallery.byDate },
    { icon: MapPin, label: s.gallery.byPlace },
    { icon: Shuffle, label: s.gallery.shuffle },
  ];

  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        {/* ---- Header / intro (gallery-refined intro block) ---- */}
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

          {/* Census tile (mirrors the mock's coordinate stamp) */}
          <div className="flex shrink-0 items-center gap-4 self-start rounded-xl border border-line bg-surface p-4 shadow-sm md:self-auto">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-sink text-brand">
              <Camera className="h-6 w-6" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="ui-text text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {s.gallery.statLabel}
              </span>
              <span className="font-serif text-2xl font-bold leading-tight text-ink">
                0<span className="ml-1.5 text-base font-medium text-muted">{unit}</span>
              </span>
            </div>
          </div>
        </header>

        {/* ---- Sort strip (mirrors mock; inert until photos exist) ---- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface-tint px-4 py-3">
          <span className="ui-text text-xs font-medium uppercase tracking-widest text-muted">
            {s.gallery.filterLabel}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {sortActions.map(({ icon: Icon, label }) => (
              <span
                key={label}
                title={s.gallery.unavailable}
                aria-disabled="true"
                className="ui-text inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-semibold text-faint opacity-80"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ---- Masonry area: honest empty state until migration ---- */}
        <div className="relative mt-8 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface px-6 py-20 text-center shadow-sm sm:py-28">
          <ImageIcon
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-8 h-56 w-56 text-brand/10"
            strokeWidth={1}
          />
          <Camera className="mb-4 h-10 w-10 text-brand" strokeWidth={1.4} aria-hidden />
          <h2 className="text-2xl font-semibold tracking-tight">
            {s.gallery.emptyTitle}
          </h2>
          <p className="mt-3 max-w-[52ch] text-[1.02rem] leading-relaxed text-muted">
            {s.gallery.emptyText}
          </p>
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
      </div>
    </section>
  );
}
