# Personal Site Rebuild Drafts

This folder contains planning drafts for the future Next.js rebuild of the current Jekyll-based personal homepage.

These files are discussion documents, not final implementation instructions. They should be updated as design decisions become clearer.

## Draft Files

- `SITE_ARCHITECTURE.md`: overall product direction, site goals, confirmed decisions, and open questions.
- `ROUTES_AND_INFORMATION_ARCHITECTURE.md`: route structure, navigation model, language URL rules, and legacy redirect plan.
- `CONTENT_MODEL.md`: proposed data and content structure for profile, blog, gallery, CV, and project content.
- `DESIGN_SYSTEM.md`: visual language, layout rules, dark mode, typography, gallery badge system, and interaction notes.
- `DEPLOYMENT_AND_WORKFLOW.md`: local development, Cloudflare Pages deployment, domain setup, old GitHub Pages redirects, and AI-assisted workflow.
- `STITCH_BRIEF.md`: focused visual and interaction brief for Google Stitch or similar UI design tools.
- `STITCH_REVIEW.md`: review of the first Stitch-generated visual concepts and design questions to resolve.
- `DECISIONS.md`: confirmed decisions that future agents should treat as the current source of truth.
- `IMPLEMENTATION_SPEC.md`: actionable Next.js implementation specification.
- `UI_IMPLEMENTATION_GUIDE.md`: engineering-oriented UI rules distilled from Stitch and later discussion.
- `AGENT_WORKFLOW.md`: phased workflow and guardrails for future vibe-coding agents.
- `CONTENT_MIGRATION_AUDIT.md`: first-pass audit of current Jekyll pages, posts, and assets for migration.

## Current Direction

The planned site is a static-first Next.js site deployed through Cloudflare Pages with a custom domain. The site should preserve and reorganize existing content while improving maintainability, responsive behavior, search, theme support, and visual consistency.

The public identity outside the About page should primarily use `v1ncent19`. Detailed personal information should live mainly in the About and CV areas.
