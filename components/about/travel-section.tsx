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
import { SectionMark } from "@/components/layout/section-mark";
import { TravelBoard } from "@/components/about/travel-board";

/** Cross link copy for the /travel hub (2026-09-25). */
const HUB_LINK: Record<Lang, { text: string; label: string }> = {
  en: { text: "Interactive trip logs (beta) now live at", label: "Travel" },
  zh: { text: "交互式旅行志（beta）已上线，见", label: "旅行志" },
};

export function TravelSection({
  lang,
  data,
}: {
  lang: Lang;
  data: TravelData;
}) {
  const s = copy[lang].about;
  const hub = HUB_LINK[lang];

  return (
    <section className="mt-14" aria-label={s.travelSectionTitle}>
      <div className="mb-5 border-b border-line pb-3">
        <h2
          id="travel"
          className="flex scroll-mt-28 items-center gap-3.5 text-2xl font-semibold tracking-tight"
        >
          <SectionMark id="travel" />
          {s.travelSectionTitle}
        </h2>
        <p className="ui-text mt-2 text-sm text-muted">
          {hub.text}{" "}
          <a
            href={lang === "zh" ? "/travel/zh" : "/travel"}
            className="font-semibold text-brand hover:underline"
          >
            {hub.label} →
          </a>
        </p>
      </div>
      <TravelBoard lang={lang} data={data} />
    </section>
  );
}
