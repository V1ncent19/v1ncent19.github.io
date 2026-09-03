# Site Architecture Draft

## Purpose

The new site should be a long-term personal homepage for `v1ncent19`. It should combine academic background, project records, blog writing, and selected travel photography without forcing all content into a single academic portfolio or a single lifestyle blog format.

The rebuild should preserve useful existing content from the current Jekyll site, reorganize it, and improve the implementation using a modern static-first Next.js architecture.

## Confirmed Direction

- Framework: Next.js.
- Rendering model: static-first, with static export preferred where possible.
- Initial hosting: Cloudflare Pages.
- Domain: custom domain planned, candidate example `v1ncent19.space`.
- Old GitHub Pages site: preserved as a redirect entrypoint for the homepage and several important pages.
- Existing repository: preferred if feasible, developed first on a separate branch.
- Primary public identity: `v1ncent19`.
- Detailed personal information: mainly in About and CV pages.
- Site languages:
  - English is the default interface language.
  - Chinese pages use nested `/zh` paths, for example `/about/zh`.
  - Blog posts do not need to be separated by language.
  - Japanese is needed for correct text rendering inside posts, not as a full site language.
- Themes: light, dark, and follow-system.
- Comments: giscus is acceptable.
- Analytics/counting: visible continuity matters more than deep analytics. Use a legacy baseline plus new counter.

## Main Sections

The homepage card order should be:

1. About
2. CV
3. Gallery
4. Blog
5. Project

### Home

The homepage should stay close to the current homepage in spirit: concise, quiet, and identity-centered.

Expected content:

- Short personal profile summary, editable later by the site owner.
- A clear CV download action.
- Card navigation to major sections.
- Smooth card interactions replacing the current more rigid animation style.

The homepage should not become a generic marketing landing page. It should work as a personal index and point of orientation.

### About

The About page should contain personal introduction, fun facts, self-description, and other more personal material. This is the main place where personal details can appear.

The current bilingual About behavior should be preserved conceptually, with English default and Chinese as `/about/zh`.

### CV

The future CV page should combine the roles currently spread across About, CV, and Experience.

Expected content:

- Web CV sections using cards or structured blocks.
- PDF CV download.
- Future support for both English and Chinese PDF CV files.
- Research experience cards inside the CV page.
- Possible anchors for education, experience, research, publications, awards, and skills.

### Gallery

The Gallery should be a masonry-style travel photo collection.

Expected behavior:

- Each photo is an individual card.
- Each photo has manually declared place and time metadata.
- Desktop hover reveals a frosted/glass information layer.
- Mobile interaction should use tap or modal behavior instead of hover-only UI.
- Clicking a card opens a higher-resolution version of the photo.
- Badge styles can be shared across photos from the same place.

### Blog

The Blog should support all writing regardless of language. Interface language can change, but the content does not need to be duplicated or hidden by language.

Expected features:

- Markdown or MDX posts.
- Year-based post URLs.
- Tag system.
- Search box.
- Clickable tag filter UI at the top of the Blog index.
- giscus comments on post pages.

### Project

The Project section should list notes, tools, collaborations, engineering projects, and other non-research work.

Research experience should generally live inside CV. Project should not use a research-paper-like layout by default.

Projects may be completed, active, paused, or archived. This status should affect sorting and presentation.

## Static vs Dynamic Scope

The first version should avoid server requirements unless a feature clearly needs them.

Static-compatible choices:

- Markdown/MDX content.
- Build-time search index.
- giscus comments.
- External or script-based visitor counter.
- Static gallery metadata.
- Static CV PDF downloads.

Potential future dynamic features:

- Automatic translation through an API.
- Self-hosted analytics.
- Admin UI for editing content.
- Database-backed gallery or comment system.

These should not be required for version one.

## Open Questions

- Exact visual direction after Google Stitch or other UI exploration.
- Final custom domain choice.
- Whether to keep all old Jekyll content in the same repository history or archive part of it.
- Whether any old blog post URL unexpectedly needs redirect support.
- Whether the CV web page should eventually have a print stylesheet.
- Whether gallery image processing should be manual at first or scripted from the beginning.
