# Design System Draft

## Design Intent

The site should feel like a personal archive with both academic and life-writing dimensions. It should stay concise and content-first, but the implementation should feel more polished and responsive than the current Jekyll site.

The visual language should not be a generic startup landing page. It should support reading, browsing, and returning to long-lived content.

## Overall Tone

Desired qualities:

- Quiet.
- Clear.
- Personal.
- Lightweight.
- Polished in interaction details.
- Comfortable for both academic material and travel/blog content.

Avoid:

- Overly commercial portfolio style.
- Heavy marketing hero sections.
- Excessive decoration.
- A layout that only works for one content type.

## Layout System

Recommended global layout:

- Top navigation for desktop.
- Compact top bar plus drawer for mobile.
- No bottom navigation in the first version.
- Page-specific internal controls where needed.
- No permanent global sidebar as the main organizing structure.

Reasoning:

- Blog, Gallery, CV, and Project each need different page structures.
- A top navigation model gives the homepage and gallery more room.
- Mobile behavior is easier to make consistent.

## Homepage

The homepage should keep the spirit of the current homepage:

- Short profile summary.
- Minimal personal履历-style introduction.
- CV download action.
- Navigation cards to main sections.
- No full search box.
- No comment or discussion module.

The card navigation should be animated more smoothly than the current version.

Possible card interactions:

- Subtle lift on hover.
- Border/accent transition.
- Soft background tint.
- Icon or preview element appearing gradually.
- Keyboard focus state.
- Touch-friendly pressed state.

Avoid relying on hover-only information for essential navigation.

## Section Cards

Homepage card order:

1. About
2. CV
3. Gallery
4. Blog
5. Project

Cards should be large enough to feel intentional, but not so large that the homepage becomes a marketing layout.

Potential card data:

- Section label.
- Short localized summary.
- Icon or image hint.
- Last updated or count where useful.

## Theme

Support:

- Light.
- Dark.
- Follow system.

Implementation notes:

- Use a theme state that can persist user preference.
- Respect `prefers-color-scheme` when follow-system is active.
- Make images and gallery overlays readable in both themes.
- Avoid theme-specific layout shifts.
- Dark mode should follow the sharper cyan-on-black Stitch direction rather than a softer ink-paper palette.
- Keep the blue identity color stable across themes.

## Header Identity

The global header should display:

```text
Tuorui "v1ncent19" Peng
```

`v1ncent19` should remain blue in light and dark mode. The surrounding real-name text can change with the active theme.

Keep the existing site tagline:

```text
En voyage dans l'espace de Hilbert.
```

Desktop should show the tagline in the global header across the site. Mobile should keep the top header name-only and place the tagline inside the drawer/sidebar.

## Typography

The site needs to handle English, Chinese, and Japanese text.

Language rules:

- English is the default page language.
- Chinese pages should set appropriate `lang="zh"` context.
- Japanese fragments inside posts should use local `lang="ja"` spans or MDX components.

Recommended CSS direction:

```css
:root {
  --font-latin: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-serif-latin: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  --font-serif-zh: "Noto Serif SC", "Source Han Serif SC", SimSun, "Songti SC", serif;
  --font-ja: "Noto Sans JP", "Yu Gothic", "Hiragino Sans", sans-serif;
  --font-ui: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  font-family: var(--font-serif-latin), var(--font-serif-zh);
}

:lang(zh) {
  font-family: var(--font-serif-latin), var(--font-serif-zh);
}

:lang(ja) {
  font-family: var(--font-serif-latin), "Noto Serif JP", "Yu Mincho", serif;
}
```

The final font stack should be tested on Windows, macOS, and mobile browsers. Avoid external font dependencies that are unreliable for users in different regions unless the fonts are self-hosted.

## Gallery

Gallery should be the most visually expressive section.

Layout:

- Masonry or masonry-like responsive grid.
- Each photo is one card.
- Cards use thumbnails for initial load.
- Click opens a higher-resolution image.
- Preserve aspect ratio to avoid layout jumping.

Desktop interaction:

- Hover reveals a bottom metadata treatment similar to the preferred Stitch Gallery direction.
- Metadata contains location, time, and badge.
- The hover transition should be smoother than the current Stitch output.

Mobile interaction:

- Tap opens lightbox or reveals metadata.
- No required hover-only behavior.
- No bottom navigation dependency.

Image levels:

```text
thumb: masonry grid
large: lightbox detail
original: local-only source, optional and not necessarily deployed
```

## Gallery Badge System

Badge inspiration:

- Travel stamp.
- Airbnb-like compact travel identity card.
- Simple linework.
- Place-specific accent color.

Important rule:

AI should not generate the entire badge including text. Text should be rendered by code to avoid wrong characters and inconsistent typography.

Badge structure:

- Code-rendered rounded rectangle or stamp shape.
- Code-rendered place text and date.
- Shared badge preset by location.
- Optional AI-generated or hand-made SVG icon.

Suggested badge fields:

```json
{
  "id": "taipei-2026",
  "accent": "blue",
  "icon": "/assets/gallery/badges/taipei.svg",
  "rotation": -1.5
}
```

Badge visual rules to define later:

- Stroke width.
- Corner radius.
- Color palette.
- Icon complexity.
- Text placement.
- Local-language handling.
- Maximum rotation.

## Blog

Blog should prioritize scanning and reading.

Index requirements:

- Search input near the top.
- Clickable tag filter area.
- Clear selected filter state.
- Sorting controls, using a compact four-option control similar to the Stitch concept.
- Year/time visibility.
- Interface language switch.
- Post cards can show a title and one or two preview lines.

Post requirements:

- Comfortable reading width.
- Good code block styling.
- Support images and tables.
- giscus comments near the end.
- Clear tags and date.

Comments should appear on blog post pages by default, not on the homepage.

## CV

CV should be structured, calm, and easy to scan.

Expected design:

- PDF download near the top.
- Web CV sections.
- Research experience cards.
- Clear date and institution formatting.
- Optional anchors for sections.

The page should not look like a project gallery. It should feel like a structured professional document with web affordances.

## Project

Project should work for mixed project types:

- Long-running notes.
- Completed projects.
- Collaboration projects.
- Tools.
- Archives.

Suggested UI:

- Featured project area if useful.
- Project cards with status and updated date.
- Status labels for active/completed/paused/archived.
- Links to project pages or external sites.

Project should not mimic a publication list unless the individual item genuinely needs that style.

## Accessibility And Responsive Rules

- All interactive cards must be keyboard reachable.
- Hover states need focus equivalents.
- Text should not overlap at mobile widths.
- Tap targets should be large enough for mobile.
- Theme switch and language switch should have clear labels.
- Images need meaningful alt text where possible.
- Motion should be subtle and should respect reduced-motion preferences.

## Visual Exploration Workflow

Google Stitch or another UI design tool can be used to explore:

- Homepage card style.
- Gallery masonry and hover layer.
- CV section layout.
- Blog filter/search interface.
- Theme direction.

Best handoff format to coding agents:

- Screenshots of desktop and mobile states.
- Figma link if available.
- Exported colors, fonts, spacing, and component notes.
- Short written explanation of what should be preserved and what can be adapted.

Do not treat exported design-tool code as final production code by default.
