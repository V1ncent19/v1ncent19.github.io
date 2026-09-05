/**
 * Data-driven navigation. Order is significant and follows the "Home – Desktop
 * Layout Variant 3" Stitch direction: the homepage itself appears as the first
 * nav item ("Home"), followed by About, CV, Gallery, Blog, Project, Guestbook.
 *
 * The Guestbook IS a nav item (user decision 2026-09-05, revised same day) but
 * deliberately has NO homepage gateway card — its only home entry point is the
 * "Direct access" row card, and the standalone page lives at /guestbook.
 *
 * English is the default interface; Chinese pages live under nested /zh
 * routes. Homepage section cards (app/page.tsx) intentionally exclude `home`
 * and `guestbook`, and only render the real sections.
 */

export type NavId =
  | "home"
  | "about"
  | "cv"
  | "gallery"
  | "blog"
  | "project"
  | "guestbook";

export interface NavItem {
  id: NavId;
  order: number;
  label: { en: string; zh: string };
  summary: { en: string; zh: string };
  href: string;
  hrefZh: string;
}

export const navItems: NavItem[] = [
  {
    id: "home",
    order: 0,
    label: { en: "Home", zh: "首页" },
    summary: { en: "Home", zh: "首页" },
    href: "/",
    hrefZh: "/zh",
  },
  {
    id: "about",
    order: 1,
    label: { en: "About", zh: "关于" },
    summary: {
      en: "Personal introduction and fun facts.",
      zh: "个人介绍与一些 fun facts。",
    },
    href: "/about",
    hrefZh: "/about/zh",
  },
  {
    id: "cv",
    order: 2,
    label: { en: "CV", zh: "简历" },
    summary: {
      en: "Curriculum vitae and research experience.",
      zh: "履历与研究经历。",
    },
    href: "/cv",
    hrefZh: "/cv/zh",
  },
  {
    id: "gallery",
    order: 3,
    label: { en: "Gallery", zh: "影集" },
    summary: {
      en: "Selected travel photography.",
      zh: "精选旅行摄影。",
    },
    href: "/gallery",
    hrefZh: "/gallery/zh",
  },
  {
    id: "blog",
    order: 4,
    label: { en: "Blog", zh: "博客" },
    summary: {
      en: "Notes across math, statistics, cooking and more.",
      zh: "数学、统计、烹饪等杂记。",
    },
    href: "/blog",
    hrefZh: "/blog/zh",
  },
  {
    id: "project",
    order: 5,
    label: { en: "Project", zh: "项目" },
    summary: {
      en: "Long-running notes, tools and small works.",
      zh: "长期笔记、工具与作品。",
    },
    href: "/project",
    hrefZh: "/project/zh",
  },
  {
    id: "guestbook",
    order: 6,
    label: { en: "Guestbook", zh: "留言板" },
    summary: {
      en: "Say hi, leave a note, or report a bug.",
      zh: "打个招呼、留下杂谈，或反馈 bug。",
    },
    href: "/guestbook",
    hrefZh: "/guestbook/zh",
  },
];

/** Sections shown as homepage gateway cards — the real content sections.
 *  Guestbook is reachable from the top nav and the "Direct access" card,
 *  but does not take a slot in the gateway grid. */
export const homeCards: NavItem[] = navItems.filter(
  (n) => n.id !== "home" && n.id !== "guestbook",
);

/** Top-level routes that have an English + Chinese (nested /zh) pair. */
export const bilingualBases = new Set<string>(
  navItems.filter((n) => n.id !== "home").map((n) => n.id),
);

export function labelFor(id: NavId, lang: "en" | "zh"): string {
  const item = navItems.find((n) => n.id === id);
  return item ? item.label[lang] : id;
}
