/** Structured CV entries for the Experience page: the `research` (研究经历)
 * section mirrors the Experiences list, `education` the full Education list
 * (incl. the M.S. and the statistics minor), and `publications` the
 * Publications section of the formal CV (2026-09-04) — same entries, same
 * order, same wording. Source content is preserved; no facts invented. The
 * formal, complete CV remains the downloadable PDF shipped at
 * /assets/cv/v1ncent19-cv-en.pdf (public/assets/cv/).
 *
 * Bilingual draft (2026-09-06): optional `*Zh` fields carry the Chinese
 * rendering; CvFolio falls back to the English text when absent or when
 * lang === "en". Auto-translated — the user reviews and rewrites. */

export interface CvEntry {
  title: string;
  institution?: string;
  institutionHref?: string;
  period?: string;
  lines: string[];
  marker?: string;
  links?: { label: string; href: string }[];
  /** Chinese draft rendering (auto-translated; user-reviewed later). */
  titleZh?: string;
  institutionZh?: string;
  linesZh?: string[];
}

export type CvSectionId = "education" | "research" | "activities";

export interface CvSection {
  id: CvSectionId;
  entries: CvEntry[];
}

export const cvSections: CvSection[] = [
  {
    id: "education",
    entries: [
      {
        title: "Ph.D. in Statistics",
        titleZh: "统计学 博士",
        institution: "Northwestern University",
        institutionZh: "西北大学（美国）",
        institutionHref: "https://www.northwestern.edu/",
        period: "Sep 2023 — Present",
        lines: [
          "Department of Statistics and Data Science. Advisor: Prof. Matey Neykov.",
        ],
        linesZh: ["统计学与数据科学系。导师：Matey Neykov 教授。"],
      },
      {
        title: "M.S. in Statistics",
        titleZh: "统计学 硕士",
        institution: "Northwestern University",
        institutionZh: "西北大学（美国）",
        institutionHref: "https://www.northwestern.edu/",
        period: "Sep 2023 – Jun 2025",
        lines: [
          "Department of Statistics and Data Science.",
        ],
        linesZh: ["统计学与数据科学系。"],
      },
      {
        title: "B.S. in Mathematics and Physics",
        titleZh: "数学物理 学士",
        institution: "Tsinghua University",
        institutionZh: "清华大学",
        institutionHref: "https://www.phys.tsinghua.edu.cn/phyen/",
        period: "Sep 2019 – Jun 2023",
        lines: [
          "Department of Physics.",
        ],
        linesZh: ["物理系。"],
      },
      {
        title: "B.S. (minor) in Statistics",
        titleZh: "统计学 辅修",
        institution: "Tsinghua University",
        institutionZh: "清华大学",
        period: "Mar 2021 – Jun 2023",
        lines: [
          "Department of Industrial Engineering.",
        ],
        linesZh: ["工业工程系。"],
      },
    ],
  },
  {
    id: "research",
    entries: [
      {
        title: "Graduate Researcher",
        titleZh: "博士研究生（科研）",
        institution: "Northwestern University",
        institutionZh: "西北大学（美国）",
        institutionHref: "https://www.northwestern.edu/",
        period: "Jan 2025 — Present",
        lines: [
          "Project: Robust inference under shape constraints with heavy-tailed noise.",
          "Formulated a novel framework for robust mean estimation under star-shaped constraints, explicitly addressing non-Gaussian and heavy-tailed noise structures.",
          "Derived optimal minimax error bounds and established theoretical guarantees for estimators under non-convex and non-smooth geometric constraints.",
          "Presented the findings in a comprehensive research paper.",
        ],
        linesZh: [
          "课题：形状约束下重尾噪声的稳健推断。",
          "提出了星形约束下稳健均值估计的新框架，显式处理非高斯、重尾的噪声结构。",
          "导出了最优极小极大误差界，并在非凸、非光滑的几何约束下建立了估计量的理论保证。",
          "研究成果已整理成一篇完整的研究论文。",
        ],
        links: [
          { label: "arXiv:2604.05063", href: "https://arxiv.org/abs/2604.05063" },
        ],
      },
      {
        title: "Undergraduate Dissertation",
        titleZh: "本科毕业论文",
        institution: "Tsinghua University",
        institutionZh: "清华大学",
        period: "Dec 2022 – May 2023",
        lines: [
          "Project: Distribution-free inference and neural-network modeling for gene expression.",
          "Applied Mixture Density Networks (MDN) to model complex, multi-modal conditional distributions for high-dimensional genetic data.",
          "Extended the Conformal Prediction framework to construct distribution-free conformal bands for conditional distribution functions.",
          "Programmed the entire pipeline in Python, achieving predictive coverage guarantees without relying on strong distributional assumptions.",
        ],
        linesZh: [
          "课题：基因表达数据的免分布推断与神经网络建模。",
          "使用混合密度网络（MDN）为高维基因数据建模复杂的多峰条件分布。",
          "扩展了 Conformal Prediction 框架，为条件分布函数构造免分布的 conformal 带。",
          "用 Python 实现了完整流水线，在弱分布假设下达到预测覆盖率保证。",
        ],
      },
      {
        title: "Undergraduate Researcher & RA",
        titleZh: "本科生科研与研究助理",
        institution: "Tsinghua University",
        institutionZh: "清华大学",
        period: "Dec 2021 – Jul 2022",
        lines: [
          "Project: Large-scale medical-record dataset.",
          "Developed a scalable data pipeline to crawl, parse, and structure case-report articles from PubMed OA.",
          "Formed a large-scale public dataset of patient summaries and their links (160k patient summaries, 293k similarity annotations).",
          "Fine-tuned large language models (LLMs) to automate text mining and medical entity extraction from unstructured biomedical literature.",
          "Published the open-source dataset on Nature Scientific Data.",
        ],
        linesZh: [
          "课题：大规模病历数据集。",
          "搭建了可扩展的数据流水线，抓取并结构化 PubMed OA 的病例报告文献。",
          "构建了大规模公开数据集：患者摘要及其关联（16 万条患者摘要、29.3 万条相似性标注）。",
          "微调大语言模型（LLM），自动化非结构化生物医学文献的文本挖掘与医学实体抽取。",
          "开源数据集发表于 Nature Scientific Data。",
        ],
        links: [
          { label: "Nature Scientific Data", href: "https://www.nature.com/articles/s41597-023-02814-8" },
          { label: "Project website", href: "https://pmc-patients.github.io/" },
        ],
      },
    ],
  },
  {
    id: "activities",
    entries: [
      {
        title: "Mathematical Contest In Modeling (MCM)",
        titleZh: "美国大学生数学建模竞赛（MCM）",
        institution: "COMAP",
        institutionHref: "https://www.comap.com/undergraduate/contests/index.html",
        period: "2022",
        marker: "Honorable Mention · MCM 2022",
        lines: [
          "Worked on track A, on the modelling problem of cyclist stamina.",
          "Based on the simulation model, estimated cyclists' somatic function and used random optimization to determine the best strategy for a specific trial; also developed an algorithm for the team trial.",
        ],
        linesZh: [
          "参加 A 题，建模自行车手的体能问题。",
          "基于仿真模型估计车手体能状况，用随机优化确定单站最佳策略，并为团队计时赛设计了算法。",
        ],
      },
    ],
  },
];

/** One bibliography entry as it should read on the CV page. */
export interface Publication {
  /** Full author list, in citation order. */
  authors: string;
  year: string;
  title: string;
  /** Journal + volume/pages, or preprint id. */
  venue: string;
  href?: string;
}

/** Publications, newest first — mirrors the Publications section of the CV.
 *  Citations stay in their published (English) form in both languages. */
export const publications: Publication[] = [
  {
    authors: "Peng, T., Prasadan, A., & Neykov, M.",
    year: "2026",
    title: "Robust mean estimation under star-shaped constraints with heavy-tailed noise",
    venue: "arXiv preprint arXiv:2604.05063",
    href: "https://arxiv.org/abs/2604.05063",
  },
  {
    authors: "Zhao, Z., Jin, Q., Chen, F., Peng, T., & Yu, S.",
    year: "2023",
    title: "A large-scale dataset of patient summaries for retrieval-based clinical decision support systems",
    venue: "Scientific Data, 10(1), 909",
    href: "https://www.nature.com/articles/s41597-023-02814-8",
  },
];
