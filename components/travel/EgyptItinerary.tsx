"use client";

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown,
  Clock3, ExternalLink, Luggage, MapPinned, Printer,
} from "lucide-react";
import type { EgyptDay, EgyptGuide } from "@/lib/egypt2026";

const STORAGE_KEY = "egypt-2026-itinerary-checklist-v1";

function GuideMarkdown({ children }: { children: string }) {
  return <div className="eg-markdown"><Markdown remarkPlugins={[remarkGfm]} components={{
    a: ({ href, children: label }) => <a href={href} target="_blank" rel="noopener noreferrer">{label}<ExternalLink size={12} aria-hidden="true" /></a>,
  }}>{children}</Markdown></div>;
}

function DayCard({ day, open, onToggle }: { day: EgyptDay; open: boolean; onToggle: () => void }) {
  return <section className="eg-day" id={day.id} aria-labelledby={`${day.id}-title`}>
    <button className="eg-day-toggle" type="button" aria-expanded={open} aria-controls={`${day.id}-detail`} onClick={onToggle}>
      <span className="eg-day-date"><strong>{day.date.slice(5).replace("-", "/")}</strong><small>{day.weekday}</small></span>
      <span className="eg-day-heading"><span className="eg-day-route">{day.city}</span><strong id={`${day.id}-title`}>{day.title}</strong><small>{day.cue}</small></span>
      <ChevronDown className="eg-chevron" size={19} aria-hidden="true" />
    </button>
    <div className="eg-day-detail" id={`${day.id}-detail`} hidden={!open}>
      <div className="eg-day-facts">
        <p><MapPinned size={16} aria-hidden="true" /><span><b>动线</b>{day.route}</span></p>
        <p><Luggage size={16} aria-hidden="true" /><span><b>行李</b>{day.luggage}</span></p>
        <p><Clock3 size={16} aria-hidden="true" /><span><b>当晚</b>{day.stay}</span></p>
      </div>
      <div className="eg-estimate-note">日内时段除注明“已核实”或“用户指定”外，均为安排建议；交通班次与预订状态仍待确认。</div>
      <GuideMarkdown>{day.markdown}</GuideMarkdown>
    </div>
  </section>;
}

const MAP_SEARCHES = [
  { label: "CAI · 开罗国际机场", query: "Cairo International Airport" },
  { label: "ASW · 阿斯旺机场", query: "Aswan International Airport" },
  { label: "LXR · 卢克索机场", query: "Luxor International Airport" },
  { label: "开罗 Ramses／Misr 站", query: "Cairo Ramses railway station" },
  { label: "开罗 Bashteel 站", query: "Bashteel railway station Cairo" },
  { label: "亚历山大 Misr 站", query: "Alexandria railway station Egypt" },
  { label: "亚历山大 Sidi Gaber 站", query: "Sidi Gaber railway station" },
];

export default function EgyptItinerary({ guide }: { guide: EgyptGuide }) {
  const [openDays, setOpenDays] = useState<string[]>(["d1"]);
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(saved)) setChecked(saved.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < guide.checklist.length));
      } catch { /* A damaged local note should not block the itinerary. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guide.checklist.length]);

  const toggleTask = (index: number) => {
    const next = checked.includes(index) ? checked.filter(item => item !== index) : [...checked, index];
    setChecked(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The checklist still works for this visit. */ }
  };
  const toggleDay = (id: string) => setOpenDays(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const allOpen = openDays.length === guide.days.length;

  return <article className="eg-page" lang="zh-CN" id="eg-top">
    <div className="eg-shell">
      <header className="eg-hero">
        <div className="eg-hero-main">
          <p className="eg-eyebrow"><span className="eg-sun" aria-hidden="true" />个人行程草案 <span className="eg-eyebrow-divider">/</span> 2026.11.19 — 11.27</p>
          <h1>向尼罗河，<br /><em>再回开罗。</em></h1>
          <p className="eg-lede">开罗、阿斯旺、卢克索与亚历山大的九日行程概览。时间全部按 <strong>埃及当地时间（Africa/Cairo）</strong> 阅读。</p>
          <div className="eg-hero-actions"><a href="#eg-days" className="eg-primary-link">查看每日安排 <ArrowDownRight size={18} aria-hidden="true" /></a><button type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />打印行程</button></div>
        </div>
        <div className="eg-hero-side" aria-label="行程关键数字">
          <div className="eg-orbit" aria-hidden="true"><div className="eg-orbit-inner">EG<br /><span>26</span></div></div>
          <dl><div><dt>日历跨度</dt><dd>09 <small>天</small></dd></div><div><dt>酒店房晚</dt><dd>06 <small>晚</small></dd></div><div><dt>夜间交通</dt><dd>01 <small>晚</small></dd></div></dl>
        </div>
      </header>

      <div className="eg-urgent" role="note"><span className="eg-urgent-icon">!</span><div><strong>11 月 27 日 00:30 从 CAI 起飞</strong><p>去机场是 <b>11 月 26 日晚上</b>的任务：建议 18:30–19:00 从 Downtown 出发，目标约 21:00 抵达正确航站楼；实际航司要求更早时再提前。</p></div></div>

      <nav className="eg-local-nav" aria-label="本页目录"><a href="#eg-route">路线</a><a href="#eg-days">逐日安排</a><a href="#eg-checklist">待办</a><a href="#eg-logistics">交通与行李</a><a href="#eg-sources">来源</a></nav>

      <section className="eg-overview" id="eg-route" aria-labelledby="eg-route-title">
        <div className="eg-section-heading"><p>01 / ROUTE AT A GLANCE</p><h2 id="eg-route-title">一条向南、再北上的路线</h2><span>固定主线 · 交通班次待出票后替换</span></div>
        <ol className="eg-route-line"><li><b>开罗</b><small>19–20 日</small></li><li><b>阿斯旺</b><small>20–22 日</small></li><li><b>卢克索</b><small>22–23 日</small></li><li><b>吉萨</b><small>24 日晨</small></li><li><b>亚历山大</b><small>24–25 日</small></li><li><b>开罗 / CAI</b><small>25–27 日</small></li></ol>
        <div className="eg-overview-bottom"><p><strong>住宿</strong>开罗 2 晚 · 阿斯旺 2 晚 · 卢克索 1 晚 · 亚历山大 1 晚。23 日住夜巴；26 日不强制订酒店夜。</p><p><strong>核查状态</strong>资料核查于 2026-11-02；交通库存、实际航班、酒店与旅行日票价尚未确认。</p></div>
      </section>

      <section className="eg-status-section" aria-label="信息状态说明"><div className="eg-status-intro"><strong>读这份计划时</strong><span>四种状态各有不同含义，官网信息也不等于已经订票。</span></div><div className="eg-status-list"><span><b className="eg-badge user">用户指定</b>日期或路线已定，未必出票</span><span><b className="eg-badge verified">已核实</b>查询日官网信息</span><span><b className="eg-badge estimate">估算／建议</b>排程与缓冲</span><span><b className="eg-badge pending">待确认</b>缺实际票据或回复</span></div></section>

      <section className="eg-days-section" id="eg-days" aria-labelledby="eg-days-title"><div className="eg-section-heading"><p>02 / DAY BY DAY</p><h2 id="eg-days-title">每日执行计划</h2><span>展开可看时段、删减规则和详细说明</span></div>
        <div className="eg-day-toolbar"><span>11 月 19 日 — 27 日 · 以 Cairo 当地时间为准</span><button type="button" onClick={() => setOpenDays(allOpen ? [] : guide.days.map(day => day.id))}>{allOpen ? "收起全部" : "展开全部"} <ChevronDown size={15} aria-hidden="true" /></button></div>
        <div className="eg-days-list">{guide.days.map(day => <DayCard key={day.id} day={day} open={openDays.includes(day.id)} onToggle={() => toggleDay(day.id)} />)}</div>
      </section>

      <section className="eg-checklist-section" id="eg-checklist" aria-labelledby="eg-checklist-title"><div className="eg-section-heading"><p>03 / BEFORE DEPARTURE</p><h2 id="eg-checklist-title">先锁交通，再锁不可退项目</h2><span>勾选只保存在此浏览器，不代表自动出票</span></div>
        <div className="eg-checklist-card"><div className="eg-checklist-top"><strong>出发前核对</strong><span>{checked.length} / {guide.checklist.length} 项已勾选</span></div><div className="eg-checklist-progress"><span style={{ width: `${checked.length / guide.checklist.length * 100}%` }} /></div><ul>{guide.checklist.map((task, index) => <li key={task}><label><input type="checkbox" checked={checked.includes(index)} onChange={() => toggleTask(index)} /><span className="eg-task-box"><Check size={13} aria-hidden="true" /></span><span>{task}</span></label></li>)}</ul></div>
        <div className="eg-review-rhythm"><h3>复核节奏</h3><GuideMarkdown>{guide.reviewRhythm}</GuideMarkdown></div>
      </section>

      <section className="eg-logistics" id="eg-logistics" aria-labelledby="eg-logistics-title"><div className="eg-section-heading"><p>04 / PRACTICAL NOTES</p><h2 id="eg-logistics-title">交通、住宿与退路</h2><span>出发前按实际票据和运营信息复核</span></div>
        <div className="eg-accordion-list">{[4, 5, 6, 7, 8].map(number => <details key={number} className="eg-reference"><summary><span className="eg-reference-num">0{number}</span><strong>{guide.sections[number].title}</strong><ChevronDown size={18} aria-hidden="true" /></summary><div className="eg-reference-body"><GuideMarkdown>{guide.sections[number].markdown}</GuideMarkdown></div></details>)}</div>
        <div className="eg-map-search"><div><MapPinned size={21} aria-hidden="true" /><strong>站点搜索入口</strong><p>仅是地图搜索，不将“Giza”猜作金字塔入口；夜巴上下车点须按票面核对。</p></div><div className="eg-map-links">{MAP_SEARCHES.map(item => <a key={item.label} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.query)}`} target="_blank" rel="noopener noreferrer">{item.label}<ArrowUpRight size={14} aria-hidden="true" /></a>)}</div></div>
      </section>

      <section className="eg-sources" id="eg-sources" aria-labelledby="eg-sources-title"><div className="eg-section-heading"><p>05 / VERIFICATION</p><h2 id="eg-sources-title">事实边界与来源</h2><span>网页保留查询日期，旅行前请以官方实时信息复核</span></div>
        <details className="eg-reference"><summary><span className="eg-reference-num">01</span><strong>{guide.sections[1].title}</strong><ChevronDown size={18} aria-hidden="true" /></summary><div className="eg-reference-body"><GuideMarkdown>{guide.sections[1].markdown}</GuideMarkdown></div></details>
        <details className="eg-reference"><summary><span className="eg-reference-num">02</span><strong>{guide.sections[2].title}</strong><ChevronDown size={18} aria-hidden="true" /></summary><div className="eg-reference-body"><GuideMarkdown>{guide.sections[2].markdown}</GuideMarkdown></div></details>
        <details className="eg-reference"><summary><span className="eg-reference-num">11</span><strong>{guide.sections[11].title}</strong><ChevronDown size={18} aria-hidden="true" /></summary><div className="eg-reference-body"><GuideMarkdown>{guide.sections[11].markdown}</GuideMarkdown></div></details>
        <p className="eg-source-footnote">官方网页的开放时段可能在不同入口出现差异；出发前按实际购票页、运营方通知和票面信息再核对。页面不显示实时库存或已购状态。</p>
      </section>

      <footer className="eg-footer"><span>EGYPT / NOVEMBER 2026</span><a href="#eg-top">返回顶部 <ArrowRight size={15} aria-hidden="true" /></a></footer>
    </div>
  </article>;
}
