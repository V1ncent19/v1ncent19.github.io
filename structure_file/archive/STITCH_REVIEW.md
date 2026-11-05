# Stitch Output Review

This review summarizes the Stitch-generated page concepts currently stored under `new/stitch_design_system_creator/`.

The generated screenshots and code are treated as visual references only. Generated names, dates, labels, institutional claims, article titles, analytics numbers, and UI microcopy are placeholders and should not be treated as authoritative site content.

## Reviewed Artifacts

Major screenshots reviewed:

- Home desktop light, dark, search, and animated states.
- Home mobile state.
- Blog index desktop light, dark, search/filter active, and mobile states.
- Blog mobile drawer state.
- Gallery desktop masonry, dark mode, and lightbox modal state.
- CV/Experience unified page with publications.
- Stitch-generated design system file.

Stitch did not appear to generate fully separate About and Project pages in the current set. It generated CV as a coherent extension, but About and Project still need explicit visual treatment later.

## Overall Impression

The strongest useful direction is an editorial academic archive style: serif-led typography, quiet blue identity color, crisp cards, light borders, restrained motion, and clear content hierarchy.

This direction is close to the requested mix of formal typography and more lively color accents. However, the current Stitch version leans too strongly into an "academic archive/catalog" persona. The final site should remain a personal homepage for `v1ncent19`, not become a fictional institutional archive.

## Elements Worth Preserving

- Top navigation plus homepage section cards.
- Concise home profile area with photo/avatar slot and CV download action.
- Regular geometric cards with subtle hover behavior.
- Blog index with search, tag chips, sorting/filter controls, and readable post cards.
- Gallery masonry layout with full-card image treatment.
- Gallery dark mode mood and photo-forward layout.
- CV page split between identity/profile summary and structured CV content.
- Use of serif typography for headings and reading content.
- Use of sans-serif UI labels for tags, filters, buttons, and metadata.
- Light/dark mode as first-class design variants.

## Elements That Need Calibration

### Identity

The final global header should display `Tuorui "v1ncent19" Peng` across the site. The `v1ncent19` portion should remain blue in all themes, while the surrounding name text may adapt to light or dark mode.

### Typography

Stitch proposed `Eb Garamond`, but the current site uses a Palatino-like serif stack:

```text
Palatino Linotype, Book Antiqua, Palatino
```

The final design should likely use the Palatino stack first, with carefully chosen Chinese and Japanese serif fallbacks. Chinese headings still need a final decision.

### Color

The blue/cyan direction works. The user prefers the sharper cyan-on-dark direction from Stitch over a softer ink-paper dark mode. The final system should still keep accent colors editable through theme tokens.

### Page Persona

Terms such as "Archive", "Dispatches", "Dossier", "Corpus", and "Index" give a strong fictional catalog tone. Some of this may be stylish, but too much will make the site feel less direct and personal.

The final visible labels should stay simple. Use direct section names such as `About`, `CV`, `Gallery`, `Blog`, and `Project`. `Notes` can exist as an internal content type or label where appropriate, but it is not currently confirmed as a separate top-level route.

### Blog

The Blog layout is strong, but it may be too dense and too taxonomy-heavy. The final version should prioritize tags and search, not a complex classification system.

### Home

The generated homepage includes search and a comment/discussion module. These should not be used on the final homepage. Search belongs primarily in Blog, and comments should appear on blog post pages rather than the homepage.

### Gallery

The masonry concept works, but the reviewed lightbox screenshot appears to show a dimmed/blurred background without a clearly visible foreground image modal. The final interaction should include an obvious large image, metadata below the image, close control, and previous/next controls.

The hover metadata currently often appears as a bottom bar. The user now prefers this Stitch-like bottom metadata treatment over a full-card frosted overlay. The final implementation should make the hover/tap transition smoother than Stitch's generated version.

Do not add an EXIF catalog/download entry in the first version.

### Mobile Navigation

Stitch uses both a drawer and a bottom navigation in mobile examples. The final site should use a compact top bar plus drawer only, with no bottom navigation.

### CV

The CV page direction is useful, especially the profile column plus structured content column. The final version should avoid overcomplicating with fictional document IDs and institutional metadata unless the user intentionally wants that archive aesthetic.

## Design Questions To Confirm

1. For Gallery lightbox, should metadata below the image be compact and centered, or should it use a wider caption block under the image?
2. Should Blog post cards include thumbnail images for some posts, or stay text-first by default?
3. Should the tagline receive any typographic treatment beyond the current small italic style?

## Resolved Decisions

- The global header should display `Tuorui "v1ncent19" Peng`.
- `v1ncent19` should stay blue in all themes.
- The surrounding real-name text may change color with light/dark mode.
- Keep the existing tagline `En voyage dans l'espace de Hilbert.`.
- Desktop should show the tagline in the global header.
- Mobile should keep the top header name-only and move the tagline into the drawer/sidebar.
- Final top-level labels should stay simple: `About / CV / Gallery / Blog / Project`.
- `Notes` can exist as a content type or secondary label but is not confirmed as a top-level route.
- Homepage search should not be included in the first version.
- Homepage comments/discussion should not be included.
- Comments should be limited to blog post pages by default.
- Mobile should use top bar plus drawer only, with no bottom navigation.
- Blog should keep sorting controls in addition to search and tag filtering.
- The current Stitch sorting control concept is directionally good.
- Blog cards can use the current Stitch density: one title plus one or two preview lines.
- Gallery hover can use Stitch's current bottom metadata treatment rather than a full-card frosted overlay.
- Gallery hover transitions need to be smoother in the final implementation.
- Gallery lightbox metadata should appear below the large image, not overlapping the image.
- Gallery should not include an EXIF information or catalog entry in the first version.
- Dark mode should keep the sharper cyan-on-black direction from Stitch rather than the softer ink-paper variant.
- CV can keep the desktop two-column layout, with details still to refine.

## Suggested Next Step

After these questions are answered, update `DESIGN_SYSTEM.md` into a stricter implementation design document. That document should preserve the good visual directions from Stitch while replacing placeholder content, reducing over-stylized archive language, and locking down typography, color tokens, navigation behavior, and component rules.
