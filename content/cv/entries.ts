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
        period: "Sep 2023 — Expected Jun 2028",
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
        period: "Jun 2025",
        lines: [
          "Department of Statistics and Data Science. Awarded en route to the Ph.D.",
        ],
        linesZh: ["统计学与数据科学系。博士就读期间授予。"],
      },
      {
        title: "B.S. in Mathematics and Physics",
        titleZh: "数理基础科学 学士",
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
        title: "Efficient Monotone Single-Index Estimation Beyond Elliptical Designs",
        titleZh: "超越椭圆设计的高效单调单指标估计",
        institution: "Northwestern University",
        institutionZh: "西北大学（美国）",
        institutionHref: "https://www.northwestern.edu/",
        period: "Oct 2025 — Present",
        lines: [
          "Designed a new algorithm that overcomes the distributional limitations of prior algorithms for monotone single-index estimation; implemented data-driven adaptive parameter selection.",
          "Built cross-language packages (R version + Python version over one shared native core, BLAS-accelerated kernels, unit-tested).",
          "Experiments over various complicated designs show a wide margin in recovering the index direction over established rank-correlation and dimension-reduction baselines.",
        ],
        linesZh: [
          "设计了新算法，克服既有单调单指标估计算法的分布限制；实现了数据驱动的自适应参数选择。",
          "构建了跨语言包（R 版 + Python 版，共享一个原生核心，BLAS 加速内核，含单元测试）。",
          "在多种复杂设计上的实验表明，在恢复指标方向上相对既有秩相关与降维基线有显著优势。",
        ],
      },
      {
        title: "Robust Inference under Shape Constraints with Heavy-Tailed Noise",
        titleZh: "形状约束下重尾噪声的稳健推断",
        institution: "Northwestern University",
        institutionZh: "西北大学（美国）",
        institutionHref: "https://www.northwestern.edu/",
        period: "Jan 2025 — Apr 2026",
        lines: [
          "Developed theory and minimax-optimal guarantees for robust mean estimation under heavy-tailed and adversarially contaminated noise with nonconvex (star-shaped) constraints; preprint under review at Bernoulli (arXiv:2604.05063).",
          "Follow-up work on the behavior near the breakdown point, exhibiting an interaction between the adversary and the geometry of the constraint set.",
        ],
        linesZh: [
          "为重尾及对抗性污染噪声下、非凸（星形）约束下的稳健均值估计发展了理论与极小极大最优保证；预印本投 Bernoulli 审稿中（arXiv:2604.05063）。",
          "后续工作研究崩溃点附近的行为，揭示了对抗者与约束集几何之间的相互作用。",
        ],
        links: [
          { label: "arXiv:2604.05063", href: "https://arxiv.org/abs/2604.05063" },
        ],
      },
      {
        title: "Distribution-Free Inference & NN Modeling for Gene Expression",
        titleZh: "基因表达的免分布推断与神经网络建模",
        institution: "Tsinghua University",
        institutionZh: "清华大学",
        period: "Dec 2022 — May 2023",
        lines: [
          "Built an end-to-end Python pipeline for genotype simulation, Mixture Density Network training, and KL-divergence-based evaluation against the known true conditional law.",
          "Extended conformal prediction to CDF-valued targets via a Wasserstein-1 score, yielding distribution-free bands with valid 90% / 95% / 99% coverage; validated over data-size, dimensionality, causal-rate and error-model settings.",
        ],
        linesZh: [
          "搭建了端到端 Python 流水线：基因型模拟、混合密度网络训练，以及基于 KL 散度对已知真实条件分布的评估。",
          "通过 Wasserstein-1 分数将 conformal prediction 扩展到 CDF 值目标，得到在 90% / 95% / 99% 覆盖率下有效的免分布带；并在数据规模、维度、因果率与误差模型等设置下做了验证。",
        ],
      },
      {
        title: "PMC-Patients — Large-Scale Patient Summary Dataset & Retrieval Benchmark",
        titleZh: "PMC-Patients——大规模患者摘要数据集与检索基准",
        institution: "Tsinghua University",
        institutionZh: "清华大学",
        period: "Dec 2021 — Jul 2022",
        lines: [
          "Built components of the data-collection pipeline behind a peer-reviewed clinical dataset, converting PubMed Central case reports into structured patient records (section-level triggers, paragraph-level extractors, regex demographic parsing); a large-scale dataset: 167k patient summaries, 3.1M patient–article and 293k patient–patient annotations.",
          "Fine-tuned BERT-based dense retrieval encoders and benchmarked them against baselines.",
          "Evaluated on a held-out 5k-query split, over a corpus of 11.7M articles and 155k candidate patients; published in Scientific Data (Nature Portfolio).",
        ],
        linesZh: [
          "构建了同行评审临床数据集背后数据采集流水线的若干组件，把 PubMed Central 病例报告转换为结构化患者记录（章节级触发器、段落级抽取器、正则人口学解析）；数据集规模：16.7 万条患者摘要、310 万条患者–文献、29.3 万条患者–患者标注。",
          "微调基于 BERT 的稠密检索编码器，并与基线做了基准比较。",
          "在留出的 5k 查询集上评估，语料含 1170 万篇文献与 15.5 万候选患者；发表于 Scientific Data（Nature Portfolio）。",
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
