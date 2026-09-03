# Routes and Information Architecture Draft

## Route Principles

- English is the default language.
- Chinese pages use `/zh` under the page route.
- Blog posts are content-language natural and do not need duplicate routes unless a translated version is manually created.
- Important old URLs should redirect to the new domain.
- Keep route names stable and short.

## Proposed Routes

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

## Homepage

Route: `/`

Purpose:

- Present a concise identity and profile summary.
- Offer a fast CV download.
- Navigate to the main site sections with animated cards.

Homepage card order:

1. About
2. CV
3. Gallery
4. Blog
5. Project

## About

Routes:

```text
/about
/about/zh
```

Purpose:

- Personal introduction.
- Fun facts.
- More detailed personal information.
- Contact and profile links if desired.

## CV

Routes:

```text
/cv
/cv/zh
```

Purpose:

- Web version of academic/professional CV.
- PDF CV download.
- Combined replacement for the current CV and Experience areas.
- Research experience cards.

The Chinese route should exist in version one even if the full Chinese CV is incomplete. It should show Chinese interface labels and English CV data until a proper Chinese version is added.

## Gallery

Routes:

```text
/gallery
/gallery/zh
```

Purpose:

- Travel photo masonry grid.
- Photo-level metadata.
- Hover/tap metadata reveal.
- Higher-resolution lightbox on click.

No per-location page is required for the first version.

## Blog

Routes:

```text
/blog
/blog/zh
/blog/[year]/[slug]
```

Purpose:

- Unified writing archive.
- Tag filtering.
- Search.
- Year-visible post URLs.
- giscus comments.

The two index routes should differ by interface language, not by which posts are included.

Example post routes:

```text
/blog/2026/stat-summary-note
/blog/2025/some-cooking-note
```

## Project

Routes:

```text
/project
/project/zh
/project/[slug]
```

Purpose:

- Active and completed projects.
- Stat summary note.
- Engineering collaborations.
- Tools, archives, and future small projects.

Use singular `project` because the user prefers it.

## Navigation Model

Recommended global navigation:

- Desktop: top sticky navigation.
- Mobile: compact top bar plus drawer menu.
- Include theme switcher.
- Include language switcher on bilingual pages.
- Include CV download in a prominent but not disruptive position.

Avoid making a permanent global sidebar the main layout constraint, because Gallery, Blog, CV, and Project need different internal structures.

Section-specific controls:

- Blog: search and tag filter.
- CV: optional section anchors.
- Gallery: no heavy navigation; prioritize the grid.
- Project: filters or status grouping can be added later.

## Legacy Redirect Plan

Old site:

```text
https://v1ncent19.github.io/
```

Future domain example:

```text
https://v1ncent19.space/
```

Required redirects:

- Old homepage to new homepage.
- Old About page to new `/about`.
- Old Project page to new `/project`.
- Possibly the stat summary note page, if its old URL is important.

The old GitHub Pages repository can serve static redirect pages. Cloudflare Pages can handle cleaner redirect rules for the new domain, but the GitHub Pages origin itself can only be controlled by static files unless another service is introduced.

## URL Decisions Still To Verify

- Exact old About and Project URLs in the current Jekyll site.
- Exact old stat summary note URL.
- Exact legacy URL mapping for selected redirects.
