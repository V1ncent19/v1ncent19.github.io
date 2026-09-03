/**
 * UI copy for the two site languages. English is the default interface;
 * Chinese pages live under nested /zh routes. Author content (About bodies,
 * Project markdown) carries its own translations; this module only covers
 * shell / component chrome that the layout renders.
 */
import type { CvSectionId } from "@/content/cv/entries";
import type { LegacyCategory } from "@/lib/legacy";
import type { ProjectStatus, ProjectType } from "@/lib/content";

export type Lang = "en" | "zh";

export interface Copy {
  about: {
    title: string;
  };
  cv: {
    title: string;
    lead: string;
    download: string;
    nameHeading: string;
    facts: string;
    pdfFootnote: string;
  };
  cvSection: Record<CvSectionId, string>;
  cvFolio: {
    eyebrow: string;
    profile: string;
    contact: string;
    from: string;
    now: string;
    interests: string;
    interestsLead: string;
    honors: string;
    artifacts: string;
    edition: string;
  };
  project: {
    title: string;
    lead: string;
    allProjects: string;
    openPdf: string;
    updatedAt: string;
    status: Record<ProjectStatus, string>;
    type: Record<ProjectType, string>;
  };
  blog: {
    eyebrow: string;
    title: string;
    lead: string;
    statPosts: string;
    statCategories: string;
    statLatest: string;
    allLabel: string;
    search: string;
    /** Template with {shown} and {total} placeholders. */
    resultsTemplate: string;
    newest: string;
    oldest: string;
    minRead: string;
    category: Record<LegacyCategory, string>;
    lang: { zh: string; en: string; mix: string };
    empty: string;
  };
  gallery: {
    eyebrow: string;
    title: string;
    lead: string;
    statLabel: string;
    filterLabel: string;
    byDate: string;
    byPlace: string;
    shuffle: string;
    /** Why the sort/filter chips are inert right now. */
    unavailable: string;
    emptyTitle: string;
    emptyText: string;
    /** Colophon / storage note at the bottom of the page. */
    note: string;
  };
  home: {
    roleNote: string;
    intro: string;
    explore: string;
    current: string;
    resume: string;
    email: string;
  };
  placeholder: {
    label: string;
    note: string;
  };
}

export const copy: Record<Lang, Copy> = {
  en: {
    about: {
      title: "About",
    },
    cv: {
      title: "Experience",
      lead: "A web version of my academic record. The formal, most up-to-date CV is the downloadable PDF — contact me for a full reference list.",
      download: "Download CV (PDF)",
      nameHeading: "At a glance",
      facts: "Education",
      pdfFootnote: "The PDF includes full publication/reference lists not repeated on this page.",
    },
    cvSection: {
      education: "Education",
      research: "Research Experience",
      activities: "Activities & Awards",
    },
    cvFolio: {
      eyebrow: "Academic record",
      profile: "Profile",
      contact: "Contact",
      from: "From",
      now: "Now",
      interests: "Interests",
      interestsLead:
        "Where my reading leans: theoretical statistics, statistical physics, and their intersection with machine learning.",
      honors: "Honors & awards",
      artifacts: "Notes & works",
      edition:
        "Web edition of the academic record — the formal, most current version is the downloadable PDF.",
    },
    project: {
      title: "Project",
      lead: "Long-running notes and small works — some of which outgrew their original format.",
      allProjects: "All projects",
      openPdf: "Open PDF",
      updatedAt: "Updated",
      status: {
        active: "In progress",
        completed: "Completed",
        paused: "On hold",
        archived: "Archived",
      },
      type: {
        note: "Note",
        tool: "Tool",
        paper: "Paper",
        demo: "Work",
      },
    },
    blog: {
      eyebrow: "Essays · notes · recipes",
      title: "Blog",
      lead: "Study notes and half-formed ideas alongside recipes and the occasional travel log. Posts are indexed here in the language they were written in.",
      statPosts: "Posts",
      statCategories: "Categories",
      statLatest: "Latest",
      allLabel: "All",
      search: "Search posts — statistics, physics, recipes…",
      resultsTemplate: "Showing {shown} of {total} posts",
      newest: "Newest first",
      oldest: "Oldest first",
      minRead: "min read",
      category: {
        knowledge: "Mathematics & Statistics",
        cuisine: "Cuisine",
        documentation: "Documentation",
      },
      lang: { zh: "中文", en: "English", mix: "中文 / English" },
      empty: "Nothing matches that search — try another keyword or clear the filters.",
    },
    gallery: {
      eyebrow: "Field gallery",
      title: "Gallery",
      lead: "A quiet archive for photographs taken on trips and in the field. Frames land here during content migration; the layout is already in place.",
      statLabel: "Photographs archived",
      filterLabel: "Sort",
      byDate: "By date",
      byPlace: "By place",
      shuffle: "Shuffle",
      unavailable: "Available once photographs are archived.",
      emptyTitle: "No photographs yet",
      emptyText:
        "The old site's travel photographs arrive in a later migration phase and will appear here, captioned with place and date where they are known.",
      note: "Photographs are stored in the site repository and rendered responsively — no external hosting.",
    },
    home: {
      roleNote: "",
      intro: "I am a Ph.D. student in Statistics at Northwestern University, and previously did my B.S. in Mathematics and Physics at Tsinghua University (minor in Statistics). My taste runs toward the theory of statistics and machine learning. This site holds a mix of formats — a personal blog, long-running study notes, and occasional photographs — depending on how much of each idea survives contact with reality.",
      explore: "Explore the site",
      current: "Currently",
      resume: "See CV",
      email: "Email",
    },
    placeholder: {
      label: "Under construction",
      note: "This section is being migrated as part of the site rebuild; content lands in a later phase.",
    },
  },

  zh: {
    about: {
      title: "关于",
    },
    cv: {
      title: "经历",
      lead: "学术履历的网页版。正式且最新的 CV 请以 PDF 为准——如需完整论文/引用列表欢迎来信索取。",
      download: "下载 CV（PDF）",
      nameHeading: "概况",
      facts: "教育经历",
      pdfFootnote: "PDF 中包含本页未重复列出的完整论文/引用列表。",
    },
    cvSection: {
      education: "教育",
      research: "研究经历",
      activities: "活动与获奖",
    },
    cvFolio: {
      eyebrow: "学术履历",
      profile: "资料",
      contact: "联系",
      from: "来自",
      now: "现在",
      interests: "研究兴趣",
      interestsLead: "阅读与研究上的偏好：理论统计、统计物理，以及与机器学习的交叉。",
      honors: "获奖与荣誉",
      artifacts: "笔记与作品",
      edition: "学术履历网页版——正式且最新的完整记录以 PDF 为准。",
    },
    project: {
      title: "项目",
      lead: "长期笔记与小作品——其中一些已经超出了它们最初的形式。",
      allProjects: "全部项目",
      openPdf: "打开 PDF",
      updatedAt: "更新于",
      status: {
        active: "进行中",
        completed: "已完成",
        paused: "暂缓",
        archived: "归档",
      },
      type: {
        note: "笔记",
        tool: "工具",
        paper: "论文",
        demo: "作品",
      },
    },
    blog: {
      eyebrow: "随笔 · 笔记 · 菜谱",
      title: "博客",
      lead: "读书笔记与尚未成型的小想法，也有菜谱和零星游记。帖子按写作时的语言收录在此。",
      statPosts: "篇笔记",
      statCategories: "类主题",
      statLatest: "最近更新",
      allLabel: "全部",
      search: "搜索笔记——统计、物理、美食……",
      resultsTemplate: "显示 {shown} 篇，共 {total} 篇",
      newest: "最新优先",
      oldest: "最早优先",
      minRead: "分钟",
      category: {
        knowledge: "数学与统计",
        cuisine: "料理",
        documentation: "文档·资料",
      },
      lang: { zh: "中文", en: "英文", mix: "中英" },
      empty: "没有匹配的笔记——换个关键词或清除筛选试试。",
    },
    gallery: {
      eyebrow: "路上影集",
      title: "影集",
      lead: "旅途与野外所拍照片的安静档案。照片在内容迁移阶段陆续归档；版面已就位。",
      statLabel: "已归档照片",
      filterLabel: "排序",
      byDate: "按时间",
      byPlace: "按地点",
      shuffle: "随机",
      unavailable: "照片归档后即可使用。",
      emptyTitle: "还没有照片",
      emptyText: "旧站旅行照片将在后续迁移阶段整理进这里，并在已知地点与日期时配上说明。",
      note: "照片随站点仓库存放、响应式渲染——不使用外部图床。",
    },
    home: {
      roleNote: "",
      intro: "我是美国西北大学统计学博士生，本科毕业于清华大学物理系（数学与物理专业，辅修统计学）。兴趣偏向统计与机器学习的理论。这个站点按内容的“存活状态”分成几种形式——个人博客、长期更新的学习笔记、以及偶尔的照片。",
      explore: "浏览站点",
      current: "目前",
      resume: "查看简历",
      email: "邮件",
    },
    placeholder: {
      label: "建设中",
      note: "本栏目随站点重建逐步迁移，内容将在后续阶段上线。",
    },
  },
};

/** "2024-09-20" → "Sep 2024" (en) / "2024年9月" (zh). Graceful for odd input. */
export function formatMonth(date: string, lang: Lang): string {
  const parts = date.split("-").map(Number);
  if (parts.length < 2 || !parts[0] || !parts[1]) return date;
  const label = new Date(parts[0], parts[1] - 1, 1).toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "short" },
  );
  return label;
}
