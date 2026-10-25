"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { LogChapter, LogKind, LogLang } from "@/lib/travel/log/types";
import { LOG_BREAKPOINT } from "@/lib/travel/log/layout";
import { chapterElement, navigateToChapter } from "@/lib/travel/log/navigation";
import { readingLine, scrubDocument, scrollFraction } from "@/lib/travel/log/reading-geometry";
import { MAP_SPLIT_EVENT } from "@/lib/travel/map-split";
import { useScrubTrack } from "@/lib/travel/use-scrub-track";
import { chapterAtFraction } from "@/lib/travel/scrub-chapters";

/** Existing visual skins preserve each article's gutter geometry and drawer typography. */
const SKINS = {
  journal: { bar: "tnav", track: "tnav-track", fill: "tnav-fill", scrub: "tnav-scrub", box: "tnav-scrub-box", text: "tnav-scrub-text", toc: "tnav-toc-btn", rail: "tnav-rail", pct: "tnav-rail-pct", railTrack: "tnav-rail-track", railFill: "tnav-rail-fill", top: "tnav-top-btn", tick: "tnav-tick", tip: "tnav-tip", mark: "tnav-mark", backdrop: "tnav-backdrop", drawer: "tnav-drawer", head: "tnav-drawer-head", close: "tnav-close", list: "tnav-list", row: "tnav-row" },
  pilgrimage: { bar: "pjr-bar", track: "pjr-track", fill: "pjr-fill", scrub: "pjr-scrub", box: "pjr-scrub-box", text: "pjr-scrub-text", toc: "pjr-toc", rail: "pjr-rail", pct: "pjr-pct", railTrack: "pjr-rail-track", railFill: "pjr-rail-fill", top: "pjr-top", tick: "pjr-tick", tip: "pjr-tip", mark: "pjr-mark", backdrop: "pjr-backdrop", drawer: "pjr-drawer", head: "pjr-drawer-head", close: "pjr-drawer-x", list: "pjr-list", row: "pjr-row" },
} as const;

export default function ChapterNavigation({ chapters, activeId, scopeRef, kind, lang = "en", title }: {
  chapters: LogChapter[]; activeId: string | null; scopeRef: RefObject<HTMLDivElement | null>;
  kind: LogKind; lang?: LogLang; title?: string;
}) {
  const c = SKINS[kind];
  const [open, setOpen] = useState(false);
  const [ticks, setTicks] = useState<(LogChapter & { no: string; left: number })[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railBoxRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const topRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const label = lang === "zh" ? "目录" : "Chapter index";

  useEffect(() => {
    const measure = () => {
      const root = scopeRef.current;
      const line = readingLine(root);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setTicks(chapters.flatMap(chapter => {
        const el = chapterElement(root, chapter.sectionId);
        return el ? [{ ...chapter, no: chapter.id, left: Math.min(100, Math.max(0,
          (el.getBoundingClientRect().top + window.scrollY - line) / max * 100)) }] : [];
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener(MAP_SPLIT_EVENT, measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener(MAP_SPLIT_EVENT, measure); };
  }, [chapters, scopeRef]);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const fraction = scrollFraction();
      if (fillRef.current) fillRef.current.style.width = `${(fraction * 100).toFixed(2)}%`;
      if (railFillRef.current) railFillRef.current.style.height = `${(fraction * 100).toFixed(2)}%`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(fraction * 100)}%`;
      topRef.current?.classList.toggle("lit", fraction >= 0.98);
      for (const track of [trackRef.current, railRef.current])
        track?.querySelectorAll<HTMLElement>("[data-chapter-at]").forEach(el => {
          el.classList.toggle("read", Number(el.dataset.chapterAt) <= fraction * 100);
        });
      const root = scopeRef.current;
      if (root && railBoxRef.current && window.innerWidth >= LOG_BREAKPOINT) {
        // Position depends on the article's typography, not on its data format.
        const r = root.getBoundingClientRect();
        const centre = kind === "journal" ? r.right - 104 + (window.innerWidth >= 1280 ? 74 : 56) - 21 : r.right - 12;
        const vw = document.documentElement.clientWidth || window.innerWidth;
        railBoxRef.current.style.right = `${Math.max(kind === "journal" ? 0 : 10, vw - centre - (kind === "journal" ? 0 : 2)).toFixed(1)}px`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scopeRef, kind]);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const jump = (chapter: LogChapter) => { navigateToChapter(scopeRef.current, chapter.sectionId, kind); setOpen(false); };
  const paintScrub = useCallback((fraction: number) => {
    const mark = chapterAtFraction(ticks, fraction);
    const box = boxRef.current;
    const track = trackRef.current;
    if (!mark || !box || !track) return;
    if (textRef.current) textRef.current.textContent = mark.label;
    const width = track.getBoundingClientRect().width;
    const inset = Math.min(kind === "journal" ? 44 : 52, width / 2);
    box.style.left = `${Math.min(width - inset, Math.max(inset, fraction * width)).toFixed(1)}px`;
    box.classList.add("is-on");
  }, [ticks, kind]);
  const scrub = useScrubTrack({ onScrub: f => { scrubDocument(f); paintScrub(f); },
    onRelease: f => { scrubDocument(f); boxRef.current?.classList.remove("is-on"); } });
  const renderTicks = (vertical: boolean) => ticks.map(t => <button key={t.id} type="button"
    className={`${c.tick}${activeId === t.id ? " active" : ""}${!vertical ? t.left > 88 ? " edge-r" : t.left < 12 ? " edge-l" : "" : ""}`}
    style={vertical ? { top: `${t.left}%` } : { left: `${t.left}%` }} data-chapter-at={t.left}
    onClick={() => jump(t)} aria-label={t.label}><span className={c.tip}>{t.label}</span></button>);
  return <>
    <div className={`${c.bar} travel-log-progress`} role="navigation" aria-label={lang === "zh" ? "阅读进度" : "Reading progress"}>
      <div className={c.track} ref={trackRef}>
        {ticks.map(t => <span key={t.id} className={c.mark} style={{ left: `round(${Math.min(99.9, Math.max(0, t.left))}%, 1px)` }} aria-hidden="true" />)}
        <div className={c.fill} ref={fillRef} /><div className={c.scrub} {...scrub.surfaceProps} />{renderTicks(false)}
      </div>
      <div className={c.box} ref={boxRef} aria-hidden="true"><span className={c.text} ref={textRef} /></div>
      <button type="button" className={`${c.toc}${open ? " is-open" : ""}`} onClick={() => setOpen(v => !v)} aria-label={label} aria-expanded={open}>☰</button>
    </div>
    <div ref={railBoxRef} className={c.rail} role="navigation" aria-label={lang === "zh" ? "阅读进度" : "Reading progress"}>
      <span className={c.pct} ref={pctRef}>0%</span>
      <div className={c.railTrack} ref={railRef}><div className={`${c.fill} ${c.railFill}`} ref={railFillRef} />{renderTicks(true)}</div>
      <button type="button" className={c.top} ref={topRef} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}
        aria-label={lang === "zh" ? "回到顶部" : "Back to top"} title={lang === "zh" ? "回到顶部" : "Back to top"}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
      </button>
    </div>
    <div className={`${c.backdrop}${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
    <aside className={`${c.drawer}${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open}>
      <div className={c.head}><span>{title ?? label}</span><button type="button" className={c.close} onClick={() => setOpen(false)} aria-label={lang === "zh" ? "关闭" : "Close"} tabIndex={open ? 0 : -1}>×</button></div>
      <div className={c.list}>{chapters.map((chapter, index) => <button type="button" key={chapter.id} className={`${c.row}${activeId === chapter.id ? " active" : ""}`}
        style={{ "--row-i": index } as CSSProperties} onClick={() => jump(chapter)} tabIndex={open ? 0 : -1}>
        {chapter.shortLabel ? <><span className="tnav-row-day">{chapter.shortLabel}</span><span className="tnav-row-place">{chapter.detail}</span><span className="tnav-row-km">{chapter.meta}</span></> : chapter.label}
      </button>)}</div>
    </aside>
  </>;
}
