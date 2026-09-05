"use client";

/**
 * About "sealed facts" board (prototype v2, 2026-09-05).
 *
 * v1 was 13 individual stamp cards, some hiding a second seal "on the back" —
 * too many clicks. v2 groups the same facts VERBATIM into 5 themed envelopes:
 * one seal per envelope, breaking it unfolds the whole category at once. The
 * meme-iest one-liners ride inline as heimu spoiler bars instead of card backs.
 *
 * PROTOTYPE NOTES:
 * - Facts are transplanted VERBATIM from content/about/{en,zh}.md ("More
 *   random things" / "不正经爱好") — no new facts were invented. Grouping and
 *   wording are proposal drafts; the data below is trivially editable.
 * - Everything stays in the static HTML (the seals are presentation only).
 * - Expand/collapse uses the proven grid-rows 0fr↔1fr pattern, the
 *   reduced-motion global rule applies.
 */

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { copy, type Lang } from "@/lib/i18n";
import type { PersonalityData } from "@/lib/content";
import { PersonalityTimeline } from "@/components/about/personality-timeline";

/** External/internal link with the site's cyan underline treatment. */
function L({
  href,
  title,
  children,
}: {
  href: string;
  title?: string;
  children: ReactNode;
}) {
  const ext = href.startsWith("http");
  return (
    <a
      href={href}
      title={title}
      {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-brand underline decoration-brand/45 underline-offset-2 transition-colors hover:text-brand-strong hover:decoration-brand-strong"
    >
      {children}
    </a>
  );
}

interface FactGroup {
  id: string;
  /** Category name printed on the sealed envelope. */
  tag: string;
  /** Facts revealed together when the seal is broken. */
  items: ReactNode[];
}

const FACT_GROUPS: Record<Lang, FactGroup[]> = {
  en: [
    {
      id: "esports",
      tag: "esports & games",
      items: [
        <>
          An esports viewer — a fan of <L href="https://g2esports.com/">G2 ESPORTS</L>{" "}
          and of <L href="https://twitter.com/G2Caps">Rasmus &quot;Caps&quot; Winther</L>.
        </>,
        <>Also a gamer: CS2 / HoK / DSP / KSP.</>,
      ],
    },
    {
      id: "screens",
      tag: "screens & pages",
      items: [
        <>
          Favourite anime:{" "}
          <L href="https://summerghost.jp/">『サマーゴースト』 (Summer Ghost)</L>{" "}
          and{" "}
          <L href="https://justbecause.jp/">『ジャストビコーズ』 (Just Because!)</L>.
        </>,
        <>
          Favourite artists:{" "}
          <L href="https://fr.wikipedia.org/wiki/Auguste_Renoir">
            Pierre-Auguste Renoir
          </L>{" "}
          and <L href="https://www.pixiv.net/users/772547">loundraw</L>.
        </>,
        <>
          Science fiction novel enthusiast; favourite authors include{" "}
          <L href="https://zh.wikipedia.org/wiki/刘慈欣">Cixin Liu</L>,{" "}
          <L href="https://zh.wikipedia.org/wiki/刘宇昆">Ken Liu</L> and{" "}
          <L href="https://en.wikipedia.org/wiki/Isaac_Asimov">Isaac Asimov</L>.
        </>,
        <>
          Favourite music mainly ranges in{" "}
          <L href="http://163cn.tv/yazW5l0" title="Recommendation: Glenn Gould">
            classical
          </L>
          ,{" "}
          <L href="http://163cn.tv/yazVo3n" title="Recommendation: ユイカ">
            j-pop
          </L>{" "}
          and{" "}
          <L href="http://163cn.tv/yaz01aM" title="Recommendation: V.K 克">
            light music
          </L>
          .
        </>,
        <>
          My avatar is from{" "}
          <L href="https://www.pixiv.net/artworks/675540">Pixiv</L>.
        </>,
        <>
          A fan of a certain small creature:{" "}
          <L href="https://www.facebook.com/capoocat">Bugcat Capoo</L>.
        </>,
      ],
    },
    {
      id: "daily",
      tag: "daily life",
      items: [
        <>
          Cooking; you are welcome to visit the cooking posts under{" "}
          <L href="/blog">Blog</L> to see my research results; favourite
          cuisines are Cantonese and French, least favourite is American.
        </>,
        <>
          <L href="https://www.lego.com/en-us">LEGO</L> MOC enthusiast,
          especially mechanical sets.
        </>,
      ],
    },
    {
      id: "roads",
      tag: "on the road",
      items: [
        <>
          A museum enthusiast; the primary destination of most travel is the
          local museum or art gallery.
        </>,
        <>An incoming traveller, currently seriously troubled by visa issues = =</>,
      ],
    },
    {
      id: "myself",
      tag: "myself",
      items: [<>Social phobia (?).</>],
    },
  ],
  zh: [
    {
      id: "esports",
      tag: "电竞与游戏",
      items: [
        <>
          LoL &amp; CS2 赛事观众，<L href="https://g2esports.com/">G2 ESPORTS</L>{" "}
          队粉，<L href="https://twitter.com/G2Caps">Rasmus &quot;Caps&quot; Winther</L>{" "}
          个人粉。
        </>,
        <>游戏也打：CS2 / 农 / 戴森球计划 / KSP。</>,
      ],
    },
    {
      id: "screens",
      tag: "屏幕与纸页",
      items: [
        <>
          喜欢的番是{" "}
          <L href="https://summerghost.jp/">『サマーゴースト』 (Summer Ghost)</L>{" "}
          和{" "}
          <L href="https://justbecause.jp/">『ジャストビコーズ』 (Just Because!)</L>
          。<span className="heimu">（日语是个好语言，片假名地狱除外。）</span>
        </>,
        <>
          喜欢的艺术家是{" "}
          <L href="https://fr.wikipedia.org/wiki/Auguste_Renoir">
            Pierre-Auguste Renoir
          </L>{" "}
          和 <L href="https://www.pixiv.net/users/772547">loundraw</L>。
        </>,
        <>
          科幻小说爱好者，喜欢的作家笼统来说有{" "}
          <L href="https://zh.wikipedia.org/wiki/刘慈欣">刘慈欣</L>、
          <L href="https://zh.wikipedia.org/wiki/刘宇昆">刘宇昆</L> 和{" "}
          <L href="https://en.wikipedia.org/wiki/Isaac_Asimov">Isaac Asimov</L>
          ，还可以加上{" "}
          <L href="https://en.wikipedia.org/wiki/Philip_K._Dick">Philip K. Dick</L>。
        </>,
        <>
          喜爱的音乐主要分布于{" "}
          <L href="http://163cn.tv/yazW5l0" title="推荐：Glenn Gould">古典</L>
          、<L href="http://163cn.tv/yazVo3n" title="推荐：ユイカ">二次元</L>
          和<L href="http://163cn.tv/yaz01aM" title="推荐：V.K 克">轻音乐</L>。
        </>,
        <>
          <L href="https://github.com/V1ncent19">头像</L> 出处见{" "}
          <L href="https://www.pixiv.net/artworks/675540">Pixiv</L>。
        </>,
        <>
          <L href="https://www.facebook.com/capoocat">猫猫虫 capoo</L> 爱好者。
        </>,
      ],
    },
    {
      id: "daily",
      tag: "烟火气",
      items: [
        <>
          烹饪；菜但爱玩，邀请大家前往 <L href="/blog">博客</L>{" "}
          的做饭标签观看本人的研发成果；喜欢的菜系是粤菜和法餐，不喜欢的菜系是美国菜。
        </>,
        <>
          <L href="https://www.lego.com/en-us">LEGO</L> MOC 爱好者，尤其偏好机械组。
        </>,
      ],
    },
    {
      id: "roads",
      tag: "在路上",
      items: [
        <>博物馆爱好者，去大多数地方旅游的首要目的地是当地博物馆/美术馆。</>,
        <>incoming 的旅游爱好者，目前严重受困于签证问题 = =</>,
      ],
    },
    {
      id: "myself",
      tag: "关于我本人",
      items: [<>社恐(?)。</>],
    },
  ],
};

export function FactsBoard({
  lang,
  personality,
}: {
  lang: Lang;
  personality: PersonalityData;
}) {
  const s = copy[lang].about;
  const groups = FACT_GROUPS[lang];
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  /** Completion moment: every envelope unsealed → chip pops green once. */
  const allDone = opened.size === groups.length;

  /** Data-driven panels appended inside specific envelopes (after the items). */
  const extraPanels: Record<string, ReactNode> = {
    myself: <PersonalityTimeline lang={lang} data={personality} />,
  };

  const breakSeal = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <section className="mt-14" aria-label={s.factsTitle}>
      <div className="mb-5 border-b border-line pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <span
              aria-hidden
              className="font-serif text-xl italic font-normal leading-none text-brand"
            >
              §
            </span>
            {s.factsTitle}
          </h2>
          <span
            className={`ui-text inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs tracking-wide tabular-nums transition-colors duration-300 ${
              allDone ? "facts-chip-done" : "border-line text-muted"
            }`}
          >
            {allDone ? (
              <Check size={12} strokeWidth={3} aria-hidden className="facts-chip-check" />
            ) : null}
            {s.factsDiscovered} {opened.size} / {groups.length}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted">{s.factsLead}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g, i) => {
          const open = opened.has(g.id);
          return (
            <article
              key={g.id}
              data-fact={g.id}
              className={`rounded-xl border p-4 transition-all duration-300 sm:p-5 ${
                open
                  ? "border-line bg-surface shadow-sm"
                  : "border-dashed border-brand/40 bg-transparent hover:-translate-y-0.5 hover:bg-surface"
              }`}
            >
              <button
                type="button"
                onClick={() => breakSeal(g.id)}
                aria-expanded={open}
                className="group flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 flex-none -rotate-6 items-center justify-center rounded-md text-[11px] font-semibold tracking-wide transition-colors duration-300 ${
                    open
                      ? "border border-solid border-brand bg-brand text-on-brand"
                      : "border border-dashed border-brand/60 text-brand group-hover:border-solid group-hover:bg-brand group-hover:text-on-brand"
                  }`}
                >
                  {open ? <Check size={16} aria-hidden /> : `№${i + 1}`}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {g.tag}
                  </span>
                  <span className="block text-xs text-muted">
                    {open ? s.factsOpened : s.factsSealed}
                  </span>
                </span>
              </button>

              <div
                aria-hidden={!open}
                className={`grid transition-all duration-300 ease-out ${
                  open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul className="space-y-2.5">
                    {g.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex gap-2.5 text-[15px] leading-relaxed text-ink"
                      >
                        <span
                          aria-hidden
                          className="mt-[0.55em] h-1 w-1 flex-none rounded-full bg-brand/60"
                        />
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                  {extraPanels[g.id] ? (
                    <div className="mt-4 border-t border-line pt-3">
                      {extraPanels[g.id]}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
