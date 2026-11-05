"use client";

import { useEffect, useMemo, useRef } from "react";
import type { LogChapter, LogLang } from "@/lib/travel/log/types";
import type { ReconstructedData, ReconstructedDay, ReconstructedReview } from "@/lib/travel/reconstructed";
import { MAP_SPLIT_EVENT } from "@/lib/travel/map-split";
import ChapterNavigation from "./log/ChapterNavigation";
import TravelLogFacts from "./log/TravelLogFacts";
import TravelLogScrollCue from "./log/TravelLogScrollCue";
import type { ReconstructedReading } from "./ReconstructedTravelLog";

const CUISINE_URL = "/blog/2024/fr2024-cuisine/";

const MEAL_EN: Record<string, string> = { "晚餐": "Dinner", "午餐": "Lunch", "下午茶": "Afternoon tea" };
type DiningVisit = ReconstructedReview["visits"][number];

function ChapterTitle({ title }: { title: string }) {
  const bilingual = title.match(/^(.*[\p{Script=Han}])(?:\s*[·／-]\s*|\s+)([A-Za-zÀ-ÿ][^\p{Script=Han}]*)$/u);
  return <h3>{bilingual
    ? <><span>{bilingual[1]}</span><small className="fr-block-title-original">{bilingual[2]}</small></>
    : title}</h3>;
}

function RestaurantChapter({ review, visit, lang, dayId, revisit = false }: {
  review: ReconstructedReview; visit: DiningVisit; lang: LogLang; dayId: string; revisit?: boolean;
}) {
  const paragraphs = review.text.split(/\n\s*\n/).filter(Boolean);
  const sourceUrl = `${CUISINE_URL}#${review.sourceAnchor}`;
  if (revisit) return <article id={`${review.id}-${dayId}`} className="fr-block fr-block-dining fr-review fr-review-revisit" data-fr-review={review.id} data-fr-place={review.placeId ?? ""}>
    <div className="fr-review-heading"><div><span className="fr-review-kicker">{lang === "zh" ? `再次到访 · ${visit.meal}` : `Return visit · ${MEAL_EN[visit.meal]}`}{visit.time && ` · ${visit.time}`}</span><h3>{review.title}</h3></div></div>
    <p className="fr-review-return-note">{lang === "zh" ? "餐馆简评见首次到访记录。" : "The review appears at the first visit."} <a href={`#${review.id}-day-${review.visits[0].date.slice(5).replace("-", "")}`} className="fr-review-return-link">{lang === "zh" ? "阅读首次简评 ↗" : "Read first review ↗"}</a></p>
  </article>;
  return <article id={`${review.id}-${dayId}`} className="fr-block fr-block-dining fr-review" data-fr-review={review.id} data-fr-place={review.placeId ?? ""}>
    <div className="fr-review-heading">
      <div className="fr-review-heading-main"><div className="fr-review-meta"><span className="fr-review-kicker">{lang === "zh" ? `餐馆 · ${visit.meal}` : `Dining · ${MEAL_EN[visit.meal]}`}{visit.time && ` · ${visit.time}`}</span><a className="fr-review-source" href={sourceUrl}>{lang === "zh" ? "原餐馆简评 ↗" : "Original review ↗"}</a></div><h3>{review.title}</h3></div>
      {review.score !== null && <span className="fr-review-score">{review.score}<small>/10</small></span>}
    </div>
    {paragraphs.map((paragraph, index) => {
      const order = paragraph.trim().match(/^([^\n]+?)\s+(\d+(?:[.,]\d+)?\s*€)$/);
      return order
        ? <div className="fr-review-order" key={index}><span className="fr-review-order-label">{lang === "zh" ? "点单" : "Order"}</span><span className="fr-review-dishes">{order[1]}</span><span className="fr-review-cost">{order[2]}</span></div>
        : <p className="fr-review-commentary" key={index}>{paragraph}</p>;
    })}
  </article>;
}

function DayChapter({ day, index, data, lang }: {
  day: ReconstructedDay; index: number; data: ReconstructedData; lang: LogLang;
}) {
  const visits = data.reviews.flatMap(review => review.visits.map((visit, index) => ({ review, visit, revisit: index > 0 })).filter(item => item.visit.date === day.date));
  const order = new Map(day.blocks.map((block, index) => [block.id, index]));
  visits.sort((a, b) => (order.get(a.visit.afterBlockId) ?? Infinity) - (order.get(b.visit.afterBlockId) ?? Infinity) || (a.visit.time ?? "").localeCompare(b.visit.time ?? ""));
  return <section id={day.id} className="fr-day" data-log-section={day.id} data-fr-day={day.id}>
    <div className="fr-day-capsule">
      <span className="fr-day-capsule-dot" aria-hidden="true" />
      <strong>{lang === "zh" ? `第 ${index + 1} 日：${day.title}` : `Day ${index + 1}: ${day.subtitle}`}</strong>
      <time dateTime={day.date}>{day.date.slice(5)}</time>
    </div>
    <div className="fr-day-heading">
      <h2>{day.title}</h2><p className="fr-day-subtitle">{day.subtitle}</p>
      {day.weather && <p className="fr-day-weather"><span className="fr-weather-glyph" aria-hidden="true" />{day.weather.replace(/^(?:2024-\d{2}-\d{2}（承上下文）·\s*)?(?:\d{1,2}\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*|周[一二三四五六日]\s*·?\s*)/, "").trim()}</p>}
    </div>
    <div className="fr-blocks">
      {day.blocks.map(block => <div key={block.id} className="fr-visit-group">
        <article className="fr-block" data-fr-block={block.id} data-fr-place={block.focusPlaceId ?? ""}>
          <ChapterTitle title={block.title} />
          {block.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </article>
        {visits.filter(item => item.visit.afterBlockId === block.id).map(({ review, visit, revisit }) => <RestaurantChapter key={`${review.id}-${visit.date}`} review={review} visit={visit} lang={lang} dayId={day.id} revisit={revisit} />)}
      </div>)}
      {!day.blocks.length && <p className="fr-empty">{lang === "zh" ? "（已回家）" : "The journey home began in Paris, bringing this spring trip to a close."}</p>}
      {visits.filter(item => !order.has(item.visit.afterBlockId)).map(({ review, visit, revisit }) => <RestaurantChapter key={`${review.id}-${visit.date}`} review={review} visit={visit} lang={lang} dayId={day.id} revisit={revisit} />)}
    </div>
    {day.events.length > 0 && <details className="fr-evidence">
      <summary>{lang === "zh" ? `查看到访时刻（${day.events.length} 条）` : `Time Table (${day.events.length})`}</summary>
      <div className="fr-evidence-times">
        <ol>{day.events.map(event => <li key={event.id}><time>{event.time || "—"}</time><span>{event.text.replace(/^\d{1,2}:\d{2}\s*/, "")}</span></li>)}</ol>
      </div>
    </details>}
  </section>;
}

export default function ReconstructedStory({ data, lang, reading, onReading, focus }: {
  data: ReconstructedData; lang: LogLang; reading: ReconstructedReading;
  onReading: (reading: ReconstructedReading) => void;
  focus: { dayId: string; placeId: string | null; nonce: number } | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<ReconstructedReading>(reading);
  const chapters = useMemo<LogChapter[]>(() => data.story.days.map((day, index) => ({
    id: day.id, sectionId: day.id, label: day.title,
    shortLabel: String(index + 1).padStart(2, "0"),
    detail: day.subtitle, meta: day.date.slice(5),
  })), [data.story.days]);

  useEffect(() => {
    if (!focus) return;
    const day = rootRef.current?.querySelector<HTMLElement>(`[data-fr-day="${focus.dayId}"]`);
    if (!day) return;
    const review = focus.placeId ? [...day.querySelectorAll<HTMLElement>("[data-fr-review]")].find(el => el.dataset.frPlace === focus.placeId) : null;
    const block = focus.placeId ? [...day.querySelectorAll<HTMLElement>("[data-fr-block]")].find(el => el.dataset.frPlace === focus.placeId) : null;
    const target = review ?? block ?? day;
    const stacked = window.matchMedia("(max-width: 1023px)").matches;
    const mapBottom = stacked ? document.querySelector<HTMLElement>(".map-col")?.getBoundingClientRect().bottom ?? 0 : 0;
    const readingY = Math.max(0, mapBottom) + (window.innerHeight - Math.max(0, mapBottom)) * 0.38;
    const offset = Math.max(28, readingY - 24);
    window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [focus]);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      const days = [...root.querySelectorAll<HTMLElement>("[data-fr-day]")];
      const stacked = window.matchMedia("(max-width: 1023px)").matches;
      for (const day of days) {
        const capsule = day.querySelector<HTMLElement>(".fr-day-capsule");
        if (!capsule) continue;
        const stickyTop = Number.parseFloat(getComputedStyle(capsule).top);
        capsule.classList.toggle("is-stuck", !stacked && Number.isFinite(stickyTop) && Math.abs(capsule.getBoundingClientRect().top - stickyTop) < 2);
      }
      const mapBottom = stacked ? document.querySelector<HTMLElement>(".map-col")?.getBoundingClientRect().bottom ?? 0 : 0;
      const line = Math.max(0, mapBottom) + (window.innerHeight - Math.max(0, mapBottom)) * 0.38;
      let active: HTMLElement | null = null;
      for (const day of days) { if (day.getBoundingClientRect().top <= line) active = day; else break; }
      const dayId = active?.dataset.frDay ?? "intro";
      let placeId: string | null = null;
      let activeBlock: HTMLElement | null = null;
      if (active) {
        for (const block of active.querySelectorAll<HTMLElement>("[data-fr-block], [data-fr-review]")) {
          if (block.getBoundingClientRect().top <= line) { placeId = block.dataset.frPlace || null; activeBlock = block; }
          else break;
        }
      }
      for (const day of days) day.classList.toggle("is-active", day === active);
      for (const block of root.querySelectorAll<HTMLElement>(".fr-block.is-active, .fr-review.is-active")) {
        if (block !== activeBlock) block.classList.remove("is-active");
      }
      activeBlock?.classList.add("is-active");
      const previous = lastRef.current;
      if (previous.dayId !== dayId || previous.placeId !== placeId) {
        lastRef.current = { dayId, placeId };
        onReading({ dayId, placeId });
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener(MAP_SPLIT_EVENT, schedule);
    const observer = new ResizeObserver(schedule);
    if (rootRef.current) observer.observe(rootRef.current);
    return () => { if (raf) cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.removeEventListener(MAP_SPLIT_EVENT, schedule); };
  }, [onReading]);

  return <div className="fr-story" ref={rootRef}>
    <header className="fr-hero">
      <div className="fr-hero-eyebrow">{data.story.dateLabel} · {lang === "zh" ? "旅途手记" : "Travel notebook"}</div>
      <h1>{lang === "zh" ? data.story.title : "Europe 2024 · Pages from the Road"}</h1>
      <p className="fr-hero-subtitle">{data.story.subtitle}</p>
      <p className="fr-hero-intro">{data.story.intro}</p>
      <TravelLogFacts items={[
        { label: lang === "zh" ? "行程" : "Journey", value: lang === "zh" ? "12 天" : "12 days" },
        { label: lang === "zh" ? "途经" : "Cities", value: lang === "zh" ? "4 座城市" : "4 cities" },
        { label: lang === "zh" ? "记录" : "Notes", value: lang === "zh" ? "纸笔手记" : "Handwritten" },
      ]} />
      <TravelLogScrollCue lang={lang} />
    </header>
    <main className="fr-days">
      {data.story.days.map((day, index) => <DayChapter key={day.id} day={day} index={index} data={data} lang={lang} />)}
      <section className="fr-afterword" id="afterword" data-log-section="afterword" data-fr-day="afterword">
        <p className="fr-day-index">{lang === "zh" ? "旅途杂记" : "Notes from the journey"}</p>
        <h2>{lang === "zh" ? "一路上的想法" : "Afterword"}</h2>
        {data.story.afterword.map(block => <article key={block.id} className="fr-block" data-fr-block={block.id}>
          <ChapterTitle title={block.title} />{block.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </article>)}
        <p className="fr-cuisine-source">{lang === "zh" ? "餐馆简评见 " : "Meals along the way are recorded in: "}<a href={CUISINE_URL}>{lang === "zh" ? "2024 巴黎餐馆简评 ↗" : "2024 Paris restaurant reviews ↗"}</a></p>
      </section>
    </main>
    <ChapterNavigation chapters={chapters} activeId={reading.dayId} scopeRef={rootRef} kind="reconstructed" lang={lang} title={lang === "zh" ? "2024 欧洲春游" : "Europe 2024"} />
  </div>;
}
