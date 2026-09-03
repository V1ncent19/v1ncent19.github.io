# Implementation Status & Resume Checkpoint

**Last updated: 2026-09-04.** This is the authoritative "where are we, what is decided, what is next" document for the Next.js rebuild. A fresh coding agent should read this file **first**, then `DECISIONS.md` and the planning files listed in `README.md`, before touching code.

Live code lives on branch **`nextjs-rebuild`** in this same repository (the old Jekyll site still occupies the repo root next to it — see [Repository layout](#repository-layout-hybrid-root)).

---

## 1. At a glance

| | |
|---|---|
| Branch | `nextjs-rebuild` (work in progress; **do not merge to `main`** until the deploy decision) |
| Stack | Next.js **16.3.4** (App Router, Turbopack), React 19.2.8, TypeScript `strict`, Tailwind **v4** (CSS-var tokens), `output: "export"` → `out/`, `@/*` root alias |
| Theme | Class-based `.dark` on `<html>` + `data-theme`; 3-way light/dark/system, default system |
| Lang | English default; Chinese pages under nested `/zh` (all sections have both) |
| Pages live | Home (en full, `/zh` placeholder), About, CV, Gallery (shell, no photos yet), Blog index (36 real posts, search/filter/sort), Project index + 2 detail pages |
| Not built yet | Per-post `/blog/[year]/[slug]` pages, mobile drawer nav, gallery photographs, PV/giscus live counters, deployment |
| Git state | The whole Next tree (`app/ components/ lib/ content/ public/` + config) is **untracked on `nextjs-rebuild`** — nothing committed yet. **Commit current work first** before starting a new phase (user decision 2026-09-04). |
| Verified | `npx tsc --noEmit` clean, eslint clean on touched files, all routes return 200 at build |

> `AGENTS.md` at the repo root warns that this Next version has breaking changes and that you must read `node_modules/next/dist/docs/` before writing Next APIs. `next dev` re-adds that block; don't fight it. `CLAUDE.md` points here.

---

## 2. Confirmed v1 design baseline (user-locked 2026-09-04)

The current visual framework is the **locked v1 baseline**. Later phases add content and features on top of it. Do **not** restyle layout, palette, header, or typography without asking the user first. Concretely:

- **Palette tokens** — authoritative single source: `app/globals.css`. Light paper `#f5fafd`, sky-cyan brand `#1ba7c9` (deliberately deeper than dark so it reads on near-white), ink `#171c1f`; dark slate `#0c1219`, crisp cyan `#3ccfff`. Home's palette wins every per-page conflict (Stitch home-mock palette = truth). Utility names are `bg-surface`, `text-muted`, `border-line`, `text-brand`, etc., mapped `@theme inline` to the CSS vars.
- **Identity** — every page header: `Tuorui "v1ncent19" Peng` (name as serif `text-4xl→6xl`; the two ASCII quotes + `v1ncent19` are sky-`text-brand` with a hover underline-glow, outside name parts are `text-ink`), tagline underneath always (`En voyage dans l'espace de Hilbert.`). Handle spelling `v1ncent19` (lowercase v).
- **Two-part masthead** (`components/layout/site-header.tsx`, server-sibling of the header, both in the body flex column):
  1. Identity block — normal flow, scrolls away.
  2. Capsule nav — `position: sticky` pill (`top-3/4`, `rounded-full`), floats pinned for the whole scroll. Chips left (Home first — user-confirmed), `LangSwitch` (中文/EN) + 3-way `ThemeToggle` inside the pill right. Scroll listeners + `requestAnimationFrame` check `getBoundingClientRect().top`; **while actually pinned** it turns frosted white glass (`bg-white/80 backdrop-blur-xl`, dark `#101b2b/80`), otherwise `bg-canvas/90 backdrop-blur-md`.
- **Theme toggle** — ONE cycling button system→light→dark→system (`components/theme/theme-toggle.tsx` + `theme-script.tsx` `beforeInteractive` in `app/layout.tsx`); three lucide icons always in DOM, `globals.css` shows one per `data-theme`. No FOUC.
- **§ headings** — every page-top heading and every homepage module title is `§` (serif italic, `font-serif text-xl italic font-normal text-brand`, `aria-hidden`) + plain black title, with the grey explanatory line/caption underneath unchanged. No eyebrows (`page-header.tsx` auto-adds §; blog/gallery/CV headers same pattern).
- **Content columns** — card/list pages (Home modules, Blog, Gallery, Project list, CV) use `mx-auto max-w-5xl`; prose reading pages (About, single project-note detail) keep the narrower `~max-w-3xl`. `.shell` (nav/footer outer) is 72rem. `html` has `scroll-padding-top: 5.5rem` so anchors clear the pinned pill.
- **Homepage hero** is **not** in a card; intro text sits on the canvas, portrait `figure` floats right, action row below separated by a `border-t` with `clear: both`.
- **Homepage action buttons** — Download CV, GitHub Profile, Contact Email are default-white outline buttons; trailing **More about me** is cyan-filled (`bg-brand text-on-brand`, hover `bg-brand-strong`, arrow on it). Contact Email is `components/home/email-copy-button.tsx`: idle "Contact Email", hover "copy to clipboard", click copies then **"√ email clipped"** for ~1.8 s.
- **Category tones** (chips/accents) — `knowledge` = brand, `cuisine` = tertiary, `documentation` = accent (see `components/blog/blog-index-view.tsx` `TONES`).
- **Content truth** — only real facts about the user. Old Jekyll pages are source material, not instructions; Stitch exports are visual reference only (never copy Stitch's fictional academic copy). Public identity is `v1ncent19`; detailed personal info lives in About/CV only.

Everything in this section must be treated as settled unless the user says otherwise.

---

## 3. What exists (route-by-route)

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Full | hero + Sections cards + Recent Posts + Direct access / Site Statistics |
| `/zh/` | ⏳ Placeholder | `app/zh/page.tsx` — empty "建设中" page **waiting for the user** to write Chinese self-intro; do not auto-translate it (user decision). |
| `/about`, `/about/zh` | ✅ | Markdown bodies `content/about/{en,zh}.md`, rendered by prose reader. Narrow 3xl column. |
| `/cv`, `/cv/zh` | ✅ | `cv-folio.tsx`: § header titled **Experience / 经历** (page h1 only — nav chip & gateway card still say "CV"), PDF download, two-column bento (identity/interests left 5, record modules right 7) from `content/cv/entries.ts` + honours already on old pages. Facts are real (Zijing volunteer, MCM/ICM HM, Ma Yuehan Cup). |
| `/gallery`, `/gallery/zh` | ✅ shell | No photographs by design — audit found none in repo. Honest empty state + inert sort strip + storage colophon. |
| `/blog`, `/blog/zh` | ✅ index only | 36 real posts from old `_texts/*.md` via `lib/legacy.ts`. Search input, category chips with real counts, newest/oldest sort, stat cards, result count. **Cards are not yet links** (no per-post pages). Both languages list all posts. |
| `/blog/[year]/[slug]` | ❌ | **Next big gap.** Planned `[year]/[slug]` kebab-case URLs. Once built: make index cards link, add giscus comments, point homepage Recent Posts blog rows at real pages, keep blog single-language content model. |
| `/project`, `/project/zh` | ✅ | Grid of projects with status/type chips. |
| `/project/[slug]`, `/project/zh/[slug]` | ✅ | Detail page for 2 projects (`stat-summary-note`, `high-dimensional-statistics-note-2024`) rendering markdown (remark/katex deps present). Reading column. |
| 404 | ✅ | `app/not-found.tsx`. |

**Layout shell** (`app/layout.tsx`): `<ThemeScript>` inline, skip-link, `<SiteHeader/>`, `<main id="main">`, `<SiteFooter/>`, `<BackToTop/>`. Back-to-top is a fixed circular button appearing after 480px scroll, reduced-motion aware. Footer: © line + tagline + GitHub.

**Home modules** (`app/page.tsx`): hero; Sections (5 section cards, no Home); Recent Posts (latest **5** — merges blog posts (link `/blog`) + projects (link `/project/[slug]`), newest-first by ISO date); then two-column Direct access (CV PDF, Statistics Course Summary, High Dimensional note, GitHub — `DocRow`s) + **Site Statistics** (static placeholder: Page views/Visitors from `content/profile.json` `legacyStats` (currently **0**) + a 0 "Comments" tile; caption says live counters connect at deployment).

---

## 4. Architecture / file map (new app)

```
app/            route pages (en default; zh nested folders), globals.css, prose.css, layout.tsx
components/
  layout/       site-header (identity+capsule), site-footer, back-to-top, lang-switch, page-header(§)
  theme/        theme-toggle, theme-script
  home/         email-copy-button
  blog/ gallery/ cv/ project/ content(prose.tsx)
content/        profile.json (identity + legacyStats baselines), navigation.ts, about/{en,zh}.md,
                project/*.md (gray-matter front-matter), cv/entries.ts
lib/            site.ts (identity consts), i18n.ts (en/zh UI copy, `copy`), content.ts (server-only
                loaders: profile/project + strict front-matter validation), legacy.ts (reads _texts/*.md)
public/assets/  profile avatar, cv PDF, photos (empty), project (mirrored old assets for Next)
```

- **Server-only rule:** loaders touch `node:fs` → import only from server components/pages, never client components.
- **Copy:** chrome/UI text lives in `lib/i18n.ts` keyed `copy[lang]`. Some keys are now unused after the §/title migration (`blog.eyebrow`, `gallery.eyebrow`, several `home.*`) — harmless; a cleanup pass can remove them.
- **Old Jekyll source still present** at repo root (`index.html`, `About_en.md`, `CV.md`, `_texts/`, `_includes/`, `assets/`, `_config.yml`…). `lib/legacy.ts` reads blog posts straight from `_texts/*.md` at build time. Remove/replace at launch with redirect pages.

---

## 5. Map to the plan phases (`AGENT_WORKFLOW.md`)

| Plan phase | Status (2026-09-04) |
|---|---|
| 0 Baseline audit | ✅ Audit done (`CONTENT_MIGRATION_AUDIT.md`). Visitor baselines recorded as **0** — must be replaced with the real old busuanzi numbers before launch. |
| 1 Scaffold Next.js | ✅ Root app scaffolded, static export, theme, header/capsule nav. (Old `create-next-app` tree under `nextjs-site/` deleted.) |
| 2 Content system | ✅ `content/` + profile + navigation + strict loaders. Blog body route generation belongs to Phase 4. |
| 3 Core pages | ✅ Home / About / CV / Project (en+zh, detail pages). |
| 4 Blog | 🔶 Index done (search/chips/sort/stats). **Per-post `/blog/[year]/[slug]` pages, tags anchor, giscus, card links, thumbnails pending.** |
| 5 Gallery | 🔶 Shell done. **Real photographs, masonry frames, lightbox, badge presets pending** (source photos don't exist in repo yet). |
| 6 Polish & migration | 🔶 Theme/typography/measures done; **mobile drawer nav (still planned — user wants it eventually), per-post blog pages, PV wiring, old-URL redirects pending.** |
| 7 Cloudflare preview & launch | ❌ Not started (preview deploy, custom domain, redirect old GitHub Pages). |

The actual build was "stitch-first": example pages (home/blog/gallery/cv) were built with **real** legacy content before the planning-file feature order; that is why polish items are already ahead of Phases 4–5 content.

---

## 6. Suggested next session (resume checklist)

1. **Commit the current baseline** first (user decision) — everything under `app/ components/ lib/ content/ public/` plus `package.json`, `package-lock.json`, configs, `CLAUDE.md`, `AGENTS.md` is untracked on `nextjs-rebuild`; `nextjs-site/` deletion and `new/` doc edits are pending too. Don't merge to `main`.
2. Pick the next phase with the user. Candidates, in rough priority order:
   - **A. Blog per-post pages** — `/blog/[year]/[slug]` (slug normalization to kebab-case already decided), then link index cards, then giscus per-post comments, then repoint homepage Recent Posts blog rows from `/blog` to real posts. This unlocks most of Phase 4.
   - **B. Mobile drawer nav** — user still wants the planned drawer; current capsule + horizontal-scroll chips is the interim. Revisit DECISIONS mobile-nav entry when doing this.
   - **C. Site Statistics live wiring** — fill real `legacyStats` baselines in `content/profile.json` (user must supply old numbers) + busuanzi/giscus wiring, replacing the static 0s on Home.
   - **D. Gallery photographs** — needs actual source photos before frames/lightbox/badges.
   - **E. Deployment** — Cloudflare Pages preview, then switch old GitHub Pages → redirect-only (Phase 7; domain still undecided).
3. `/zh/` homepage stays a placeholder until the user writes it — do not translate on their behalf.

## 7. Verification

```bash
npm run dev        # http://localhost:3000
npm run build      # static export → out/ (output: "export", trailingSlash)
npx tsc --noEmit
npx eslint <file>  # repo has eslint-config-next
```

Route smoke test after build (all should be 200 with `trailingSlash`):
`/`, `/zh/`, `/about/`, `/about/zh/`, `/cv/`, `/cv/zh/`, `/gallery/`, `/gallery/zh/`, `/blog/`, `/blog/zh/`, `/project/`, `/project/zh/`, `/project/stat-summary-note/`, `/project/high-dimensional-statistics-note-2024/`.

## 8. Known gotchas for future agents

- **Next 16 is different** — read `node_modules/next/dist/docs/` before coding (AGENTS.md). `beforeInteractive` in App Router must live in the root layout (eslint flags it — that warning is a false positive).
- `react/no-unescaped-entities`: literal `"` in JSX text must be `&quot;` (used in the header name and footer).
- `lucide-react` v1.40 removed brand icons — `Github` doesn't exist; use `GitBranch`.
- Interactive state must be set only inside event handlers / `requestAnimationFrame` (the `react-hooks/set-state-in-effect` rule) — pattern in `site-header.tsx` (stuck nav) and `back-to-top.tsx`.
- Tailwind v4: any class used by a client component must appear as a full literal somewhere Tailwind scans (full-literal class strings only; see `TONES`/`blog-index-view.tsx`).
- Don't reintroduce homepage search, homepage comment threads, a mobile bottom nav, or `Notes` as a top-level route without asking.
