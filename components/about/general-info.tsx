/**
 * About "General Information" block (2026-09-05, user-supplied facts only):
 * §-titled definition list (same header grammar as TravelSection) with the
 * name variants, date of birth, languages and hometown. Server component —
 * the values are constants here; only the labels localize via i18n.
 */

import type { ReactNode } from "react";
import { copy, type Lang } from "@/lib/i18n";

/** Same in both languages (already multilingual as given). */
const NAME = "彭拓锐 · Tuorui Peng · To-Joei Paang";
const HOMETOWN = "Shenzhen, Guangdong, China";
const LANGS = [
  "汉语, 粵語 (Native)",
  "English (Fluent)",
  "Français, 日本語 (Beginner)",
];

const DOB: Record<Lang, string> = {
  en: "29th November 2001",
  zh: "2001年11月29日",
};

export function GeneralInfo({ lang }: { lang: Lang }) {
  const s = copy[lang].about;
  const rows: Array<[string, ReactNode]> = [
    [s.generalName, NAME],
    [s.generalDob, DOB[lang]],
    [
      s.generalLangs,
      <ul key="langs" className="space-y-0.5">
        {LANGS.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>,
    ],
    [s.generalHome, HOMETOWN],
  ];

  return (
    <section className="mt-14" aria-label={s.generalTitle}>
      <div className="mb-5 border-b border-line pb-3">
        <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="font-serif text-xl italic font-normal leading-none text-brand"
          >
            §
          </span>
          {s.generalTitle}
        </h2>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-[11rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="ui-text text-[11px] font-semibold uppercase tracking-[0.16em] text-faint sm:pt-0.5">
              {label}
            </dt>
            <dd className="text-[0.97rem] leading-relaxed text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
