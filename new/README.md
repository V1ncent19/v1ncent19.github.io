# Personal Site Rebuild Drafts

This folder contains planning drafts for the Next.js rebuild of the Jekyll-based personal homepage. The rebuild is **in progress** on branch `nextjs-rebuild`; the planning files below are discussion documents, not final implementation instructions.

## Read this first

- `IMPLEMENTATION_STATUS.md`: authoritative current-state report (2026-09-04) — what is built route-by-route, the **user-locked v1 design baseline**, the resume checkpoint, and what a fresh agent should do next. Start here.

## Draft Files

- `SITE_ARCHITECTURE.md`: overall product direction, site goals, confirmed decisions, and open questions.
- `ROUTES_AND_INFORMATION_ARCHITECTURE.md`: route structure, navigation model, language URL rules, and legacy redirect plan.
- `CONTENT_MODEL.md`: proposed data and content structure for profile, blog, gallery, CV, and project content.
- `DESIGN_SYSTEM.md`: visual language, layout rules, dark mode, typography, gallery badge system, and interaction notes.
- `DEPLOYMENT_AND_WORKFLOW.md`: local development, Cloudflare Pages deployment, domain setup, old GitHub Pages redirects, and AI-assisted workflow.
- `STITCH_BRIEF.md`: focused visual and interaction brief for Google Stitch or similar UI design tools.
- `STITCH_REVIEW.md`: review of the first Stitch-generated visual concepts and design questions to resolve.
- `DECISIONS.md`: confirmed decisions that future agents should treat as the current source of truth. (Implementation-era confirmations appended 2026-09-04 may supersede earlier lines — see the dated section near the top.)
- `IMPLEMENTATION_SPEC.md`: actionable Next.js implementation specification.
- `IMPLEMENTATION_STATUS.md`: dated current-state report, locked v1 design baseline, and resume checkpoint for future agents.
- `UI_IMPLEMENTATION_GUIDE.md`: engineering-oriented UI rules distilled from Stitch and later discussion.
- `AGENT_WORKFLOW.md`: phased workflow and guardrails for future vibe-coding agents.
- `CONTENT_MIGRATION_AUDIT.md`: first-pass audit of current Jekyll pages, posts, and assets for migration.
- `LOCAL_CODEX_STITCH_PROMPT.md`: prompt for local coding agents on how to re-read and use Stitch visual references.

## Current Status (2026-09-04)

The static-first Next.js rebuild is implemented and running on branch `nextjs-rebuild` (Next 16 App Router, TS strict, Tailwind v4, `output: "export"`). Home (en), About, CV, Gallery shell, Blog index, and Project pages are live with real legacy content, English + nested `/zh`. The visual framework is user-locked as the v1 baseline; future phases add content/features on top (per-post blog pages, mobile drawer nav, gallery photos, live PV/giscus counters, Cloudflare deployment). The whole Next tree is still uncommitted on the branch — commit it before starting the next phase.

For the route-by-route state, the locked design spec, and the resume checklist see `IMPLEMENTATION_STATUS.md`.

The public identity outside the About page should primarily use `v1ncent19`. Detailed personal information should live mainly in the About and CV areas.
