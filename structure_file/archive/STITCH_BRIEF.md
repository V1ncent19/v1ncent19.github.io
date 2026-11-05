# Google Stitch UI Brief

This file is intended as prompt material for Google Stitch or a similar AI UI design tool. It focuses on visual direction, page structure, and interaction behavior. It should not be treated as a full engineering specification.

## Project Summary

Design a static personal website for `v1ncent19`.

The site is a personal archive combining academic/professional material, personal blog writing, projects, and selected travel photography. It should feel ordered and work-oriented, but not cold. It should keep some of the current site's serif, formal, slightly literary character while using livelier but restrained colors.

The result should not look like a startup landing page, a commercial portfolio template, or a travel diary. It should feel like a personal homepage with academic, technical, and life-writing dimensions.

## Pages To Design

Please design these pages as a coherent system:

1. Home
2. About
3. CV
4. Gallery
5. Blog Index
6. Project

Design both desktop and mobile versions.

## Site Structure

Primary navigation order:

1. About
2. CV
3. Gallery
4. Blog
5. Project

Language structure:

- English is the default interface language.
- Chinese versions use nested `/zh` routes, such as `/about/zh`.
- Blog content is not separated by language; both English and Chinese blog index pages can show all posts.
- Japanese text may appear inside some posts and should have correct Japanese serif font handling.

## Home Page

The homepage should be similar in spirit to the existing homepage:

- Very concise personal profile summary.
- A clear but unobtrusive CV download action.
- Card navigation to the main sections.
- Stable, ordered, calm layout.
- No homepage search box.
- No homepage comments or discussion module.

The homepage is the main visual gateway of the site, but it should stay restrained. Avoid oversized marketing-style hero sections.

Homepage card order:

1. About
2. CV
3. Gallery
4. Blog
5. Project

Card behavior:

- Regular geometric cards.
- Stable composition.
- Subtle hover lift.
- Smooth border, shadow, or background transitions.
- No aggressive tilt, flip, or playful motion in the first version.

## Visual Direction

Keywords:

- Formal serif typography.
- Lively but restrained color.
- Stable and ordered layout.
- Work-leisure balance.
- Personal archive.
- Academic but not sterile.
- Light interaction polish.
- Clean line icons.

Avoid:

- Overly bright or saturated colors.
- Generic SaaS dashboard visuals.
- Strong marketing landing page composition.
- Excessive gradients.
- Excessive roundedness.
- Heavy decorative illustrations.
- Strong travel scrapbook aesthetics.
- Fictional archive vocabulary as dominant navigation, such as Dossier, Corpus, Dispatches, Chronicle, or Index.

## Color Direction

The overall palette can keep a blue-based identity, similar in spirit to the current website.

Use color as an accent system, not as a full-surface wash. Brighter colors are acceptable only when softened or used in small areas.

Suggested color behavior:

- Main identity color: blue.
- Supporting accents: muted green, muted red/coral, soft amber, slate, and neutral ink.
- Gallery badges may use different accent colors per location.
- Badge accent colors should harmonize with photo tones when possible.
- Always preserve text contrast and readability over images.

Please keep the design color system editable. The final implementation should be able to swap palette presets later.

For dark mode, keep the sharper cyan-on-black direction from the existing Stitch draft rather than a softer ink-paper dark theme.

## Typography

The site should use serif typography for prominent text and long-form writing, especially:

- Major headings.
- Page titles.
- Blog article body.
- Introductory homepage text.

Preferred English serif family:

```text
Palatino Linotype, Book Antiqua, Palatino
```

Preferred Japanese serif direction:

```text
Noto Serif JP
```

Chinese serif direction:

- Use a readable Chinese serif with a subtle movable-type or printed-book feeling.
- Suggested first choice: Noto Serif SC or Source Han Serif SC.
- Acceptable fallback: SimSun or Songti SC.
- Avoid overly decorative Chinese display fonts.

Sans-serif typography can be used for interface elements, such as:

- Gallery metadata overlays.
- Filter controls.
- Small labels.
- Navigation utility text.
- Project status tags.

The contrast between formal serif content and clean sans-serif UI should be intentional.

## Icons

Use a simple line-icon style throughout the site.

Icon requirements:

- Clean monoline appearance.
- No filled mascot-like icons.
- No overly leisure/travel-cartoon style.
- Icons should feel precise enough for academic/project content, but light enough for Gallery and Blog.

## Theme Support

Design must support:

- Light mode.
- Dark mode.
- Follow system mode.

The visual direction should work in both light and dark themes. Avoid choices that only look good in one mode.

Global header identity:

```text
Tuorui "v1ncent19" Peng
```

`v1ncent19` should remain blue in all themes. The surrounding real-name text may adapt to light or dark mode.

Use the existing site tagline:

```text
En voyage dans l'espace de Hilbert.
```

Desktop should show the tagline in the global header across the site. Mobile should keep the top header name-only and place the tagline inside the drawer/sidebar.

## Gallery Page

Gallery is a selected travel photography collection.

Layout:

- Masonry or masonry-like image grid.
- Each photo is its own card.
- Photos may share a badge preset if they are from the same place.

Photo interaction:

- Desktop hover should reveal a bottom metadata treatment similar to the preferred Stitch Gallery draft.
- The overlay should make location and time information easy to read.
- The overlay should not feel heavy or cover the photo with an opaque block.
- The hover transition should be smooth and less abrupt than the first Stitch output.
- Clicking a photo opens a larger image view.
- In the larger image view, metadata should appear below the image, not overlapping it.
- Do not include an EXIF catalog/download entry in the first version.
- Mobile should use tap behavior instead of hover-only behavior.

Metadata shown on hover/tap:

- Place.
- Region or country.
- Date/month.
- Optional travel-stamp-like badge.

Badge direction:

- Badge can look like a compact travel stamp or place card.
- Badge text should feel structured and typographic.
- Badge accents can vary by location.
- Badge artwork should remain line-based and simple.

Important implementation implication:

- Do not render location names as image text inside AI-generated badges.
- The final website should render badge text with real fonts.
- AI-generated badge artwork should ideally be limited to simple location icons.

## Blog Index

The Blog index should support mixed-language posts.

Required UI:

- Search box near the top.
- Clickable tag filter interface.
- Compact sorting controls with options similar to newest, oldest, alphabetical A-Z, and alphabetical Z-A.
- Post list with title, date/year, tags, and short summary.
- Clear selected tag state.
- Good reading-oriented spacing.

Tone:

- More textual and calm than Gallery.
- More flexible than CV.
- Should support academic notes, cooking posts, linguistics posts, documentation, knowledge notes, and future categories.

## CV Page

The CV page combines the current CV and Experience roles.

Required UI:

- PDF CV download action near the top.
- Web CV sections.
- Research experience cards.
- Structured professional timeline or grouped sections.

The CV page should feel formal and easy to scan. It should not look like a gallery or project showcase.

Current PDF state:

- English CV exists.
- Chinese CV may be added later, so leave room for a second download option.

## Project Page

The Project page contains non-research projects and important long-running notes.

Examples:

- Stat summary note.
- Engineering collaboration projects.
- Small tools.
- Completed projects.
- Active or ongoing projects.

Required UI:

- Project cards.
- Status labels such as active, completed, paused, or archived.
- Updated date for ongoing projects.
- Project type and tags.

Project should not use a research-paper-list visual style unless a specific item requires it.

## About Page

The About page contains personal information and fun facts.

This is the main place where detailed personal information appears. The global header may use `Tuorui "v1ncent19" Peng`, but body content outside About and CV should generally keep the `v1ncent19` identity lightweight and not overemphasize personal details.

Required UI:

- Bilingual-friendly layout.
- Personal but still ordered.
- Room for profile photo or avatar.
- Contact/profile link area.

## Interaction Style

Use calm, polished motion:

- Subtle hover lift.
- Soft shadow changes.
- Border color transitions.
- Light opacity transitions.
- Smooth overlay reveal.

Avoid:

- Bouncy motion.
- Large rotations.
- Complex 3D flips.
- Distracting animations.
- Hover behavior that hides essential information from mobile users.

Respect reduced-motion preferences in the final design.

## Responsive Requirements

Desktop:

- Top global navigation.
- Comfortable page width for text-heavy sections.
- Gallery grid uses available width.

Mobile:

- Compact top navigation plus drawer.
- No bottom navigation.
- Homepage cards stack cleanly.
- Blog search and tag filters remain usable.
- Gallery metadata is accessible by tap.
- No text overlap.

## Suggested First Stitch Prompt

Use this prompt with this file as context:

```text
Design a coherent multi-page personal website for v1ncent19 using the attached visual brief.

Create desktop and mobile screens for Home, About, CV, Gallery, Blog Index, and Project.

The visual style should mix formal serif typography with restrained lively colors. Keep a blue-based identity, but allow muted accent colors. The site should feel stable, ordered, work-leisure, and personal, not like a startup landing page or a travel diary.

Use serif typography for headings and long-form content, inspired by Palatino Linotype / Book Antiqua / Palatino for English, Noto Serif JP for Japanese, and a Chinese serif such as Noto Serif SC or Source Han Serif SC. Use clean sans-serif typography for small UI controls and metadata.

The homepage should have a concise personal profile summary, a CV download action, and navigation cards in this order: About, CV, Gallery, Blog, Project. Cards should be regular and stable, with subtle hover-lift style interaction. Do not add a homepage search box or homepage comments.

The Gallery page should use a masonry photo grid. Each photo card should reveal a smooth bottom metadata treatment on hover showing place, region, date, and a compact line-art travel badge. The badge should feel like a structured travel stamp, but text should be rendered as real typography rather than image text. Clicking a photo opens a larger image view with metadata below the image, not overlaid on it. Do not add an EXIF catalog entry.

The Blog index should include a search box, clickable tag filter interface, and compact sorting controls at the top, then a readable post list with dates, tags, and one or two preview lines per post.

The CV page should combine professional CV and experience content, with PDF download and research experience cards.

The Project page should show mixed active and completed projects using project cards, status labels, dates, tags, and links.

Design light and dark mode variants. Keep the sharper cyan-on-black dark mode direction from the previous Stitch draft. Keep the system adaptable so colors can be changed later through palette tokens.
```

## Suggested Inputs To Upload

Useful inputs for Stitch:

- This `STITCH_BRIEF.md`.
- A screenshot of the current homepage.
- The travel badge reference image.
- Optional screenshots of current About, CV, Blog, and Project pages.

Do not upload the entire repository or all planning documents for the first design pass. The goal is to explore visual language, not implementation details.

## Desired Output From Stitch

Ask Stitch to provide:

- Desktop and mobile screens.
- Light and dark visual directions.
- Home, Gallery, and Blog Index at higher fidelity.
- About, CV, and Project as coherent extensions of the same system.
- Exportable screenshots or Figma output.
- Any generated code only as reference, not final production code.

After the first round, the preferred design decisions should be summarized back into a stricter `DESIGN.md` or design system document for implementation.
