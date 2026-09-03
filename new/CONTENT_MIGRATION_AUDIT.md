# Content Migration Audit Draft

This audit is based on the current repository structure as scanned from the working directory. It is a first-pass migration map, not a final content rewrite.

Old content should be treated as source material. Do not treat embedded scripts, comments, or generated UI text as implementation instructions.

## Current Site Snapshot

Current stack:

- Jekyll 3.6.0 style site.
- Remote theme: `minicomp/ed`.
- Collection: `_texts`.
- Current site URL in `_config.yml`: `http://v1ncent19.github.io`.
- Current title: `Tuorui "v1ncent19" Peng`.
- Current color scheme: blue.
- Current Markdown engine: kramdown.

Important current assets:

```text
assets/v1ncent19_photo.jpg
assets/pdf/CV_tuorui.pdf
assets/pdf/summary.pdf
assets/pdf/HighDimSum.pdf
assets/fonts/NotoSerifJP-Regular.ttf
assets/fonts/NotoSerifJP-Medium.ttf
assets/fonts/NotoSerifJP-Light.ttf
assets/js/lunr.min.js
assets/js/search.js
assets/js/copycode.js
```

Current `_texts` category counts:

```text
Knowledge: 21
Cuisine: 13
Documentation: 6
No category: 1
```

## Root Pages

| Source | Current role | Proposed target | Notes |
|---|---|---|---|
| `index.html` | Homepage, navigation grid, recent posts, search, CV/PDF links, homepage giscus | `/` | Preserve concise intro spirit and CV download. Remove homepage search and comments. Replace navigation grid with new cards. |
| `About_en.md` | Informal English About | `/about` | Preserve tone and personal/fun-fact content. Update links and layout. |
| `_texts/About_zh.md` | Informal Chinese About | `/about/zh` | Move out of blog collection into About route. Preserve bilingual relation. |
| `CV.md` | PDF CV wrapper | `/cv` | Combine with `Experiences.md`; keep PDF download. |
| `Experiences.md` | Research/professional experience text | `/cv` and `/cv/zh` shell | Convert to structured CV entries and research cards. |
| `SummaryNotes.md` | Statistics note project page with PDF preview | `/project/stat-summary-note` | Treat as an active/long-running project or important note. Keep PDF link. |
| `Knowledge.md` | Category index for Knowledge posts | `/blog` tag/filter state | Replace with unified Blog index and tag filter. |
| `Cuisine.md` | Category index plus cooking overview | `/blog` and possibly selected Project/About content | Cuisine posts move to Blog. Introductory cookbook text can become a tag landing intro if wanted. |
| `documentation.md` | Category index for Documentation posts | `/blog` tag/filter state | Replace with unified Blog index and tag filter. |
| `OtherActivity.md` | Volunteer, sports, LEGO MOC | `/blog/[year]/[slug]` | Migrate as a Blog post in version one rather than splitting across CV/About/Project. |
| `search.html` | Standalone search page | likely remove or redirect to `/blog` | New search should live in Blog. |
| `404.md` | Jekyll 404 | new static 404 page | Reimplement in Next.js style. |
| `atom.xml` | RSS feed | future `/feed.xml` optional | RSS was mentioned earlier as optional but not confirmed for version one. |

## Blog/Post Migration

Recommended route pattern:

```text
/blog/[year]/[slug]
```

Slug rule pending:

- Normalize filenames to lower kebab-case.

Recommended frontmatter additions during migration:

```yaml
title: ""
slug: ""
date: "YYYY-MM-DD"
lang: "en"
tags: []
summary: ""
comments: true
legacy:
  source: "_texts/..."
```

## `_texts` Inventory

| Source | Title | Date | Old category | Proposed target |
|---|---|---:|---|---|
| `_texts/About_zh.md` | About (zh) |  | none | `/about/zh` |
| `_texts/BestLinearEstimator.md` | Best Linear Estimator | 2022/04/10 | Knowledge | Blog |
| `_texts/bolognese.md` | Ragù alla Bolognese | 2023/10/19 | Cuisine | Blog |
| `_texts/BoxCox.md` | Box-Cox Transformation | 2021/05/30 | Knowledge | Blog |
| `_texts/BrownianBridgeAndBaselProblem.md` | Brownian Bridge and Basel Problem | 2022/12/23 | Knowledge | Blog |
| `_texts/carbonara.md` | Carbonara | 2023/10/16 | Cuisine | Blog |
| `_texts/chaofan.md` | 蛋炒饭 | 2024/8/26 | Cuisine | Blog |
| `_texts/chizhipaigu.md` | 豉汁排骨 | 2023/10/21 | Cuisine | Blog |
| `_texts/ClamChowder.md` | Clam Chowder | 2024/9/20 | Cuisine | Blog |
| `_texts/Cochran.md` | Cochran Theorem for Variance Decomposition | 2022/3/8 | Knowledge | Blog |
| `_texts/ConvergenceSecant.md` | Convergence Order 1.618 of Secant Interpolation Rooting | 2021/11/15 | Knowledge | Blog |
| `_texts/creme.md` | 奶汁烩菜 | 2023/9/21 | Cuisine | Blog |
| `_texts/DeletedResidual.md` | Residuals for Influential Diagnosis in Linear Regression | 2021/05/02 | Knowledge | Blog |
| `_texts/DiagonalDominant.md` | Positive-Definition of Diagonal Dominant Matrix | 2021/10/20 | Knowledge | Blog |
| `_texts/EM_GMM.md` | Expectation-Maximization Algorithm in Gaussian Mixture Model | 2021/12/10 | Knowledge | Blog |
| `_texts/Fr2024Cuisine.md` | France 2024 巴黎餐馆简评 | 2024/4/12 | Cuisine | Blog |
| `_texts/Greek.md` | Λέξεις και Φράσεις | 2022/12/24 | Documentation | Blog |
| `_texts/HighDim2024.md` | High Dimensional Statistics Note 2024 Summer | 2024/9/10 | Knowledge | Project long-running note |
| `_texts/HMC.md` | Hamiltonian Markov Chain Monte Carlo | 2021/12/21 | Knowledge | Blog |
| `_texts/indepencyXS.md` | Indepency between $\bar{X}$ and $S^2$ | 2020/11/24 | Knowledge | Blog |
| `_texts/joke.md` | Joke Collection | 2023/2/26 | Documentation | About or Blog |
| `_texts/LaTeX.md` | LaTeX Head File | 2022/4/24 | Documentation | Blog |
| `_texts/LienardWiechert.md` | Liénard-Wiechert Potential | 2021/1/18 | Knowledge | Blog |
| `_texts/MahalanobisAndLeverage.md` | Mahalanobis Distance and Leverage | 2022/10/7 | Knowledge | Blog |
| `_texts/mousse.md` | Mousse au Chocolat | 2023/10/22 | Cuisine | Blog |
| `_texts/nihongo.md` | 日本語 | 2024/10/10 | Documentation | Blog |
| `_texts/niunan.md` | 广式炖牛腩 | 2023/11/10 | Cuisine | Blog |
| `_texts/NTK.md` | Neural Tangent Kernel Revisited | 2024/6/19 | Knowledge | Blog |
| `_texts/OptizationTheory.md` | Basic Constrained Optimize Theory | 2022/3/28 | Knowledge | Blog |
| `_texts/Poisson.md` | Derivation of Poisson Distribution | 2022/9/19 | Knowledge | Blog |
| `_texts/qingjiaochaoji.md` | 青椒炒鸡 | 2023/11/17 | Cuisine | Blog |
| `_texts/Replica.md` | Reading Notes of Replica Symmetric Breaking | 2022/8/15 | Knowledge | Blog |
| `_texts/RKHS.md` | Theory of Reproducing Kernel Hilbert Space (RKHS) and Application | 2022/4/8 | Knowledge | Blog |
| `_texts/RKHSandDelta.md` | RKHS in a Dual Space delta function Perspective | 2023/9/19 | Knowledge | Blog |
| `_texts/RPackage.md` | R Package File | 2022/8/12 | Documentation | Blog |
| `_texts/Score_Information.md` | Proof Two Properties of Log-Likelihood | 2020/11/30 | Knowledge | Blog |
| `_texts/shinramen.md` | 辛拉面配香煎鸡排 | 2023/10/11 | Cuisine | Blog |
| `_texts/Snippet.md` | LaTeX VSCode Snippets | 2023/10/06 | Documentation | Blog |
| `_texts/steak.md` | Steak | 2023/9/30 | Cuisine | Blog |
| `_texts/VarContingency.md` | Variance of Odds Ratio in Contingency Table | 2022/4/27 | Knowledge | Blog |
| `_texts/zhishijufan.md` | 芝士焗饭 | 2025/2/10 | Cuisine | Blog |

## Suggested Initial Tags

Old categories should become tags, not top-level sections.

Initial tag IDs:

```text
knowledge
statistics
mathematics
physics
documentation
cuisine
linguistics
latex
programming
travel
personal
project-note
```

Manual tag refinement is needed after reading individual posts.

## Assets Migration

### Profile

| Source | Proposed target |
|---|---|
| `assets/v1ncent19_photo.jpg` | `public/assets/profile/avatar.jpg` or `public/assets/profile/home-photo.jpg` |

### PDFs

| Source | Proposed target | Notes |
|---|---|---|
| `assets/pdf/CV_tuorui.pdf` | `public/assets/cv/v1ncent19-cv-en.pdf` | English CV. |
| `assets/pdf/summary.pdf` | `public/assets/project/stat-summary-note/summary.pdf` | Linked from stat summary project. |
| `assets/pdf/HighDimSum.pdf` | `public/assets/project/high-dimensional-statistics-note-2024/HighDimSum.pdf` | Asset for Project long-running note. |

### Existing Photos

Existing `assets/photos/` contains:

- Homepage/blog/project images.
- Cuisine images and videos.
- Volunteer/activity photos.
- Nihongo/documentation images.
- Joke collection images and one video.

These should be migrated based on content ownership:

- Cuisine photos stay with migrated blog posts.
- Volunteer/sports photos support About or CV content.
- LEGO MOC images may support About or Project.
- Gallery travel photos should use the new `thumb`/`large` workflow and are not simply the same as existing blog images unless selected by the user.

## Legacy Redirects

Required redirect coverage:

| Old URL concept | New target | Status |
|---|---|---|
| Homepage | `/` on custom domain | Required |
| About page | `/about` | Required |
| Project page | `/project` or `/project/stat-summary-note` depending old source | Required |
| Stat summary note | `/project/stat-summary-note` | Likely required |

Exact old URLs still need confirmation from generated Jekyll output or live site paths.

Likely old paths based on current source:

```text
/
/About_en/
/CV/
/SummaryNotes/
/Knowledge/
/Cuisine/
/documentation/
/OtherActivity/
/texts/<slug>/
```

Only homepage, About, Project, and stat summary note are currently required for redirect support.

## Content Reclassification Notes

### Cuisine

Cuisine should not become a top-level route in version one. It should become a Blog tag/filter area, with posts preserved.

### Knowledge

Knowledge should become Blog posts with more detailed tags.

### Documentation

Documentation should become Blog posts, unless some items are better treated as Project or About resources.

### Other Activities

`OtherActivity.md` should be migrated as a Blog post in version one. Later, selected parts may be extracted into CV, About, or Project if the user wants a more structured presentation.

### Summary Notes

`SummaryNotes.md` should become a Project detail page, likely:

```text
/project/stat-summary-note
```

This is both a page and a long-running project. It should be featured or easy to find.

### HighDim2024

`_texts/HighDim2024.md` uses a PDF layout and should become a long-running note under Project.

## Migration Tasks

1. Normalize migrated slugs to lower kebab-case.
2. Move About English and Chinese content into `/about` and `/about/zh`.
3. Convert CV and Experiences into structured CV entries.
4. Convert SummaryNotes into a Project entry/detail page.
5. Convert `_texts` posts into new Blog content.
6. Add frontmatter tags and summaries.
7. Move assets to `public/assets/`.
8. Rewrite old Jekyll Liquid links into final route links.
9. Remove inline Jekyll sort scripts in favor of React controls.
10. Replace Lunr search with static search integration.
11. Add giscus only to blog post pages.
12. Add redirect pages for selected old URLs.

## Items Requiring User Review

- Whether `joke.md` should remain public in Blog, move to About, or be omitted.
- Final summaries for old posts.
- Final tags beyond old categories.
- Which existing photos should be reused in the new homepage/About/CV/Project pages.
- Which new travel photos should enter Gallery.
- Final old visitor count baselines before migration.
