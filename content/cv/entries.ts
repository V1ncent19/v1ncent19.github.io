/** Structured CV entries for the Experience page: the `research` (研究经历)
 * section mirrors the Experiences list, `education` the full Education list
 * (incl. the M.S. and the statistics minor), and `publications` the
 * Publications section of the formal CV — same entries, same order, same
 * wording. Source content is preserved; no facts invented. The formal,
 * complete CV remains the downloadable PDF shipped at
 * /assets/cv/v1ncent19-cv-en.pdf (public/assets/cv/).
 *
 * Updated 2026-10-16 from the revised CV (tuorui_cv.pdf): research entries are
 * now titled after the paper/project (not the role), a new monotone
 * single-index entry leads the list, and the M.S. education entry drops the
 * explicit start (awarded en route). The site keeps its fuller academic-record
 * structure (Education includes the M.S. and the minor; Activities kept) —
 * only the facts move with the PDF.
 *
 * Bilingual text (2026-10-17): every translatable field is `{ en, zh }`
 * (`Localized` in lib/localized.ts). `en` is the base; `zh` is optional and
 * falls back to English. A `titleZh` / `linesZh` key is a build error now —
 * read values through `pick()` / `pickList()`, never `entry.title[lang]`.
 * Auto-translated — the user reviews and rewrites. */

import type { Lang, Localized, LocalizedList } from "@/lib/localized";

export interface CvEntry {
  title: Localized;
  institution?: Localized;
  institutionHref?: string;
  /** Dates are language-neutral — "Sep 2023 — Jun 2028" reads the same in both. */
  period?: string;
  lines: LocalizedList;
  marker?: string;
  links?: { label: string; href: string }[];
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
        title: { en: "Ph.D. in Statistics", zh: "统计学 博士" },
        institution: { en: "Northwestern University", zh: "西北大学（美国）" },
        institutionHref: "https://www.northwestern.edu/",
        period: "Sep 2023 — Expected Jun 2028",
        lines: {
          en: [
            "Department of Statistics and Data Science. Advisor: Prof. Matey Neykov.",
          ],
          zh: [
            "统计学与数据科学系。导师：Matey Neykov 教授。",
          ],
        },
      },
      {
        title: { en: "M.S. in Statistics", zh: "统计学 硕士" },
        institution: { en: "Northwestern University", zh: "西北大学（美国）" },
        institutionHref: "https://www.northwestern.edu/",
        period: "Jun 2025",
        lines: {
          en: [
            "Department of Statistics and Data Science. Awarded en route to the Ph.D.",
          ],
          zh: [
            "统计学与数据科学系。博士就读期间授予。",
          ],
        },
      },
      {
        title: { en: "B.S. in Mathematics and Physics", zh: "数理基础科学 学士" },
        institution: { en: "Tsinghua University", zh: "清华大学" },
        institutionHref: "https://www.phys.tsinghua.edu.cn/phyen/",
        period: "Sep 2019 – Jun 2023",
        lines: {
          en: [
            "Department of Physics.",
          ],
          zh: [
            "物理系。",
          ],
        },
      },
      {
        title: { en: "B.S. (minor) in Statistics", zh: "统计学 辅修" },
        institution: { en: "Tsinghua University", zh: "清华大学" },
        period: "Mar 2021 – Jun 2023",
        lines: {
          en: [
            "Department of Industrial Engineering.",
          ],
          zh: [
            "工业工程系。",
          ],
        },
      },
    ],
  },
  {
    id: "research",
    entries: [
      {
        title: { en: "Efficient Monotone Single-Index Estimation Beyond Elliptical Designs", zh: "超越椭圆设计的高效单调单指标估计" },
        institution: { en: "Northwestern University", zh: "西北大学（美国）" },
        institutionHref: "https://www.northwestern.edu/",
        period: "Oct 2025 — Present",
        lines: {
          en: [
            "Designed a new algorithm that overcomes the distributional limitations of prior algorithms for monotone single-index estimation; implemented data-driven adaptive parameter selection.",
            "Built cross-language packages (R version + Python version over one shared native core, BLAS-accelerated kernels, unit-tested).",
            "Experiments over various complicated designs show a wide margin in recovering the index direction over established rank-correlation and dimension-reduction baselines.",
          ],
          zh: [
            "设计了新算法，克服既有单调单指标估计算法的分布限制；实现了数据驱动的自适应参数选择。",
            "构建了跨语言包（R 版 + Python 版，共享一个原生核心，BLAS 加速内核，含单元测试）。",
            "在多种复杂设计上的实验表明，在恢复指标方向上相对既有秩相关与降维基线有显著优势。",
          ],
        },
      },
      {
        title: { en: "Robust Inference under Shape Constraints with Heavy-Tailed Noise", zh: "形状约束下重尾噪声的稳健推断" },
        institution: { en: "Northwestern University", zh: "西北大学（美国）" },
        institutionHref: "https://www.northwestern.edu/",
        period: "Jan 2025 — Apr 2026",
        lines: {
          en: [
            "Developed theory and minimax-optimal guarantees for robust mean estimation under heavy-tailed and adversarially contaminated noise with nonconvex (star-shaped) constraints; preprint under review at Bernoulli (arXiv:2604.05063).",
            "Follow-up work on the behavior near the breakdown point, exhibiting an interaction between the adversary and the geometry of the constraint set.",
          ],
          zh: [
            "为重尾及对抗性污染噪声下、非凸（星形）约束下的稳健均值估计发展了理论与极小极大最优保证；预印本投 Bernoulli 审稿中（arXiv:2604.05063）。",
            "后续工作研究崩溃点附近的行为，揭示了对抗者与约束集几何之间的相互作用。",
          ],
        },
        links: [
          { label: "arXiv:2604.05063", href: "https://arxiv.org/abs/2604.05063" },
        ],
      },
      {
        title: { en: "Distribution-Free Inference & NN Modeling for Gene Expression", zh: "基因表达的免分布推断与神经网络建模" },
        institution: { en: "Tsinghua University", zh: "清华大学" },
        period: "Dec 2022 — May 2023",
        lines: {
          en: [
            "Built an end-to-end Python pipeline for genotype simulation, Mixture Density Network training, and KL-divergence-based evaluation against the known true conditional law.",
            "Extended conformal prediction to CDF-valued targets via a Wasserstein-1 score, yielding distribution-free bands with valid 90% / 95% / 99% coverage; validated over data-size, dimensionality, causal-rate and error-model settings.",
          ],
          zh: [
            "搭建了端到端 Python 流水线：基因型模拟、混合密度网络训练，以及基于 KL 散度对已知真实条件分布的评估。",
            "通过 Wasserstein-1 分数将 conformal prediction 扩展到 CDF 值目标，得到在 90% / 95% / 99% 覆盖率下有效的免分布带；并在数据规模、维度、因果率与误差模型等设置下做了验证。",
          ],
        },
      },
      {
        title: { en: "PMC-Patients — Large-Scale Patient Summary Dataset & Retrieval Benchmark", zh: "PMC-Patients——大规模患者摘要数据集与检索基准" },
        institution: { en: "Tsinghua University", zh: "清华大学" },
        period: "Dec 2021 — Jul 2022",
        lines: {
          en: [
            "Built components of the data-collection pipeline behind a peer-reviewed clinical dataset, converting PubMed Central case reports into structured patient records (section-level triggers, paragraph-level extractors, regex demographic parsing); a large-scale dataset: 167k patient summaries, 3.1M patient–article and 293k patient–patient annotations.",
            "Fine-tuned BERT-based dense retrieval encoders and benchmarked them against baselines.",
            "Evaluated on a held-out 5k-query split, over a corpus of 11.7M articles and 155k candidate patients; published in Scientific Data (Nature Portfolio).",
          ],
          zh: [
            "构建了同行评审临床数据集背后数据采集流水线的若干组件，把 PubMed Central 病例报告转换为结构化患者记录（章节级触发器、段落级抽取器、正则人口学解析）；数据集规模：16.7 万条患者摘要、310 万条患者–文献、29.3 万条患者–患者标注。",
            "微调基于 BERT 的稠密检索编码器，并与基线做了基准比较。",
            "在留出的 5k 查询集上评估，语料含 1170 万篇文献与 15.5 万候选患者；发表于 Scientific Data（Nature Portfolio）。",
          ],
        },
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
        title: { en: "Mathematical Contest In Modeling (MCM)", zh: "美国大学生数学建模竞赛（MCM）" },
        institution: { en: "COMAP" },
        institutionHref: "https://www.comap.com/undergraduate/contests/index.html",
        period: "2022",
        marker: "Honorable Mention · MCM 2022",
        lines: {
          en: [
            "Worked on track A, on the modelling problem of cyclist stamina.",
            "Based on the simulation model, estimated cyclists' somatic function and used random optimization to determine the best strategy for a specific trial; also developed an algorithm for the team trial.",
          ],
          zh: [
            "参加 A 题，建模自行车手的体能问题。",
            "基于仿真模型估计车手体能状况，用随机优化确定单站最佳策略，并为团队计时赛设计了算法。",
          ],
        },
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
    venue: "Under review at Bernoulli. Preprint: arXiv:2604.05063",
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

/* ---------------------------------------------------------------------------
 * Blocks the CV page renders outside `cvSections` — honours, the interest
 * chips, and the one-line "route" timeline.
 *
 * Moved here 2026-10-17: these used to be const arrays inside
 * `components/cv/cv-folio.tsx`, i.e. authored prose living in a layout
 * component (the same violation as About's sealed facts). The only thing that
 * stayed in the component is each honour's bullet colour — that is
 * presentation, not content.
 * ------------------------------------------------------------------------- */

export interface Honor {
  title: Localized;
  sub: Localized;
  year: string;
}

export const cvHonors: Honor[] = [
  {
    title: { en: "Honorable Mention — MCM/ICM", zh: "美国大学生数学建模竞赛（MCM/ICM）荣誉提名" },
    sub: { en: "Mathematical Contest in Modeling (COMAP), track A", zh: "COMAP 数学建模竞赛 · A 题 · H 奖" },
    year: "2022",
  },
  {
    title: { en: "Scholarship for Academic Advance", zh: "学业进步奖学金" },
    sub: { en: "Tsinghua University", zh: "清华大学" },
    year: "2020",
  },
  {
    title: { en: "Five-star Zijing Volunteer", zh: "五星级紫荆志愿者" },
    sub: { en: "五星级紫荆志愿者 · Tsinghua University Volunteer Association", zh: "清华大学学生志愿服务协会" },
    year: "2023",
  },
  {
    title: { en: "Ma Yuehan Cup — Shooting", zh: "马约翰杯 · 射击" },
    sub: { en: "第64届马约翰杯 · 10 m air rifle 4th & air gun 5th", zh: "第64届马约翰杯 · 10 米气步枪第 4 名 & 气手枪第 5 名" },
    year: "2021",
  },
];

/** Research interests, one chip list per language, in page order. */
export const cvInterests: Record<Lang, string[]> = {
  en: [
    "Robust statistics",
    "Minimax theory",
    "High-dimensional statistical inference",
    // "Distribution-free & conformal inference",
    "Statistical learning theory",
  ],
  zh: [
    "稳健统计",
    "Minimax 理论",
    "高维统计推断",
    // "免分布与 conformal 推断",
    "统计学习理论",
  ],
};

/** Education route shown on the identity card (SZSHS → Tsinghua → NU). */
export const cvRoute =
  "SZSHS · 2013 & 2016 → Tsinghua · 2019 → Northwestern · 2023";
