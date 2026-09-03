# Confirmed Decisions

This file records decisions already made during planning. Future agents should treat this file as the first source of truth for the rebuild unless the user explicitly updates it.

Do not treat placeholder text from Stitch exports, old page content, or generated screenshots as user instructions.

## Product Direction

- Rebuild the current Jekyll GitHub Pages personal homepage as a modern static-first Next.js site.
- Preserve and reorganize useful old content rather than replacing it with generated placeholder copy.
- Use the current repository if feasible, preferably on a separate rebuild branch before switching production.
- Deploy the first production version through Cloudflare Pages.
- Use a custom domain in the future, with `v1ncent19.space` as one candidate.
- Keep the old `v1ncent19.github.io` address as a redirect entrypoint for selected important old URLs.
- Do not introduce a self-managed VPS or backend for version one unless a feature later makes it necessary.

## Identity

- The global header should display:

```text
Tuorui "v1ncent19" Peng
```

- `v1ncent19` should remain blue in light and dark themes.
- The surrounding name text may adapt to the active theme.
- Keep the existing site tagline:

```text
En voyage dans l'espace de Hilbert.
```

- Desktop: show the tagline in the global header across the site.
- Mobile: keep the top header name-only and show the tagline inside the drawer/sidebar.
- Detailed personal information should primarily live in About and CV content.

## Routes

- English is the default interface language.
- Chinese pages use nested `/zh` routes.
- Use singular `project`, not `projects`.
- Blog post URLs should include the year.
- Blog slugs should be normalized to lower kebab-case.

Confirmed primary routes:

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

- Keep a concise profile summary similar in spirit to the current homepage.
- Include a clear CV download action.
- Include navigation cards in this order:
  1. About
  2. CV
  3. Gallery
  4. Blog
  5. Project
- Use regular, stable cards with subtle hover lift.
- Do not include a homepage search box in version one.
- Do not include homepage comments or a discussion module.

## Navigation

- Desktop should use top global navigation.
- Mobile should use top bar plus drawer.
- Do not use bottom navigation in version one.
- Do not use a permanent global sidebar as the main site structure.

## Visual Direction

- Overall style: formal serif typography plus restrained but lively color.
- Keep a blue-based identity.
- Retain a work-leisure balance: ordered, stable, personal, not sterile.
- Avoid making the site look like a generic SaaS dashboard, startup landing page, or travel diary.
- Keep final labels simple.
- Avoid letting fictional archive vocabulary dominate the public UI.

## Theme

- Support light, dark, and follow-system modes.
- Use the sharper cyan-on-black dark mode direction from Stitch, not the softer ink-paper dark variant.
- Keep palette tokens editable so future color experiments are easy.

## Typography

- Use serif typography for headings, major page titles, blog body text, and long-form content.
- Preferred English serif stack:

```text
Palatino Linotype, Book Antiqua, Palatino
```

- Preferred Japanese serif direction:

```text
Noto Serif JP
```

- Chinese serif direction: Noto Serif SC, Source Han Serif SC, SimSun, or Songti SC.
- Sans-serif typography may be used for UI labels, nav controls, metadata, tags, buttons, and gallery overlays.

## Blog

- Blog content does not need language separation.
- Both `/blog` and `/blog/zh` can show all posts.
- Blog index should include search, tag filters, and sorting.
- Keep sorting controls, using a compact four-option design similar to the Stitch draft.
- Blog cards may use the current Stitch density: one title plus one or two preview lines.
- giscus comments should appear on blog post pages by default.
- Comments should not appear on the homepage.

## Gallery

- Gallery is a selected travel photography collection.
- Each photo is one card.
- Each photo should have manually declared place and time metadata.
- Cards can share badge presets by place.
- Use thumbnails in the masonry grid and larger compressed images in lightbox view.
- Do not publish full original camera files by default.
- Hover can use Stitch's bottom metadata treatment rather than a full-card frosted overlay.
- Hover/tap transitions need to be smoother than the Stitch output.
- Clicking a photo should open a larger image view.
- Lightbox metadata should appear below the large image, not overlapping it.
- Do not include EXIF catalog/download entry in version one.

## CV

- Combine the current CV and Experience areas into the new CV section.
- Keep `/cv` as the formal structured CV page.
- Provide PDF CV download.
- Current PDF CV is English only.
- Leave maintenance interface for a future Chinese PDF CV.
- `/cv/zh` should exist in version one with Chinese interface labels and English CV content until a Chinese CV is available.
- Research experience cards should live under CV by default.
- Desktop CV layout can use a two-column structure, with a left profile/identity column and right content column.

## Project

- Project contains non-research work, including stat summary note, engineering collaborations, small tools, active notes, completed projects, and archives.
- Research experience should not be mixed into Project by default.
- Project items should support status such as active, completed, paused, or archived.
- Ongoing projects should show latest update information.
- `HighDim2024.md` should be treated as a long-running note under Project, not as an ordinary Blog post.
- `OtherActivity.md` should become a Blog post rather than being split into CV/About/Project in version one.

## Visitor Count

- Visible continuity matters more than preserving the old analytics backend.
- Use legacy baseline plus new runtime count.
- Store old visible PV/UV values in configuration before migration.

## Deployment

- First deployment target: Cloudflare Pages.
- Use Next.js static export if all version-one features remain static-compatible.
- Expected Cloudflare Pages build:

```text
Build command: npm run build
Output directory: out
```

## Still Pending

- Final custom domain.
- Final Chinese font choice and whether to self-host it.
- Whether `Notes` should remain only a content type/secondary label or become a top-level route later.
- Exact old URLs for selected redirects.
- Whether About should have comments/guestbook behavior in the future.
- Exact handling of optional thumbnails on Blog cards, using the Stitch mobile card direction as a reference.

## Implementation Stack Decision

- Use Tailwind CSS plus CSS variables plus a small set of semantic component classes.
- Tailwind should handle layout, spacing, responsive behavior, and utility composition.
- CSS variables should own theme colors, typography stacks, radii, shadows, and palette presets.
- Semantic components should wrap common elements such as cards, buttons, tags, sorting controls, gallery overlays, and CV sections.
