/**
 * About "General Information" block (2026-09-05, user-supplied facts only):
 * §-titled definition list (same header grammar as TravelSection) with the
 * name variants, date of birth, languages and hometown.
 *
 * 2026-09-07 merge (user direction): the prose `## Personal Information` /
 * `## 个人信息` section was folded in here — the narrative bullets (pseudonym
 * origin, English-name trivia, growing-up cities, schools, physics→stats)
 * render as markdown below the table, so the name facts live in exactly one
 * place. The prose body (en.md / zh.md) now only carries the greeting and the
 * Hobbies section; the page renders intro prose → this block → hobbies prose.
 * Server component — the values are constants here; only the labels localize
 * via i18n. The markdown (links, `<span class="heimu">` spoilers) goes through
 * the shared Prose renderer; ProseBehavior (mounted once on the page) handles
 * the touch-tap spoiler toggling.
 */

import type { ReactNode } from "react";
import { Prose } from "@/components/content/prose";
import { SectionMark } from "@/components/layout/section-mark";
import { copy, type Lang } from "@/lib/i18n";

/** Same in both languages (already multilingual as given). */
const NAME = "彭拓锐 · Tuorui Peng · To-Joei Paang";
const HOMETOWN = "Shenzhen, Guangdong, China";
const LANGS = [
  "汉语, 粵語 (Native)",
  "English (Fluent)",
  "Français, 日本語 (Beginner)",
];

/** Narrative bullets formerly under the prose `## Personal Information`. */
const NARRATIVE: Record<Lang, string> = {
  en: `- I keep a semi-real-name presence online; my usual pseudonym is v1ncent19, where v**1**n is used to avoid duplication, and cent**19** comes from the year of my undergraduate enrollment (the name spellings and romanizations are in the table above). You can call me "Vincent" or "Vincent nineteen".
- [SZSHS](https://www.cn-school.com/swkz/index/index.html) @ 2013 → [THU](https://www.tsinghua.edu.cn/en/) @ 2019 → [NU](https://www.northwestern.edu/) @ 2023. <span class="heimu">(Shared feature: the theme colors of the schools are all purple.)</span>
- Previously a physics student, now a statistics student.`,
  zh: `- 本人目前基本处于半实名上网状态，姓名的写法和发音见上表；在绝大多数地方的马甲是 v1ncent19，其中 v**1**n 用于避免重名，cent**19** 继承自本科入学年份，念法直接采用 "Vincent" 或 "Vincent 幺九" 等即可。
- 可能有些人会以为本人英文名的来源是 Vincent van Gogh，但实际上是来自于小说/电影《[火星救援](https://en.wikipedia.org/wiki/The_Martian_(film))》中的火星任务 Director, Vincent Kapoor。
  - 极少数情况为了消歧我会使用 Ventresca 的后缀，来源于《[Angels & Demons](https://en.wikipedia.org/wiki/Angels_%26_Demons_(film))》中的总务枢机 Patrick McKenna Ventresca。
- 半土著深圳人，另有相当长的幼年时期在湛江生活；所以你要问我"你觉得你是粤语母语者吗"，我会说"我觉得我是"。
- [SZSHS](https://www.cn-school.com/swkz/index/index.html) @ 2013 → [THU](https://www.tsinghua.edu.cn/en/) @ 2019 → [NU](https://www.northwestern.edu/) @ 2023。<span class="heimu">（共同特点：学校的 theme color 都是紫色。）</span>
- 物理学跑路统计学学生。`,
};

export function GeneralInfo({ lang }: { lang: Lang }) {
  const s = copy[lang].about;
  const rows: Array<[string, ReactNode]> = [
    [s.generalName, NAME],
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
        <h2
          id="general"
          className="flex scroll-mt-28 items-center gap-3.5 text-2xl font-semibold tracking-tight"
        >
          <SectionMark id="general" />
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
      <div className="mt-7">
        <Prose source={NARRATIVE[lang]} />
      </div>
    </section>
  );
}
