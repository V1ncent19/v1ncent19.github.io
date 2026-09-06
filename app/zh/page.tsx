import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  GraduationCap,
  MessageSquare,
  Scale,
  Sigma,
  User,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { NavId, NavItem } from "@/content/navigation";
import { homeCards } from "@/content/navigation";
import { getProfile, getProjects, projectSummary } from "@/lib/content";
import { getBlogPosts, type BlogCategory } from "@/lib/blog";
import { copy, formatMonth } from "@/lib/i18n";
import { EmailCopyButton } from "@/components/home/email-copy-button";
import { MathDivider } from "@/components/home/math-divider";
import { GatewayReveal } from "@/components/home/gateway-reveal";
import { GatewayLink } from "@/components/home/gateway-link";
import { SitePv } from "@/components/home/busuanzi";
import { SiteComments } from "@/components/home/giscus-count";
import { ConstructionBanner } from "@/components/home/construction-banner";
import { TranslationNotice } from "@/components/translation-notice";

/**
 * Chinese homepage (2026-09-06) — auto-translated draft mirroring the English
 * home (app/page.tsx) structure and styling. The user reviews and rewrites the
 * copy here at their own pace; the two files are intentionally independent so
 * edits on either side never clash. Facts/links mirror the English version;
 * blog posts have no Chinese editions, so the feed links to the English posts
 * with translated category chips.
 */

type SectionId = Exclude<NavId, "home">;

const sectionIcons: Record<SectionId, LucideIcon> = {
  about: User,
  cv: FileText,
  gallery: Camera,
  blog: BookOpen,
  project: FolderOpen,
  guestbook: MessageSquare,
};

/** Short section descriptor shown under each gateway card title (zh draft). */
const sectionBlurbs: Record<SectionId, { sub: string; desc: string }> = {
  about: {
    sub: "简短介绍",
    desc: "我是谁——求学经历、研究品味，以及这个站点如何运转。",
  },
  cv: {
    sub: "教育 · 科研 · 活动",
    desc: "至今的学术履历，附可下载的正式简历 PDF。",
  },
  gallery: {
    sub: "旅行与野外记录",
    desc: "旅途上拍下的精选照片与视觉笔记。",
  },
  blog: {
    sub: "随笔与食谱",
    desc: "长一点的文字——统计笔记、做饭实验、语言。",
  },
  project: {
    sub: "笔记与小作品",
    desc: "长期维护的学习笔记、汇编，以及长得超出了一篇博文的产物。",
  },
  guestbook: {
    sub: "留言 · 反馈",
    desc: "问候、闲谈与 bug 反馈汇入同一块留言板。",
  },
};

/** Same tone story as the English home (full literals for Tailwind). */
const tones = {
  brand: {
    fg: "text-brand",
    soft: "bg-brand-soft",
    water: "text-brand/10",
    wash: "from-brand-soft/70 via-transparent to-transparent",
    hover: "group-hover:text-brand",
    fill: "group-hover:bg-brand group-hover:text-on-brand",
    waterHover: "group-hover:text-brand/30",
    line: "bg-brand",
    arrow: "text-brand",
  },
  accent: {
    fg: "text-accent",
    soft: "bg-accent-soft",
    water: "text-accent/10",
    wash: "from-accent-soft/60 via-transparent to-transparent",
    hover: "group-hover:text-accent",
    fill: "group-hover:bg-accent group-hover:text-on-accent",
    waterHover: "group-hover:text-accent/30",
    line: "bg-accent",
    arrow: "text-accent",
  },
  tertiary: {
    fg: "text-tertiary",
    soft: "bg-tertiary-soft",
    water: "text-tertiary/10",
    wash: "from-tertiary-soft/60 via-transparent to-transparent",
    hover: "group-hover:text-tertiary",
    fill: "group-hover:bg-tertiary group-hover:text-on-tertiary",
    waterHover: "group-hover:text-tertiary/30",
    line: "bg-tertiary",
    arrow: "text-tertiary",
  },
} as const;
type ToneName = keyof typeof tones;
const toneSeq: ToneName[] = ["brand", "accent", "brand", "tertiary", "accent"];

const PEEK_FRAME: Record<SectionId, { pos: string; fit: "cover" | "contain" }> =
  {
    about: { pos: "50% 20%", fit: "cover" },
    cv: { pos: "50% 50%", fit: "contain" },
    gallery: { pos: "50% 50%", fit: "cover" },
    blog: { pos: "50% 50%", fit: "cover" },
    project: { pos: "50% 10%", fit: "cover" },
    guestbook: { pos: "50% 50%", fit: "cover" },
  };

const POST_TONE: Record<BlogCategory, string> = {
  knowledge:
    "bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand",
  cuisine:
    "bg-tertiary-soft text-tertiary transition-colors group-hover:bg-tertiary group-hover:text-on-tertiary",
  documentation:
    "bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent",
};

/** "2024-09-20" → "2024年9月20日" */
function formatDayZh(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Full date when a day is known, else "2024年9月" (project updates). */
function feedDateZh(date: string): string {
  return date.split("-").length >= 3 ? formatDayZh(date) : formatMonth(date, "zh");
}

/* ---------------------------------------------------------------------------
 * 近期文章 — 与英文首页同源的数据，中文分类标签；项目链接走 /zh 路由。
 * ------------------------------------------------------------------------- */
interface FeedItem {
  key: string;
  href: string;
  date: string;
  title: string;
  summary: string;
  chip: { cls: string; label: string };
}

function recentPostsZh(limit = 5): FeedItem[] {
  const zh = copy.zh;
  const items: FeedItem[] = [];

  for (const p of getBlogPosts()) {
    items.push({
      key: `post-${p.slug}`,
      href: `/blog/${p.date.slice(0, 4)}/${p.slug}`,
      date: p.date,
      title: p.title,
      summary: p.excerpt,
      chip: { cls: POST_TONE[p.category], label: zh.blog.category[p.category] },
    });
  }
  for (const pr of getProjects()) {
    const date = pr.meta.updatedAt ?? pr.meta.startedAt;
    if (!date) continue;
    items.push({
      key: `project-${pr.meta.slug}`,
      href: `/project/zh/${pr.meta.slug}`,
      date,
      title: pr.meta.title,
      summary: projectSummary(pr, "zh"),
      chip: {
        cls: "bg-surface-tint text-muted transition-colors group-hover:bg-brand group-hover:text-on-brand",
        label: zh.project.type[pr.meta.type],
      },
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

/* ---------------------------------------------------------------------------
 * 模块标题 — 与全站一致的 § 字形。
 * ------------------------------------------------------------------------- */
function ModuleHeader({
  children,
  caption,
  aside,
}: {
  children: ReactNode;
  caption?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-line pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="font-serif text-xl italic font-normal leading-none text-brand"
          >
            §
          </span>
          {children}
        </h2>
        {aside}
      </div>
      {caption ? <p className="mt-1.5 text-sm text-muted">{caption}</p> : null}
    </div>
  );
}

export default function ZhHomePage() {
  const profile = getProfile();
  const feed = recentPostsZh();
  const statNote = getProjects().find((p) => p.meta.slug === "stat-summary-note");
  const highDim = getProjects().find(
    (p) => p.meta.slug === "high-dimensional-statistics-note-2024-2025",
  );
  // 中文版 CV PDF 尚未制作，草稿阶段回落到英文版并标注。
  const cvHref = profile.cv.zh ?? profile.cv.en;
  const cvIsEn = !profile.cv.zh;
  const { sitePvBaseline } = profile.legacyStats;
  const license = profile.license ?? { label: "", href: "" };

  return (
    <div className="pb-16">
      {/* ---- 机翻草稿声明（人工重写本页后删除） ---- */}
      <TranslationNotice href="/" />

      {/* ---- 建设中横幅（可关闭，临时） ---- */}
      <ConstructionBanner lang="zh" />

      {/* ---- Hero：画布上的自我介绍（无卡片），头像右侧浮动 ---- */}
      <section className="shell pt-2 sm:pt-4">
        <div className="mx-auto max-w-5xl">
          {profile.avatar ? (
            <figure className="mb-6 w-full rounded-2xl border border-line bg-surface-tint p-3 sm:float-right sm:mb-4 sm:ml-8 sm:w-64 sm:p-4 md:w-72">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent"
                />
              </div>
            </figure>
          ) : null}

          <div className="text-[1.02rem] leading-relaxed text-ink sm:text-lg">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                aria-hidden
                className="font-serif text-xl italic leading-none text-brand"
              >
                §
              </span>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                你好。
              </h2>
            </div>

            <p className="mb-4">
              我是{" "}
              <a
                href="https://statistics.northwestern.edu/"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                西北大学
              </a>{" "}
              <strong className="font-semibold text-brand">
                统计学与数据科学系
              </strong>{" "}
              的统计学博士生。此前于 2023 年在清华大学{" "}
              <a
                href="https://www.phys.tsinghua.edu.cn/"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                物理系
              </a>{" "}
              取得数学物理学士学位，辅修统计学。
            </p>

            <p className="mb-4">
              理论物理与高维统计都让我着迷。这里记录长期维护的学习笔记与课程
              总结——比如{" "}
              <Link
                href="/project/zh/stat-summary-note"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                统计学课程总结
              </Link>{" "}
              和{" "}
              <Link
                href="/project/zh/high-dimensional-statistics-note-2024-2025"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                高维统计学笔记
              </Link>
              ——也写随笔，偶尔放些照片。
            </p>

            <p className="mb-6 text-muted">
              这个站点有意混用多种体裁：博客装还在成形的想法，笔记装经受过
              现实打磨的那些，影集装剩下的全部。用下面的索引直接跳转。
            </p>
          </div>

          {/* 操作按钮（清除浮动）。前三个默认白底；末尾"了解更多"为品牌色实底。 */}
          <div
            className="ui-text mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5"
            style={{ clear: "both" }}
          >
            {cvHref ? (
              <a
                href={cvHref}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-tint hover:text-ink hover:no-underline"
              >
                <Download className="h-[18px] w-[18px] text-brand" aria-hidden />
                <span>{cvIsEn ? "下载简历（英文）" : "下载简历"}</span>
                <span className="rounded bg-surface-sink px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  PDF
                </span>
              </a>
            ) : null}
            {profile.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-tint hover:text-ink hover:no-underline"
              >
                <GitBranch className="h-[18px] w-[18px] text-accent" aria-hidden />
                <span>GitHub 主页</span>
              </a>
            ))}
            <EmailCopyButton email={profile.email} />
            <Link
              href="/about/zh"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-on-brand shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-strong hover:no-underline"
            >
              <span>了解更多</span>
              <ArrowRight
                className="h-4 w-4 text-on-brand transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- 数学分隔线（悬停彩蛋）---- */}
      <MathDivider />

      {/* ---- 导航网格：1 张主推（关于）+ 2×2 ---- */}
      <section className="shell mt-4">
        <div className="mx-auto max-w-5xl">
          <ModuleHeader
            aside={
              <span className="font-serif text-sm text-muted">
                {homeCards.length} 个起点
              </span>
            }
          >
            站内导航
          </ModuleHeader>

          <GatewayReveal className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <GatewayLink
              href={homeCards[0].hrefZh}
              style={{ "--gw-i": 0 } as CSSProperties}
              className="gw-item group block h-full no-underline hover:no-underline lg:col-span-5"
            >
              <GatewayCard item={homeCards[0]} index={0} featured />
            </GatewayLink>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
              {homeCards.slice(1).map((item, j) => (
                <GatewayLink
                  key={item.id}
                  href={item.hrefZh}
                  style={{ "--gw-i": j + 1 } as CSSProperties}
                  className="gw-item group block h-full no-underline hover:no-underline"
                >
                  <GatewayCard item={item} index={j + 1} />
                </GatewayLink>
              ))}
            </div>
          </GatewayReveal>
        </div>
      </section>

      {/* ---- 双栏：近期文章 + 直达入口 / 站点数据 ---- */}
      <section className="shell mt-14">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ModuleHeader
                aside={
                  <Link
                    href="/blog/zh"
                    className="ui-text group inline-flex items-center gap-1 text-xs font-semibold text-brand hover:no-underline"
                  >
                    全部文章
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                }
              >
                近期文章
              </ModuleHeader>
              <RecentPostList items={feed} />
            </div>

            <div className="lg:col-span-5">
              <ModuleHeader>直达入口</ModuleHeader>
              <ul className="space-y-3.5">
                {cvHref ? (
                  <DocRow
                    icon={GraduationCap}
                    tone="brand"
                    title={cvIsEn ? "简历（Curriculum Vitae）" : "简历"}
                    subtitle={
                      cvIsEn
                        ? "西北大学统计 · 清华大学 · 英文版"
                        : "西北大学统计 · 清华大学"
                    }
                    href={cvHref}
                    download
                    action="PDF"
                  />
                ) : null}
                {statNote ? (
                  <DocRow
                    icon={Sigma}
                    tone="accent"
                    title="统计学课程总结"
                    subtitle="辅修课程 LaTeX 笔记 · 带索引 PDF"
                    href={statNote.meta.pdf ?? `/project/zh/${statNote.meta.slug}`}
                    action="PDF"
                  />
                ) : null}
                {highDim ? (
                  <DocRow
                    icon={BookOpen}
                    tone="tertiary"
                    title="高维统计学笔记"
                    subtitle="Wainwright · Vershynin · Rigollet–Hütter · van Handel"
                    href={`/project/zh/${highDim.meta.slug}`}
                    action="阅读"
                  />
                ) : null}
                {profile.links.map((link) => (
                  <DocRow
                    key={link.href}
                    icon={GitBranch}
                    tone="accent"
                    title={link.label}
                    subtitle="源码、仓库与小作品"
                    href={link.href}
                    external
                    action="访问"
                  />
                ))}
                {/* 留言板卡片：与顶部导航并存的首页入口。 */}
                <DocRow
                  icon={MessageSquare}
                  tone="brand"
                  title="留言 & Bug 反馈"
                  subtitle="打个招呼、留下杂谈，或反馈 bug"
                  href="/guestbook/zh"
                  action="前往"
                  nav
                />
              </ul>

              {/* 站点数据：浏览量（不倒翁 + 旧站基线）、评论数（GitHub
                  Discussions 汇总）与许可协议。 */}
              <section className="mt-12">
                <ModuleHeader caption="页面浏览量（busuanzi 实时 + 旧站基线）、评论数（GitHub Discussions 汇总）与许可协议。">
                  站点数据
                </ModuleHeader>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                  <MetaRow
                    icon={Eye}
                    label="页面浏览量"
                    note="历史累计 — 实时计数 + 旧站基线"
                    value={<SitePv baseline={sitePvBaseline} />}
                  />
                  <MetaRow
                    icon={MessageSquare}
                    label="评论"
                    note="giscus — 全站讨论实时汇总"
                    value={<SiteComments />}
                  />
                  <MetaRow
                    icon={Scale}
                    label="许可协议"
                    note="内容与代码转载条款"
                    value={license.label.trim() || "—"}
                    href={license.href || undefined}
                  />
                </ul>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * 构建块（与英文首页同款样式，全字面类名）
 * ------------------------------------------------------------------------- */

function GatewayCard({
  item,
  index,
  featured = false,
}: {
  item: NavItem;
  index: number;
  featured?: boolean;
}) {
  const id = item.id as SectionId;
  const Icon = sectionIcons[id];
  const tone = tones[toneSeq[index]];

  return (
    <div
      className={
        featured
          ? "gateway-card relative flex h-full min-h-[18rem] flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lift sm:p-8"
          : "gateway-card relative flex h-full min-h-[12.5rem] flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lift"
      }
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-[2.5px] origin-left scale-x-[0.35] opacity-20 transition-all duration-500 ease-out group-hover:scale-x-100 group-hover:opacity-100 ${tone.line}`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          className={`absolute inset-0 bg-gradient-to-br ${tone.wash}`}
        />
        <span className="gateway-orb">
          {/* eslint-disable-next-line @next/next/no-img-element -- hover-time data-src swap is incompatible with next/image; never part of LCP */}
          <img
            alt=""
            data-peek-src={`/assets/navigation/web/${id}.webp`}
            decoding="async"
            style={{
              objectPosition: PEEK_FRAME[id].pos,
              objectFit: PEEK_FRAME[id].fit,
              backgroundColor: PEEK_FRAME[id].fit === "contain" ? "#fff" : undefined,
            }}
          />
          <span className="gateway-orb-veil" />
        </span>
        <Icon
          className={`gateway-watermark pointer-events-none absolute -bottom-4 -right-4 ${featured ? "h-40 w-40" : "h-24 w-24"} transition-all duration-500 group-hover:-rotate-2 group-hover:scale-105 ${tone.water} ${tone.waterHover}`}
          strokeWidth={1}
        />
      </span>
      <div className="relative flex items-center gap-2">
        <span
          className={`ui-text inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${tone.soft} ${tone.fg} ${tone.fill}`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="ui-text text-xs tracking-wider text-muted">
          {sectionBlurbs[id].sub}
        </span>
      </div>
      <div className="relative mt-auto pt-6">
        <span className={`gw-title-pill ${tone.fg}`}>
          <span aria-hidden className={`gw-title-pill-tint ${tone.soft}`} />
          <h3
            className={`tracking-tight transition-colors ${featured ? "text-2xl sm:text-3xl" : "text-xl"} ${tone.hover}`}
          >
            {item.label.zh}
          </h3>
        </span>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">
          {sectionBlurbs[id].desc}
        </p>
        <div aria-hidden className="relative mt-3 flex justify-end">
          <ArrowRight
            className={`-translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${tone.arrow} ${featured ? "h-[22px] w-[22px]" : "h-5 w-5"}`}
          />
        </div>
      </div>
      <span aria-hidden className="gateway-stamp">
        <span
          className={`gateway-stamp-chip ${tone.soft} ${tone.fg} ${featured ? "h-16 w-16" : "h-14 w-14"}`}
        >
          <ArrowRight
            className={featured ? "h-8 w-8" : "h-7 w-7"}
            strokeWidth={2.5}
          />
        </span>
      </span>
    </div>
  );
}

function RecentPostList({ items }: { items: FeedItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="group block rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift hover:no-underline"
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand shadow-[0_0_0_3px_var(--brand-soft)]"
              />
              <div className="min-w-0 flex-1">
                <div className="ui-text mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.chip.cls}`}
                  >
                    {item.chip.label}
                  </span>
                  <time
                    dateTime={item.date}
                    className="font-serif text-xs italic normal-case text-muted"
                  >
                    {feedDateZh(item.date)}
                  </time>
                </div>
                <h3 className="text-lg font-medium leading-snug tracking-tight text-ink transition-colors group-hover:text-brand sm:text-xl">
                  {item.title}
                </h3>
                {item.summary ? (
                  <p className="mt-1.5 line-clamp-2 text-[0.95rem] leading-relaxed text-muted">
                    {item.summary}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MetaRow({
  icon: Icon,
  label,
  note,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  note?: string;
  value: ReactNode;
  href?: string;
}) {
  const valueNode = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group/value inline-flex max-w-[55%] items-center gap-1 text-right font-serif text-base font-bold tracking-tight text-brand hover:no-underline sm:text-lg"
    >
      <span className="truncate">{value}</span>
      <ArrowRight
        className="h-4 w-4 shrink-0 transition-transform group-hover/value:translate-x-0.5"
        aria-hidden
      />
    </a>
  ) : (
    <span className="font-serif text-lg font-bold tabular-nums tracking-tight text-ink">
      {value}
    </span>
  );

  return (
    <li className="flex items-center gap-3.5 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sink text-brand">
        <Icon className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="ui-text block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        {note ? (
          <span className="ui-text block truncate text-[11px] text-faint">
            {note}
          </span>
        ) : null}
      </div>
      {valueNode}
    </li>
  );
}

interface DocRowProps {
  icon: LucideIcon;
  tone: ToneName;
  title: string;
  subtitle: string;
  href: string;
  action: string;
  download?: boolean;
  external?: boolean;
  nav?: boolean;
}

function DocRow({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
  action,
  download,
  external,
  nav,
}: DocRowProps) {
  const t = tones[tone];
  if (!href) return null;
  return (
    <li>
      <div className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${t.soft} ${t.fg} ${t.fill}`}
          >
            <Icon className="h-[22px] w-[22px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4
              className={`truncate text-lg font-medium tracking-tight text-ink transition-colors ${t.hover}`}
            >
              {title}
            </h4>
            <span className="block truncate text-sm text-muted">{subtitle}</span>
          </div>
        </div>
        <a
          href={href}
          download={download || undefined}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
          className={`ui-text inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-tint px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:no-underline ${t.fill}`}
        >
          {external ? (
            <ExternalLink className="h-4 w-4" aria-hidden />
          ) : nav ? (
            <ArrowRight className="h-4 w-4" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          {action}
        </a>
      </div>
    </li>
  );
}
