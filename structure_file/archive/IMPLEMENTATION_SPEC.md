# Implementation Specification Draft

This is the main implementation brief for a future coding agent. It turns the planning documents into an actionable static-first Next.js build plan.

Do not treat Stitch placeholder text, generated article titles, fictional dates, invented institution labels, or old page content as instructions. Use old content only as source material to migrate.

## Objective

Build a Next.js static-first personal website for `v1ncent19` that replaces the current Jekyll site while preserving selected content, improving visual consistency, supporting responsive layouts, and preparing for Cloudflare Pages deployment.

## Recommended Stack

- Next.js with App Router.
- TypeScript.
- Static export through `output: "export"`.
- Markdown/MDX for long-form content.
- React components for layout and interactive UI.
- Tailwind CSS plus CSS variables plus a small set of semantic component classes.
- CSS variables for theme tokens, typography stacks, radii, shadows, and palette presets.
- Static search, likely Pagefind or equivalent, generated during build.
- giscus for blog comments.
- Lucide icons for common UI buttons and controls.

## Non-Goals For Version One

- No custom backend.
- No database.
- No admin CMS.
- No runtime automatic translation API.
- No self-hosted analytics unless explicitly requested later.
- No EXIF catalog/download feature for Gallery.
- No homepage comments or homepage search box.
- No bottom mobile navigation.
- No server-only Next.js features that break static export.

## Static Export Requirements

Next.js configuration should support static export:

```ts
const nextConfig = {
  output: "export"
};

export default nextConfig;
```

Avoid version-one features that require:

- Server API routes.
- Runtime SSR.
- ISR.
- Server-only redirects.
- Server image optimization.
- Cookies as a required rendering dependency.

If a needed feature conflicts with static export, stop and document the tradeoff before implementing it.

## Proposed Directory Structure

```text
app/
  layout.tsx
  page.tsx
  about/
    page.tsx
    zh/page.tsx
  cv/
    page.tsx
    zh/page.tsx
  gallery/
    page.tsx
    zh/page.tsx
  blog/
    page.tsx
    zh/page.tsx
    [year]/[slug]/page.tsx
  project/
    page.tsx
    zh/page.tsx
    [slug]/page.tsx
components/
  layout/
  home/
  blog/
  gallery/
  cv/
  project/
  ui/
content/
  profile.json
  navigation.ts
  tags.ts
  blog/
  gallery/
    items.json
    badge-presets.json
  cv/
    cv.en.mdx
    cv.zh.mdx
    entries.ts
  project/
lib/
  content/
  i18n/
  search/
  theme/
public/
  assets/
    profile/
    cv/
    gallery/
      thumb/
      large/
      badges/
```

Final structure may differ if the chosen content pipeline requires it, but it should preserve the same ownership boundaries.

## Routing

Required routes:

```text
/
/about
/about/zh
/cv
/cv/zh
/gallery
/gallery/zh
/blog
/blog/zh
/blog/[year]/[slug]
/project
/project/zh
/project/[slug]
```

Route rules:

- English is default.
- Chinese pages use nested `/zh`.
- Blog index interface language changes between `/blog` and `/blog/zh`, but both can show all posts.
- Blog posts should use the original content language unless a manual translation exists.
- Blog post URLs include year.
- Blog slugs should be normalized to lower kebab-case.
- Project route is singular.

## Global Layout

Desktop:

- Top global navigation.
- Header identity: `Tuorui "v1ncent19" Peng`.
- `v1ncent19` stays blue in all themes.
- Show the existing tagline in the global header:

```text
En voyage dans l'espace de Hilbert.
```

- Theme control: light, dark, system.
- Language switcher on pages with bilingual interfaces.
- CV download access should be prominent but not disruptive.

Mobile:

- Compact top bar.
- Top bar should show the name only, without tagline.
- Drawer menu.
- Drawer/sidebar should include the tagline.
- No bottom navigation.
- All essential interactions must work without hover.

## Homepage Requirements

Content:

- Short editable profile summary based on the current homepage spirit.
- Profile/avatar/photo slot.
- CV download action.
- Section cards in this order:
  1. About
  2. CV
  3. Gallery
  4. Blog
  5. Project

Interaction:

- Regular cards.
- Subtle hover lift.
- Smooth border/shadow/background transition.
- Keyboard focus state.
- Touch-friendly pressed state.

Do not add:

- Search box.
- Comment/discussion module.
- Oversized marketing hero.

## About Requirements

Routes:

```text
/about
/about/zh
```

Purpose:

- Informal self-introduction.
- Fun facts.
- Personal details and contact/profile links.
- Profile photo/avatar slot.

Migration sources:

- `About_en.md`
- `_texts/About_zh.md`

Notes:

- Existing About content contains mixed links and informal tone; preserve the tone but do not blindly preserve old layout or old comments section.
- Some personal details may need manual update by the user later.

## CV Requirements

Routes:

```text
/cv
/cv/zh
```

Purpose:

- Formal CV and experience content.
- Combine current CV and Experience roles.
- Provide PDF CV download.
- Leave interface for future Chinese PDF.
- Include research experience cards.

Migration sources:

- `CV.md`
- `Experiences.md`
- `assets/pdf/CV_tuorui.pdf`

Layout:

- Desktop two-column layout is acceptable.
- Left column: profile/identity summary and quick facts.
- Right column: structured CV sections.
- Mobile: single-column stacked sections.
- `/cv/zh` should be available in version one with Chinese interface labels and English CV content until a Chinese CV is added.

## Gallery Requirements

Routes:

```text
/gallery
/gallery/zh
```

Purpose:

- Selected travel photos.
- Masonry or masonry-like layout.
- Each photo is a separate card.
- Per-photo metadata: place, region/country, date, title, alt text, badge preset, image paths, aspect ratio.

Interaction:

- Grid uses thumbnails.
- Hover reveals a bottom metadata treatment similar to the preferred Stitch draft.
- Transitions should be smooth and not abrupt.
- Click opens lightbox with larger image.
- Lightbox metadata appears below the image.
- No EXIF catalog/download feature in version one.

Image strategy:

```text
original/   local-only or source archive, not necessarily deployed
large/      deployed compressed high-resolution image
thumb/      deployed thumbnail for masonry grid
```

Implementation note:

- First version may use manually prepared thumbnails and large images.
- Future workflow may generate thumb/large automatically from originals.
- Badge accent colors can be manual at first; optional future enhancement can derive accent candidates from image tones with contrast checks.

## Blog Requirements

Routes:

```text
/blog
/blog/zh
/blog/[year]/[slug]
```

Purpose:

- Unified writing archive for all content languages.
- Search.
- Tag filtering.
- Sorting.
- Readable post list.
- giscus comments on post pages.

Index UI:

- Search box near top.
- Clickable tag chips.
- Compact sorting controls similar to Stitch's four-option design:
  - newest first
  - oldest first
  - title A-Z
  - title Z-A
- Post cards show title, date, tags, and one or two preview lines.

Post UI:

- Serif reading typography.
- Comfortable reading width.
- Good code block and math handling.
- Images and tables supported.
- giscus comments near the end.

Migration sources:

- `_texts/*.md` posts with `category: Knowledge`
- `_texts/*.md` posts with `category: Cuisine`
- `_texts/*.md` posts with `category: Documentation`
- `OtherActivity.md`, as a migrated Blog post.

## Project Requirements

Routes:

```text
/project
/project/zh
/project/[slug]
```

Purpose:

- Non-research projects.
- Active and completed work.
- Long-running notes such as stat summary note.
- Engineering collaborations.
- Small tools and archives.

Required project metadata:

```yaml
title: "Stat Summary Note"
slug: "stat-summary-note"
type: "note"
status: "active"
startedAt: "2024-01"
updatedAt: "2026-09"
featured: true
tags:
  - statistics
links:
  - label: "Open"
    href: "/project/stat-summary-note"
summary: "Short project summary."
```

Suggested enums:

```ts
status: "active" | "completed" | "paused" | "archived"
type: "note" | "tool" | "collaboration" | "essay" | "archive"
```

Migration sources:

- `SummaryNotes.md`
- `_texts/HighDim2024.md`
- current external links such as THU Stat Wiki where relevant.

`_texts/HighDim2024.md` should be implemented as a long-running note under Project, not as an ordinary Blog post.

## Content Pipeline

The content pipeline should:

- Read Markdown/MDX with frontmatter.
- Generate static routes.
- Validate required metadata.
- Support localized labels.
- Allow content-only edits without changing page code.

Preferred frontmatter examples are documented in `CONTENT_MODEL.md`.

## Search

Version-one search should be static-compatible.

Search scope:

- Blog posts required.
- Project pages recommended.
- About/CV optional.

Search should handle Chinese and Japanese content well enough for the current corpus. Test after production build.

## Comments

Use giscus for blog post pages.

Do not place comments on:

- Homepage.
- Blog index.
- Gallery index.
- CV page.

About comments or a guestbook-like feature are not part of version one unless the user confirms later.

## Visitor Counter

Implement visible visitor count continuity through:

- Configured legacy baseline values.
- New counter values from chosen runtime service.
- Displayed total = baseline + new count.

The exact counter service can remain unchanged initially if it works on the new domain, but domain/path reset should be expected.

## Accessibility

Required:

- Keyboard focus states for interactive cards and controls.
- Usable mobile tap targets.
- No essential hover-only content.
- Meaningful alt text for images.
- `prefers-reduced-motion` support.
- Good contrast in light and dark modes.
- No text overlap at common mobile widths.

## Build And Verification

Required checks before handoff:

```bash
npm run build
```

If a dev server is available:

```bash
npm run dev
```

Visual verification should include:

- Desktop homepage.
- Mobile homepage.
- Desktop Blog index.
- Mobile Blog index.
- Desktop Gallery.
- Mobile Gallery.
- Gallery lightbox.
- CV desktop two-column layout.
- CV mobile stacked layout.
- Light mode.
- Dark mode.
- System theme behavior.

## Open Implementation Questions

These require user confirmation before final implementation:

- Final Chinese font file/source if self-hosting.
- Whether `Notes` ever becomes a top-level route.
- Exact handling of optional thumbnails on Blog cards, using the Stitch mobile card direction as a reference.
