import type { Metadata } from "next";
import { labelFor } from "@/content/navigation";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: labelFor("home", "zh"),
};

/**
 * Chinese homepage — currently an empty placeholder so the /zh language toggle
 * has somewhere to land. The user fills in the real Chinese home content later;
 * until then this just signals the section is waiting.
 */
export default function ZhHomePage() {
  const s = copy.zh;
  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-3xl">
        <header className="pt-2 sm:pt-4">
          <p className="ui-text mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {labelFor("home", "zh")}
          </p>
          <h1 className="text-balance text-4xl tracking-tight sm:text-5xl">
            {s.placeholder.label}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-muted">
            {s.placeholder.note}
          </p>
        </header>
      </div>
    </section>
  );
}
