/** Structured CV entries for the Experience page: the `research` (研究经历)
 * section mirrors the Experiences list, `education` the full Education list
 * (incl. the M.S. and the statistics minor), and `publications` the
 * Publications section of the formal CV (2026-09-04) — same entries, same
 * order, same wording. Source content is preserved; no facts invented. The
 * formal, complete CV remains the downloadable PDF shipped at
 * /assets/cv/v1ncent19-cv-en.pdf (public/assets/cv/). */

export interface CvEntry {
  title: string;
  institution?: string;
  institutionHref?: string;
  period?: string;
  lines: string[];
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
        title: "Ph.D. in Statistics",
        institution: "Northwestern University",
        institutionHref: "https://www.northwestern.edu/",
        period: "Sep 2023 — Present",
        lines: [
          "Department of Statistics and Data Science. Advisor: Prof. Matey Neykov.",
        ],
      },
      {
        title: "M.S. in Statistics",
        institution: "Northwestern University",
        institutionHref: "https://www.northwestern.edu/",
        period: "Sep 2023 – Jun 2025",
        lines: [
          "Department of Statistics and Data Science.",
        ],
      },
      {
        title: "B.S. in Mathematics and Physics",
        institution: "Tsinghua University",
        institutionHref: "https://www.phys.tsinghua.edu.cn/phyen/",
        period: "Sep 2019 – Jun 2023",
        lines: [
          "Department of Physics.",
        ],
      },
      {
        title: "B.S. (minor) in Statistics",
        institution: "Tsinghua University",
        period: "Mar 2021 – Jun 2023",
        lines: [
          "Department of Industrial Engineering.",
        ],
      },
    ],
  },
  {
    id: "research",
    entries: [
      {
        title: "Graduate Researcher",
        institution: "Northwestern University",
        institutionHref: "https://www.northwestern.edu/",
        period: "Jan 2025 — Present",
        lines: [
          "Project: Robust inference under shape constraints with heavy-tailed noise.",
          "Formulated a novel framework for robust mean estimation under star-shaped constraints, explicitly addressing non-Gaussian and heavy-tailed noise structures.",
          "Derived optimal minimax error bounds and established theoretical guarantees for estimators under non-convex and non-smooth geometric constraints.",
          "Presented the findings in a comprehensive research paper.",
        ],
        links: [
          { label: "arXiv:2604.05063", href: "https://arxiv.org/abs/2604.05063" },
        ],
      },
      {
        title: "Undergraduate Dissertation",
        institution: "Tsinghua University",
        period: "Dec 2022 – May 2023",
        lines: [
          "Project: Distribution-free inference and neural-network modeling for gene expression.",
          "Applied Mixture Density Networks (MDN) to model complex, multi-modal conditional distributions for high-dimensional genetic data.",
          "Extended the Conformal Prediction framework to construct distribution-free conformal bands for conditional distribution functions.",
          "Programmed the entire pipeline in Python, achieving predictive coverage guarantees without relying on strong distributional assumptions.",
        ],
      },
      {
        title: "Undergraduate Researcher & RA",
        institution: "Tsinghua University",
        period: "Dec 2021 – Jul 2022",
        lines: [
          "Project: Large-scale medical-record dataset.",
          "Developed a scalable data pipeline to crawl, parse, and structure case-report articles from PubMed OA.",
          "Formed a large-scale public dataset of patient summaries and their links (160k patient summaries, 293k similarity annotations).",
          "Fine-tuned large language models (LLMs) to automate text mining and medical entity extraction from unstructured biomedical literature.",
          "Published the open-source dataset on Nature Scientific Data.",
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
        institution: "COMAP",
        institutionHref: "https://www.comap.com/undergraduate/contests/index.html",
        period: "2022",
        marker: "Honorable Mention · MCM 2022",
        lines: [
          "Worked on track A, on the modelling problem of cyclist stamina.",
          "Based on the simulation model, estimated cyclists' somatic function and used random optimization to determine the best strategy for a specific trial; also developed an algorithm for the team trial.",
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

/** Publications, newest first — mirrors the Publications section of the CV. */
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
