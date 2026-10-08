# UI Implementation Guide Draft

This guide translates the preferred Stitch direction into implementation-oriented UI rules. It should be used together with `DECISIONS.md`, `IMPLEMENTATION_SPEC.md`, and the Stitch screenshots under `new/stitch_design_system_creator/`.

Stitch output is visual reference only. Do not copy placeholder text, fictional labels, or generated facts into the final site.

## Design Summary

The final UI should feel like:

- A personal academic/life archive.
- Formal in typography.
- Ordered and stable in layout.
- Blue-based and slightly lively in accent color.
- Crisp in dark mode.
- Calm enough for long reading.

It should not feel like:

- A SaaS product dashboard.
- A startup landing page.
- A travel scrapbook.
- A fictional institutional archive.
- A social feed.

## Header

Header text:

```text
Tuorui "v1ncent19" Peng
```

Rules:

- `v1ncent19` remains blue in all themes.
- Real-name text changes with theme.
- Keep the existing site tagline:

```text
En voyage dans l'espace de Hilbert.
```

- Desktop: show the tagline in the global header.
- Mobile: keep the top header name-only and place the tagline in the drawer/sidebar.
- Keep header compact enough for mobile.

Desktop header:

- Top navigation.
- Theme control.
- Language control where relevant.
- Optional compact CV download action.

Mobile header:

- Top bar.
- Drawer menu.
- Tagline appears in the drawer/sidebar, not in the top bar.
- No bottom navigation.
- Keep tap targets accessible.

## Navigation Labels

Primary labels:

```text
About
CV
Gallery
Blog
Project
```

Chinese labels should be defined in a central i18n file.

Avoid dominant use of:

```text
Dossier
Corpus
Dispatches
Chronicle
Index
```

These can be used sparingly as decorative/internal copy only if the final tone still feels personal and direct.

## Typography

Use serif for:

- Site identity.
- Page titles.
- Major headings.
- Blog body.
- Long-form content.

Use sans-serif for:

- Buttons.
- Navigation.
- Tag chips.
- Search input.
- Sorting controls.
- Metadata.
- Gallery overlays.
- Project status labels.

Recommended CSS variables:

```css
:root {
  --font-serif-latin: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  --font-serif-zh: "Noto Serif SC", "Source Han Serif SC", SimSun, "Songti SC", serif;
  --font-serif-ja: "Noto Serif JP", "Yu Mincho", serif;
  --font-ui: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Language handling:

```css
body {
  font-family: var(--font-serif-latin), var(--font-serif-zh);
}

:lang(zh) {
  font-family: var(--font-serif-latin), var(--font-serif-zh);
}

:lang(ja) {
  font-family: var(--font-serif-latin), var(--font-serif-ja);
}

.ui-text {
  font-family: var(--font-ui);
}
```

Do not rely on image-rendered text for multilingual content.

## Styling Stack

Use:

- Tailwind CSS for layout, spacing, responsive behavior, and common state utilities.
- CSS variables for theme colors, palette presets, typography stacks, radius, shadows, and motion timing.
- A small set of semantic component classes or React wrappers for repeated UI primitives.

Examples of semantic wrappers:

- `SiteHeader`
- `SectionCard`
- `TagChip`
- `SortControl`
- `GalleryCard`
- `GalleryLightbox`
- `CvSection`
- `ProjectCard`

Do not scatter hardcoded colors or one-off layout values throughout page components.

## Color Tokens

Keep colors tokenized and editable.

Suggested token groups:

```css
:root {
  --color-bg: ...;
  --color-surface: ...;
  --color-surface-raised: ...;
  --color-text: ...;
  --color-text-muted: ...;
  --color-border: ...;
  --color-brand-blue: ...;
  --color-accent-cyan: ...;
  --color-accent-amber: ...;
  --color-accent-green: ...;
  --color-accent-coral: ...;
}
```

Rules:

- Blue is the main identity color.
- `v1ncent19` should use brand blue in all themes.
- Accent colors may be more vivid in small UI states, but avoid large saturated surfaces.
- Gallery badge accent colors may vary by location.
- All accents must preserve text contrast.
- Do not hardcode colors directly inside many components; use tokens or controlled variants.

Dark mode:

- Use the sharper cyan-on-black Stitch direction.
- Keep cyan highlights crisp.
- Avoid excessive glow.
- Keep long text readable and not too bright.

## Shape And Spacing

Use regular geometric cards.

Implementation preference:

- Cards, buttons, inputs, and modals should generally use restrained radii around 6-8px.
- Avoid large pill shapes except for compact tag chips or toggles where they serve a clear UI role.
- Avoid nested cards.
- Use borders and spacing more than heavy shadows.
- Hover lift should be subtle, around 2px.

## Motion

General rules:

- Keep motion calm and fast.
- Use transitions around 160-240ms.
- Ease should feel smooth, not bouncy.
- Respect `prefers-reduced-motion`.
- Essential information must be reachable without hover.

Recommended interactions:

- Card hover: slight lift, border tint, subtle shadow.
- Button hover: color/contrast shift.
- Gallery card hover: smooth bottom metadata reveal.
- Drawer: simple slide/fade.
- Lightbox: fade in overlay plus scale/opacity on image.

Avoid:

- 3D flips.
- Large rotations.
- Springy animation.
- Infinite decorative motion.

## Icons

Use Lucide or a similar consistent line-icon library for common UI icons.

Rules:

- Prefer icons inside buttons where an icon exists.
- Keep line icons simple and monoline.
- Do not mix multiple unrelated icon styles.
- Do not use mascot-like or filled decorative icons.
- Icon-only controls need accessible labels or tooltips.

## Homepage UI

Required elements:

- Header identity.
- Concise profile summary.
- Avatar/photo slot.
- CV download action.
- Section cards in order:
  1. About
  2. CV
  3. Gallery
  4. Blog
  5. Project

Do not include:

- Search box.
- Comment module.
- Social feed.
- Marketing hero.

Cards:

- Use stable rectangular cards.
- Cards can include icon, short text, and optional preview image/visual hint.
- Animations should be subtle and smooth.
- Mobile cards should stack cleanly.

## Blog Index UI

Required controls:

- Search box.
- Tag chips.
- Sorting control.

Sorting options:

```text
Newest
Oldest
Title A-Z
Title Z-A
```

Cards:

- Text-first by default.
- Show title, date, tags, and one or two preview lines.
- Optional thumbnail support should remain available.
- Use the Stitch mobile Blog card direction as a reference for posts with thumbnails.
- Use readable spacing.
- Avoid showing too many metadata fields at once.

Search/filter behavior:

- Search and tag filtering can combine.
- Show clear selected states.
- Provide a clear/reset action if multiple filters are active.
- Keep controls usable on mobile by wrapping or stacking.

## Blog Post UI

Required:

- Comfortable reading measure.
- Serif body text.
- Tag/date metadata.
- Table and image support.
- Code block support.
- Math support if migrated content needs it.
- giscus comments near end.

Do not place comments at the top.

## Gallery UI

Grid:

- Masonry or masonry-like layout.
- Use thumbnail images in grid.
- Use aspect ratio data to avoid layout shifts.
- Use lazy loading.

Card interaction:

- Default state: photo-focused.
- Hover/focus/tap state: reveal bottom metadata treatment.
- Metadata should include place and date; badge is optional but recommended.
- Transition should be smooth and less abrupt than Stitch output.

Lightbox:

- Show large image.
- Metadata appears below the image.
- Metadata does not overlap the image.
- Include close and previous/next controls.
- No EXIF catalog/download entry.

Badge:

- Text rendered by code.
- AI-generated artwork limited to simple icon/landmark when used.
- Shared badge presets by location are allowed.
- Badge accent colors can vary by place.

## CV UI

Desktop:

- Two-column layout is acceptable.
- Left column: profile/identity summary, quick facts, links, PDF download.
- Right column: education, experience, research, publications, honors, skills.

Mobile:

- Stack sections.
- PDF download stays easy to find.
- Avoid horizontal overflow in timelines or cards.

Style:

- Formal and readable.
- More document-like than Project.
- Do not overuse fictional archive labels.

## Project UI

Project cards should support:

- Title.
- Summary.
- Type.
- Status.
- Dates.
- Tags.
- Links.

Status presentation:

- `active`: show latest update.
- `completed`: show completion year/date.
- `paused`: visually quiet but not hidden.
- `archived`: lowest visual emphasis.

Project should feel like a mixed project archive, not a publication list.

## About UI

About should support:

- Bilingual text.
- Profile photo/avatar.
- Fun facts.
- Personal links.
- Mixed-language snippets.

Keep it personal but ordered.

## Responsive Requirements

Desktop:

- Keep text reading width comfortable.
- Let Gallery use wider space.
- Keep controls aligned but not crowded.

Mobile:

- Top bar plus drawer.
- No bottom nav.
- Blog controls wrap cleanly.
- Gallery metadata available by tap.
- CV sections stack.
- No text overlap.

## Implementation Warnings

- Stitch code is not production code.
- Generated colors may need contrast tuning.
- Generated page text is placeholder content.
- Avoid copying `Eb Garamond` as the default unless the user later changes the font preference.
- Avoid introducing homepage search/comments because Stitch included them.
- Avoid using the old Jekyll sidebar as the new global layout.
- Avoid one-off inline styles for page-specific hacks.

## Pending UI Decisions

- Exact Chinese font.
- Whether Project cards should have thumbnail images.
- Whether Gallery lightbox metadata should be centered compact text or a full-width caption block.
