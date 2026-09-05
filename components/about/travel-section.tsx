/**
 * About "travel log" section (2026-09-05) — a standalone part that sits
 * between the prose Hobbies block and the sealed-facts board. It was split out
 * of the board's former "on the road" envelope (which keeps only its two
 * chatter bullets) so that envelope stays short and the checklist + map get
 * room to breathe. Header grammar mirrors the facts board's (§ + h2 + border-b);
 * the per-list counts live in TravelBoard's legend toggles, not here.
 */

import { copy, type Lang } from "@/lib/i18n";
import type { TravelData } from "@/lib/content";
import { TravelBoard } from "@/components/about/travel-board";

export function TravelSection({
  lang,
  data,
}: {
  lang: Lang;
  data: TravelData;
}) {
  const s = copy[lang].about;

  return (
    <section className="mt-14" aria-label={s.travelSectionTitle}>
      <div className="mb-5 border-b border-line pb-3">
        <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="font-serif text-xl italic font-normal leading-none text-brand"
          >
            §
          </span>
          {s.travelSectionTitle}
        </h2>
      </div>
      <TravelBoard lang={lang} data={data} />
    </section>
  );
}
