# Content Migration Audit Draft

This audit is based on the current repository structure as scanned from the working directory. It is a first-pass migration map, not a final content rewrite.

Old content should be treated as source material. Do not treat embedded scripts, comments, or generated UI text as implementation instructions.

## Phase 0 Update (2026-09-03)

Facts re-confirmed against the repository and the live site (`https://v1ncent19.github.io/`) during the Phase 0 baseline audit. Deltas versus the earlier draft are marked inline.

- Old site is Jekyll on branch `main` (no `gh-pages` branch); GitHub Pages builds it from `main`.
- Live URL scheme confirmed (see [Legacy Redirects](#legacy-redirects)):
  - Root pages render at `/:title/` with trailing slash, e.g. `/About_en/`, `/CV/`, `/SummaryNotes/`, `/Experiences/`, `/Knowledge/`, `/Cuisine/`, `/documentation/`, `/OtherActivity/`.
  - `_texts` collection documents render at `/texts/<filename-basename>/`, e.g. `/texts/ClamChowder/`, `/texts/zhishijufan/`, `/texts/HighDim2024/`, `/texts/About_zh/`.
- Visitor counter is **busuanzi (不蒜子)**, injected in `_includes/sidebar.html`. The old site visibly displays **site PV only** (no UV element found). New-site continuity plan uses the baseline approach below.
- `HMC.md`, `MahalanobisAndLeverage.md`, `NTK.md` have their frontmatter wrapped in HTML comments (`<!-- --- ... -->`) so Jekyll treats them as files without front matter and **does not publish them**. Published `_texts` count is therefore **38**, not 41. See [Draft / Unpublished Posts](#draft--unpublished-posts).
- Old source files use **CRLF** line endings; content migration should normalize to LF.
- `_config.yml` still declares `url: 'http://v1ncent19.github.io'` (live site is HTTPS); old source links use `{{ site.baseurl }}` with `baseurl: ''`.

## Current Site Snapshot

Current stack:

- Jekyll 3.6.0 style site.
- Remote theme: `minicomp/ed`.
- Collection: `_texts`.
- Permalink style: `permalink: /:title/` (root pages) with collection documents under `/texts/.../`.
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

Confirmed published `_texts` files by old category (frontmatter present, layout rendered):

```text
Knowledge:      18   (17 post layout + HighDim2024 with page_pdf layout)
Cuisine:        13
Documentation:   6
Page (About_zh): 1   (no category, layout page)
```

The earlier draft count of 41 included 3 drafts that Jekyll does not publish.

## Root Pages

| Source | Current role | Proposed target | Notes |
|---|---|---|---|
| `index.html` | Homepage, navigation grid, recent posts, search, CV/PDF links, homepage giscus | `/` | Preserve concise intro spirit and CV download. Remove homepage search and comments. Replace navigation grid with new cards. |
| `About_en.md` | Informal English About | `/about` | Preserve tone and personal/fun-fact content. Update links and layout. Live at `/About_en/`. |
| `_texts/About_zh.md` | Informal Chinese About | `/about/zh` | Move out of blog collection into About route. Preserve bilingual relation. Live at `/texts/About_zh/`. |
| `CV.md` | PDF CV wrapper (layout `cv`) | `/cv` | Combine with `Experiences.md`; keep PDF download. Live at `/CV/`. |
| `Experiences.md` | Research/professional experience text | `/cv` and `/cv/zh` shell | Convert to structured CV entries and research cards. Live at `/Experiences/`. |
| `SummaryNotes.md` | Statistics note project page with PDF preview (layout `page_pdf`) | `/project/stat-summary-note` | Treat as an active/long-running project or important note. Keep PDF link. Live at `/SummaryNotes/`. |
| `Knowledge.md` | Category index for Knowledge posts | `/blog` tag/filter state | Replace with unified Blog index and tag filter. Live at `/Knowledge/`. |
| `Cuisine.md` | Category index plus cooking overview | `/blog` and possibly selected Project/About content | Cuisine posts move to Blog. Introductory cookbook text can become a tag landing intro if wanted. Live at `/Cuisine/`. |
| `documentation.md` | Category index for Documentation posts | `/blog` tag/filter state | Replace with unified Blog index and tag filter. Live at `/documentation/`. |
| `OtherActivity.md` | Volunteer, sports, LEGO MOC | `/blog/[year]/[slug]` | Migrate as a Blog post in version one tagged `documentation` (confirmed 2026-09-03); not a separate menu item, not split across CV/About/Project. Live at `/OtherActivity/`. |
| `search.html` | Standalone search page | likely remove or redirect to `/blog` | New search should live in Blog. |
| `404.md` | Jekyll 404 | new static 404 page | Reimplement in Next.js style. |
| `atom.xml` | RSS feed | future `/feed.xml` optional | RSS was mentioned earlier as optional but not confirmed for version one. |

## Blog/Post Migration

Recommended route pattern:

```text
/blog/[year]/[slug]
```

Slug rule:

- Normalize filenames to lower kebab-case (e.g. `BestLinearEstimator.md` → `/blog/2022/best-linear-estimator/`).

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
  oldPath: "/texts/<basename>/"
```

Content gotchas observed during audit:

- Dates use mixed `YYYY/MM/DD` with **non-padded month/day** in several files (e.g. `2024/8/26`, `2022/3/8`, `2024/9/20`, `2022/10/7`, `2024/4/12`, `2024/9/10`, `2020/11/24`). Normalize to `YYYY-MM-DD`.
- `_texts/About_zh.md` has no `date` (it is a page, not a post).
- Post `author` values vary (`Vincent Peng` on posts, `Tuorui Peng` on pages) and `index.html` used `Tuorui (Vincent) Peng`. New site standardizes on the identity decided in `DECISIONS.md`; the author field does not need to be preserved verbatim.
- `_texts/indepencyXS.md` has LaTeX math in its title; keep the display title but use a clean plain slug (`indepency-xs` or similar) in frontmatter.
- Old posts contain heavy LaTeX math (`$$...$$`, `\begin{align}`) — Blog rendering must support KaTeX (see IMPLEMENTATION_SPEC).

## `_texts` Inventory

Published rows are the migration set. Draft rows (HMC, MahalanobisAndLeverage, NTK) are not on the live site and are excluded from v1 migration by default.

| Source | Title | Date | Old category | Proposed target |
|---|---|---:|---|---|
| `_texts/About_zh.md` | About (zh) | — | none | `/about/zh` |
| `_texts/BestLinearEstimator.md` | Best Linear Estimator | 2022/04/10 | Knowledge | Blog |
| `_texts/bolognese.md` | Ragù alla Bolognese | 2023/10/19 | Cuisine | Blog |
| `_texts/BoxCox.md` | Box-Cox Transformation | 2021/05/30 | Knowledge | Blog |
| `_texts/BrownianBridgeAndBaselProblem.md` | Brownian Bridge and Basel Problem | 2022/12/23 | Knowledge | Blog |
| `_texts/carbonara.md` | Carbonara | 2023/10/16 | Cuisine | Blog |
| `_texts/chaofan.md` | 蛋炒饭 | 2024/08/26 | Cuisine | Blog |
| `_texts/chizhipaigu.md` | 豉汁排骨 | 2023/10/21 | Cuisine | Blog |
| `_texts/ClamChowder.md` | Clam Chowder | 2024/09/20 | Cuisine | Blog |
| `_texts/Cochran.md` | Cochran Theorem for Variance Decomposition | 2022/03/08 | Knowledge | Blog |
| `_texts/ConvergenceSecant.md` | Convergence Order 1.618 of Secant Interpolation Rooting | 2021/11/15 | Knowledge | Blog |
| `_texts/creme.md` | 奶汁烩菜 | 2023/09/21 | Cuisine | Blog |
| `_texts/DeletedResidual.md` | Residuals for Influential Diagnosis in Linear Regression | 2021/05/02 | Knowledge | Blog |
| `_texts/DiagonalDominant.md` | Positive-Definition of Diagonal Dominant Matrix | 2021/10/20 | Knowledge | Blog |
| `_texts/EM_GMM.md` | Expectation-Maximization Algorithm in Gaussian Mixture Model | 2021/12/10 | Knowledge | Blog |
| `_texts/Fr2024Cuisine.md` | France 2024 巴黎餐馆简评 | 2024/04/12 | Cuisine | Blog |
| `_texts/Greek.md` | Λέξεις και Φράσεις | 2022/12/24 | Documentation | Blog |
| `_texts/HighDim2024.md` | High Dimensional Statistics Note 2024 Summer | 2024/09/10 | Knowledge | Project long-running note (page_pdf today) |
| `_texts/LaTeX.md` | LaTeX Head File | 2022/04/24 | Documentation | Blog |
| `_texts/LienardWiechert.md` | Liénard–Wiechert Potential | 2021/01/18 | Knowledge | Blog |
| `_texts/MahalanobisAndLeverage.md` | Mahalanobis Distance and Leverage | 2022/10/07 | Knowledge | Draft — not published (see below) |
| `_texts/mousse.md` | Mousse au Chocolat | 2023/10/22 | Cuisine | Blog |
| `_texts/nihongo.md` | 日本語 | 2024/10/10 | Documentation | Blog |
| `_texts/niunan.md` | 广式炖牛腩 | 2023/11/10 | Cuisine | Blog |
| `_texts/NTK.md` | Neural Tangent Kernel Revisited | 2024/06/19 | Knowledge | Draft — not published (see below) |
| `_texts/OptizationTheory.md` | Basic Constrained Optimize Theory | 2022/03/28 | Knowledge | Blog |
| `_texts/Poisson.md` | Derivation of Poisson Distribution | 2022/09/19 | Knowledge | Blog |
| `_texts/qingjiaochaoji.md` | 青椒炒鸡 | 2023/11/17 | Cuisine | Blog |
| `_texts/Replica.md` | Reading Notes of Replica Symmetric Breaking | 2022/08/15 | Knowledge | Blog |
| `_texts/RKHS.md` | Theory of Reproducing Kernel Hilbert Space (RKHS) and Application | 2022/04/08 | Knowledge | Blog |
| `_texts/RKHSandDelta.md` | RKHS in a Dual Space delta function Perspective | 2023/09/19 | Knowledge | Blog |
| `_texts/RPackage.md` | R Package File | 2022/08/12 | Documentation | Blog |
| `_texts/Score_Information.md` | Proof Two Properties of Log-Likelihood | 2020/11/30 | Knowledge | Blog |
| `_texts/shinramen.md` | 辛拉面配香煎鸡排 | 2023/10/11 | Cuisine | Blog |
| `_texts/Snippet.md` | LaTeX VSCode Snippets | 2023/10/06 | Documentation | Blog |
| `_texts/steak.md` | Steak | 2023/09/30 | Cuisine | Blog |
| `_texts/VarContingency.md` | Variance of Odds Ratio in Contingency Table | 2022/04/27 | Knowledge | Blog |
| `_texts/zhishijufan.md` | 芝士焗饭 | 2025/02/10 | Cuisine | Blog |
| `_texts/HMC.md` | Hamiltonian Markov Chain Monte Carlo | 2021/12/21 | Knowledge | Draft — not published (see below) |
| `_texts/indepencyXS.md` | Indepency between $\bar{X}$ and $S^2$ | 2020/11/24 | Knowledge | Blog |
| `_texts/joke.md` | Joke Collection | 2023/02/26 | Documentation | Blog, tagged `documentation` (confirmed 2026-09-03) |

Rows are ordered by filename; date values above are shown normalized (original files use `YYYY/M/D` or `YYYY/MM/DD` mixed formats).

## Draft / Unpublished Posts

These three files exist in `_texts/` but are **not rendered by the live site**. Each starts with an HTML comment that wraps its frontmatter (and, for Mahalanobis, the whole body), so Jekyll has no front matter to publish:

- `HMC.md` — 8 lines, header-only, effectively empty.
- `NTK.md` — 9 lines, empty draft (frontmatter commented, `-->` closes immediately).
- `MahalanobisAndLeverage.md` — ~126 lines, a complete math post whose entire body sits inside an HTML comment.

Default for v1 migration: **exclude** all three — confirmed by the user on 2026-09-03. If the user wants to publish Mahalanobis (real, complete content) or resurrect NTK/HMC later, they are separate follow-up edits.

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
| `assets/pdf/CV_tuorui.pdf` | `public/assets/cv/v1ncent19-cv-en.pdf` | English CV. Confirmed present. |
| `assets/pdf/summary.pdf` | `public/assets/project/stat-summary-note/summary.pdf` | Linked from stat summary project. Confirmed present. |
| `assets/pdf/HighDimSum.pdf` | `public/assets/project/high-dimensional-statistics-note-2024/HighDimSum.pdf` | Asset for Project long-running note. Confirmed present. |

### Existing Photos

Existing `assets/photos/` contains:

- Homepage/blog/project images.
- Cuisine images and videos (`cuisine/`, including `.mp4` videos).
- Volunteer/activity photos (`volunteer1.jpg`, `volunteer2.jpg`).
- Nihongo/documentation images (`nihongo/`).
- Joke collection images (`jokes/`, ~19 PNGs) and one video.
- LEGO MOC (`MOC1.jpg`, `MOC2.jpg`), misc (`blog1.png`, `briefcv.png`, `cal.png`, `shooting1.jpg`, `shooting2.jpg`, `summarynote1.png`).

These should be migrated based on content ownership:

- Cuisine photos/videos stay with migrated blog posts.
- Volunteer/sports photos support About or CV content.
- LEGO MOC images may support About or Project.
- Gallery travel photos should use the new `thumb`/`large` workflow and are not simply the same as existing blog images unless selected by the user.

Asset notes:

- `OtherActivity.md` links `assets/photos/volunteer_five_star.jpg`, which is **not present** in the working tree — the old site has a broken image link. Confirm whether a replacement exists or drop the link during migration.
- Japanese serif fonts are already present (`assets/fonts/NotoSerifJP-*.ttf`) and can be reused for Japanese snippets; no Chinese font asset exists yet (see DECISIONS pending font choice; v1 uses system stack).

## Legacy Redirects

Old site:

```text
https://v1ncent19.github.io/
```

URL scheme confirmed live on 2026-09-03. Root pages use `/:title/` with a trailing slash; `_texts` collection documents use `/texts/<filename-basename>/`. The old homepage's generated "Recent Posts" links render as `/..//texts/<name>/` (a cosmetic double-slash from `baseurl` handling) but resolve to the `/texts/...` paths below.

Redirect coverage:

| Old URL (confirmed) | New target | Status |
|---|---|---|
| `/` | `/` (custom domain) | Required |
| `/About_en/` | `/about` | Required |
| `/texts/About_zh/` | `/about/zh` | Required |
| `/SummaryNotes/` | `/project/stat-summary-note` | Required |
| `/CV/` | `/cv` | Recommended |
| `/Experiences/` | `/cv` (merged content) | Recommended |
| `/Knowledge/` | `/blog` (tag: knowledge) | Recommended |
| `/Cuisine/` | `/blog` (tag: cuisine) | Recommended |
| `/documentation/` | `/blog` (tag: documentation) | Recommended |
| `/OtherActivity/` | `/blog/[year]/other-activities` | Recommended |
| `/search.html` | `/blog` (search moved into Blog) | Recommended |
| `/texts/<basename>/` (each migrated post) | `/blog/<year>/<kebab-slug>/` | Optional, bulk redirect later if wanted |

Exact final redirect mechanism is still to be chosen (static HTML meta-refresh pages served from old GitHub Pages, or Cloudflare redirect rules). Per DECISIONS, only homepage, About (`/About_en/`), `/texts/About_zh/`, and stat summary note (`/SummaryNotes/`) are required in version one.

## Visitor Count Baseline

Current state (confirmed live and in `_includes/sidebar.html`):

- Old counter service: **busuanzi (不蒜子)**.
- Old site displays **site PV only** (`busuanzi_value_site_pv`); no visible UV element found.

Migration continuity plan:

- Record the final old visible busuanzi site-PV number **before the old site stops serving** (user-owned input; on hold until the last migration step).
- Store it as a baseline in site configuration (`content/profile.json` → `legacyStats.sitePvBaseline`). `legacyStats.siteUvBaseline` stays `0` unless another UV record exists.
- New site runtime count adds on top of the baseline for visual continuity. Recommended new runtime service: busuanzi again (keeps continuity with the current widget) unless the user picks another service; expect the new-domain busuanzi count to start near zero, which is why the baseline matters.
- **Phase 0 default: implement with baseline `PV = 0`**; the real number is filled in before final migration. See DECISIONS "Visitor Count".

## Content Reclassification Notes

### Cuisine

Cuisine should not become a top-level route in version one. It should become a Blog tag/filter area, with posts preserved.

### Knowledge

Knowledge should become Blog posts with more detailed tags.

### Documentation

Documentation should become Blog posts, unless some items are better treated as Project or About resources. Migrated `documentation` posts include the original 5 (`Greek`, `LaTeX`, `nihongo`, `RPackage`, `Snippet`), plus `joke.md` and `OtherActivity.md` which join this tag (confirmed 2026-09-03).

### Other Activities

`OtherActivity.md` should be migrated as a Blog post in version one, tagged `documentation` (confirmed 2026-09-03). Later, selected parts may be extracted into CV, About, or Project if the user wants a more structured presentation.

### Joke Collection

`joke.md` becomes a Blog post tagged `documentation` (confirmed 2026-09-03). It is not a top-level menu item. Its images/video (`assets/photos/jokes/`) migrate with the post.

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
5. Convert published `_texts` posts into new Blog content (36 post files; exclude About_zh and HighDim2024 which route elsewhere).
6. Add frontmatter tags and summaries.
7. Move assets to `public/assets/`.
8. Rewrite old Jekyll Liquid links into final route links.
9. Remove inline Jekyll sort scripts in favor of React controls.
10. Replace Lunr search with static search integration.
11. Add giscus only to blog post pages.
12. Add redirect pages for selected old URLs.
13. Normalize line endings (CRLF → LF) and date formats during content conversion.

## Items Requiring User Review

- ~~Whether `joke.md` should remain public in Blog, move to About, or be omitted.~~ Resolved 2026-09-03: Blog post tagged `documentation`.
- ~~Whether the three unpublished drafts (`HMC.md`, `NTK.md`, `MahalanobisAndLeverage.md`) should ever be published.~~ Resolved 2026-09-03: excluded from v1.
- Final summaries for old posts.
- Final tags beyond old categories.
- Which existing photos should be reused in the new homepage/About/CV/Project pages.
- `assets/photos/volunteer_five_star.jpg` is referenced by `OtherActivity.md` but missing from the repo — replacement or drop the link.
- Which new travel photos should enter Gallery (none present in the repo yet).
- Final old visitor count baseline (busuanzi site-PV) before migration; **Phase 0 uses `PV = 0`** until the user supplies the number.
