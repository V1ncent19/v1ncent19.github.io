/** Structured CV entries, migrated from the old `Experiences.md` page plus the
 * education timeline that already appears publicly on the old site
 * (About_en.md / index.html). Source content is preserved; no facts invented.
 * The formal, complete CV remains the downloadable PDF. */

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
        period: "2023 —",
        lines: [
          "Department of Statistics and Data Science.",
        ],
      },
      {
        title: "B.S. in Mathematics and Physics",
        institution: "Tsinghua University",
        institutionHref: "https://www.phys.tsinghua.edu.cn/phyen/",
        period: "2019 – 2023",
        lines: [
          "Department of Physics.",
          "Minor in Statistics, Department of Statistics and Data Science.",
        ],
      },
    ],
  },
  {
    id: "research",
    entries: [
      {
        title: "Undergraduate Dissertation",
        institution: "THU Center of Statistical Science",
        institutionHref: "http://www.stat.tsinghua.edu.cn/en/",
        period: "2023",
        lines: [
          "Title: “Statistical Modeling and Inference Based on Neural Network Prediction of Gene-Expression.” Advisor: Tianying Wang.",
          "Applied the Mixture Density Network to predicting gene-expression levels; studied the model's performance and robustness.",
          "Extended the Conformal Prediction framework to construct a conformal band for the distribution function of gene-expression level.",
        ],
      },
      {
        title: "Research Assistant",
        institution: "NUS Department of Statistics and Data Science",
        institutionHref: "https://www.stat.nus.edu.sg/",
        period: "2022",
        lines: [
          "Studied landscape modification in Simulated Annealing, especially on discrete Hamiltonians, to speed up sampling and optimization.",
          "Focused on the applicability of the spin-glass model and replica symmetric theory to explaining landscape modification.",
        ],
      },
      {
        title: "Research Assistant",
        institution: "THU Center of Statistical Science",
        institutionHref: "http://www.stat.tsinghua.edu.cn/en/",
        period: "2021 – 2022",
        lines: [
          "Crawled and parsed case-report articles on PubMed to build the PMC-Patient large-scale Electronic Medical Record dataset.",
          "Used PMC-Patient as a seed dataset to fine-tune a language model for crawling the whole PubMed Open-Access subset.",
          "Mapped the citation graph into patient links as a database for the retrieval system.",
          "Crawled and parsed medical entity–relation pairs from public medical websites to form a knowledge graph.",
        ],
      },
      {
        title: "Student Research Training",
        institution: "THU Department of Physics",
        institutionHref: "https://www.phys.tsinghua.edu.cn/phyen/",
        period: "2021 – 2022",
        lines: [
          "Studied heterogeneous junctions between metal electrodes and low-dimensional semiconductor MoS₂ to explore their characteristics and fabrication techniques.",
          "Experimented with different processing methods and technologies to obtain junctions with more stable and ideal performance.",
          "Further explored the use of low-dimensional materials in ionic micro-devices.",
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
