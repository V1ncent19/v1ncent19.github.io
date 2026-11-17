import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionMark } from "@/components/layout/section-mark";
import intro from "@/content/playground/intro.json";
import { PLAYGROUND_PATH } from "@/content/site/navigation";
import { pick, type Lang } from "@/lib/localized";

export function PlaygroundIntro({ lang }: { lang: Lang }) {
  return (
    <section aria-labelledby="atelier-du-vitrail">
      <h2 id="atelier-du-vitrail" className="flex scroll-mt-28 items-center gap-3.5 text-2xl font-semibold tracking-tight">
        <SectionMark id="atelier-du-vitrail" />
        <span lang="fr">{intro.name}</span>
      </h2>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">{pick(intro.description, lang)}</p>
      <Link href={PLAYGROUND_PATH} prefetch={false}
        className="group mt-4 inline-flex items-center gap-2 font-semibold text-brand">
        {pick(intro.linkLabel, lang)}
        <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
