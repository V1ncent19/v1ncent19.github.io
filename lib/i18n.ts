/**
 * UI copy for the two site languages. English is the default interface;
 * Chinese pages live under nested /zh routes. Author content (About bodies,
 * Project markdown) carries its own translations; this module only covers
 * shell / component chrome that the layout renders.
 */
import type { CvSectionId } from "@/content/cv/entries";
import type { BlogCategory } from "@/lib/blog";
import type { ProjectStatus, ProjectType } from "@/lib/content";

export type Lang = "en" | "zh";

export interface Copy {
  about: {
    title: string;
    factsTitle: string;
    factsLead: string;
    factsSealed: string;
    factsOpened: string;
    factsDiscovered: string;
    /** Heading of the standalone travel-log § section (TravelSection). */
    travelSectionTitle: string;
    travelVisited: string;
    travelWishlist: string;
    travelEmpty: string;
    timelineEmpty: string;
    /** General Information block (GeneralInfo): section title + row labels. */
    generalTitle: string;
    generalName: string;
    generalDob: string;
    generalLangs: string;
    generalHome: string;
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
    publications: string;
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
    /** Sort-key chip labels (direction reuses newest/oldest or A→Z/Z→A). */
    sortDate: string;
    sortTitle: string;
    minRead: string;
    /** Back-link label from a post page to the blog index. */
    allPosts: string;
    category: Record<BlogCategory, string>;
    lang: { zh: string; en: string; mix: string };
    empty: string;
  };
  gallery: {
    title: string;
    lead: string;
    statLabel: string;
    filterLabel: string;
    byDate: string;
    byPlace: string;
    shuffle: string;
    /** Label for the curated (精选集 / featured) filter chip in the sort strip. */
    featured: string;
    /** Empty-state note when the curated filter has no featured photos yet. */
    featuredEmpty: string;
    /** Label for the column-count control at the right of the sort strip. */
    columns: string;
    /** Accessible label for the sort-direction toggle button. */
    sortDir: string;
    /** Direction labels for the date key (place uses neutral A→Z / Z→A). */
    dirNew: string;
    dirOld: string;
    /** Colophon / storage note at the bottom of the page. */
    note: string;
    /** Link on an original full-res copy (shown only when the item has one). */
    downloadOriginal: string;
    /** Visible + a11y label for closing the lightbox. */
    close: string;
    /** Prev / next photo buttons in the lightbox. */
    prevPhoto: string;
    nextPhoto: string;
  };
  home: {
    roleNote: string;
    intro: string;
    explore: string;
    current: string;
    resume: string;
    email: string;
  };
  /** Mobile FAB navigation chrome (site-header). */
  nav: {
    /** Accessible labels for the floating action button + panel. */
    menuOpen: string;
    menuClose: string;
    menuLabel: string;
  };
  /** Guestbook page (/guestbook, /guestbook/zh) — nav item, no gateway card.
   *  Single giscus stream described as messages & bug reports (2026-09-06). */
  guestbook: {
    eyebrow: string;
    title: string;
    lead: string;
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
      factsTitle: "More random things",
      factsLead: "Sealed by default — break a stamp to unfold a whole category at once.",
      factsSealed: "Sealed — click to break",
      factsOpened: "Unsealed",
      factsDiscovered: "Discovered",
      travelSectionTitle: "Travel log",
      travelVisited: "Stops visited",
      travelWishlist: "On the wishlist",
      travelEmpty: "Checklist in progress — stops being unlocked one by one.",
      timelineEmpty: "Timeline in progress.",
      generalTitle: "General Information",
      generalName: "Full Name",
      generalDob: "Date of Birth",
      generalLangs: "Languages",
      generalHome: "Hometown",
    },
    cv: {
      title: "Curriculum Vitæ",
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
        "The theory of statistics under heavy tails and shape constraints — robust, minimax-optimal, and distribution-free methods in high dimensions.",
      honors: "Honors & awards",
      publications: "Publications",
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
      sortDate: "By date",
      sortTitle: "By title",
      minRead: "min read",
      allPosts: "All posts",
      category: {
        knowledge: "Mathematics & Statistics",
        cuisine: "Cuisine",
        documentation: "Documentation",
      },
      lang: { zh: "中文", en: "English", mix: "中文 / English" },
      empty: "Nothing matches that search — try another keyword or clear the filters.",
    },
    gallery: {
      title: "Gallery",
      lead: "Photographs taken on trips and in the field, captioned with place and date where they are known. Click any frame to view it large — where the original is shared, a download link sits beneath it.",
      statLabel: "Photographs",
      filterLabel: "Sort",
      byDate: "By date",
      byPlace: "By place",
      shuffle: "Shuffle",
      featured: "Featured",
      featuredEmpty: "No featured picks here yet — photos you mark as featured in items.json will show up in this collection.",
      columns: "Columns",
      sortDir: "Toggle sort direction",
      dirNew: "Newest first",
      dirOld: "Oldest first",
      note: "The images here are compressed WebP generated from full-resolution originals that stay off GitHub. Original files download through my shared drive — a link appears under the large view when one is shared for that photo.",
      downloadOriginal: "Download original",
      close: "Close",
      prevPhoto: "Previous photo",
      nextPhoto: "Next photo",
    },
    home: {
      roleNote: "",
      intro: "I am a Ph.D. student in Statistics at Northwestern University, and previously did my B.S. in Mathematics and Physics at Tsinghua University (minor in Statistics). My taste runs toward the theory of statistics and machine learning. This site holds a mix of formats — a personal blog, long-running study notes, and occasional photographs — depending on how much of each idea survives contact with reality.",
      explore: "Explore the site",
      current: "Currently",
      resume: "See CV",
      email: "Email",
    },
    nav: {
      menuOpen: "Open navigation",
      menuClose: "Close navigation",
      menuLabel: "Site sections",
    },
    guestbook: {
      eyebrow: "Messages & bug reports",
      title: "Guestbook",
      lead: "One shared board for everything — greetings, half-formed thoughts, and bug reports alike. Comments run on giscus backed by GitHub Discussions; signing in with a GitHub account is all it takes to post. Found something broken? Mention the page and what you expected — short and rough is fine.",
    },
    placeholder: {
      label: "Under construction",
      note: "This section is being migrated as part of the site rebuild; content lands in a later phase.",
    },
  },

  zh: {
    about: {
      title: "关于",
      factsTitle: "不正经爱好 & more random things",
      factsLead: "默认封存——拆开一枚邮票，整组内容一起展开。",
      factsSealed: "已封存——点击拆封",
      factsOpened: "已拆封",
      factsDiscovered: "已拆开",
      travelSectionTitle: "旅行足迹",
      travelVisited: "已解锁足迹",
      travelWishlist: "待解锁心愿",
      travelEmpty: "清单整理中——目的地正在逐个解锁。",
      timelineEmpty: "时间轴整理中。",
      generalTitle: "基本信息",
      generalName: "姓名",
      generalDob: "出生日期",
      generalLangs: "语言",
      generalHome: "家乡",
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
      interestsLead: "重尾与形状约束下的统计理论——高维中的稳健、极小极大与无分布方法。",
      honors: "获奖与荣誉",
      publications: "发表论文",
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
      sortDate: "按时间",
      sortTitle: "按标题",
      minRead: "分钟",
      allPosts: "全部文章",
      category: {
        knowledge: "数学与统计",
        cuisine: "料理",
        documentation: "文档·资料",
      },
      lang: { zh: "中文", en: "英文", mix: "中英" },
      empty: "没有匹配的笔记——换个关键词或清除筛选试试。",
    },
    gallery: {
      title: "影集",
      lead: "旅途与野外拍下的照片，凡已知的地点与日期都标注在图上。点击任一照片可放大查看；若某张原图已共享，放大视图下方会有下载入口。",
      statLabel: "照片",
      filterLabel: "排序",
      byDate: "按时间",
      byPlace: "按地点",
      shuffle: "随机",
      featured: "精选集",
      featuredEmpty: "这里还没有精选照片——在 items.json 里把想放入精选集的照片标为 featured 即可。",
      columns: "列数",
      sortDir: "切换正逆序",
      dirNew: "从新到旧",
      dirOld: "从旧到新",
      note: "网页上的图片是由全分辨率原图生成的压缩 WebP，原图不存入 GitHub。需要原图时可从我的共享云盘下载——某张原图已公开共享时，其放大视图下会出现下载入口。",
      downloadOriginal: "下载原图",
      close: "关闭",
      prevPhoto: "上一张",
      nextPhoto: "下一张",
    },
    home: {
      roleNote: "",
      intro: "我是美国西北大学统计学博士生，本科毕业于清华大学物理系（数学与物理专业，辅修统计学）。兴趣偏向统计与机器学习的理论。这个站点按内容的“存活状态”分成几种形式——个人博客、长期更新的学习笔记、以及偶尔的照片。",
      explore: "浏览站点",
      current: "目前",
      resume: "查看简历",
      email: "邮件",
    },
    nav: {
      menuOpen: "打开导航菜单",
      menuClose: "关闭导航菜单",
      menuLabel: "站点板块",
    },
    guestbook: {
      eyebrow: "留言 & Bug 反馈",
      title: "留言板",
      lead: "一块共享的留言板——问候、闲谈、bug 反馈都写在这里。评论由 giscus 提供，数据存在 GitHub Discussions 上，用 GitHub 账号登录即可发言。发现了哪里坏掉了？写上页面和你的预期即可，不用讲究格式。",
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
