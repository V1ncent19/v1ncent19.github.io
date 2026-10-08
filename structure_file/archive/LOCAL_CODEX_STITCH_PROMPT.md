# Local Codex Prompt: How To Use Stitch References

Use this prompt when a local coding agent is not correctly understanding the intended visual direction and needs to re-check the Google Stitch samples.

```text
You are working on the Next.js rebuild of my personal site. Before making UI changes, re-read the planning files and the Google Stitch visual references carefully.

Read these files first, in this order:

1. new/DECISIONS.md
2. new/STITCH_REVIEW.md
3. new/UI_IMPLEMENTATION_GUIDE.md
4. new/DESIGN_SYSTEM.md
5. new/IMPLEMENTATION_SPEC.md

Then inspect the Stitch references under:

- new/stitch_design_system_creator/**/screen.png
- new/stitch_design_system_creator/academic_archive_design_system/DESIGN.md

Important: the Stitch outputs are visual references only. Do not copy generated facts, fake article titles, invented dates, institutional labels, archive IDs, placeholder counts, or large blocks of exported HTML/CSS. Use screenshots to understand visual rhythm, spacing, hierarchy, card behavior, color mood, and interaction direction.

What to preserve from Stitch:

- The formal serif-led visual direction.
- The blue/cyan identity color.
- The sharper cyan-on-black dark mode mood.
- The top navigation structure on desktop.
- The clean top bar + drawer approach on mobile.
- The stable rectangular card system with subtle hover lift.
- The Blog index pattern: search box, tag chips, compact four-option sorting, post cards with title plus one or two preview lines.
- The mobile Blog card direction, including optional thumbnail support for posts where an image is useful.
- The Gallery masonry layout and photo-first composition.
- The Gallery hover/tap bottom metadata treatment, with smoother transitions than Stitch generated.
- The Gallery lightbox concept, but metadata must appear below the large image, not overlaid on it.
- The CV desktop two-column direction: profile/identity column plus structured CV content column.

What to correct or avoid:

- Do not add homepage search.
- Do not add homepage comments.
- Do not add bottom mobile navigation.
- Do not add an EXIF catalog/download entry.
- Do not overuse fictional archive vocabulary such as Dossier, Corpus, Dispatches, Chronicle, or Index.
- Do not replace the preferred Palatino-style serif stack with Eb Garamond unless explicitly approved.
- Do not turn the site into a SaaS dashboard, startup landing page, travel diary, or fictional institutional archive.
- Do not use Stitch's generated fake content as real content.

Confirmed identity/header rules:

- Header text is: Tuorui "v1ncent19" Peng
- The "v1ncent19" part must remain blue in both light and dark modes.
- Desktop header should show the existing tagline: En voyage dans l'espace de Hilbert.
- Mobile top header should show the name only; the tagline belongs inside the drawer/sidebar.

Implementation style:

- Use Tailwind CSS + CSS variables + a small set of semantic React components/classes.
- Keep colors, typography, radii, shadows, and palette presets tokenized.
- Use Lucide-style simple line icons for interface controls.
- Keep the site compatible with Next.js static export and Cloudflare Pages.

Before editing code, produce a short "Stitch visual alignment plan" with:

1. The exact Stitch screenshots you are using as references.
2. Which visual patterns you will preserve.
3. Which Stitch-generated elements you will reject.
4. Page-by-page UI changes for Home, Blog, Gallery, CV, About, and Project.
5. Any remaining questions that block implementation.

Only after that plan is accepted should you implement UI changes.
```

## Optional Short Version

```text
Re-check the Stitch screenshots under new/stitch_design_system_creator/ and align the UI to their visual rhythm, but treat them only as references. Preserve serif-led typography, blue/cyan identity, sharp cyan-on-black dark mode, regular cards, Blog search/tag/sort pattern, Gallery masonry with bottom metadata, and CV two-column structure. Reject fake Stitch content, homepage search/comments, bottom mobile nav, EXIF catalog, overdone archive vocabulary, and copied Stitch code. Follow new/DECISIONS.md and new/UI_IMPLEMENTATION_GUIDE.md as the source of truth.
```
