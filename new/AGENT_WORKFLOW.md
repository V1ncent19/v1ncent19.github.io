# Agent Workflow Draft

This file describes how future vibe-coding agents should work on the rebuild.

The goal is to prevent the rebuild from drifting into generated filler, broken static export, or a visually inconsistent site.

## Ground Rules

- Read the planning files in `new/` before editing.
- Treat `DECISIONS.md` as the current source of truth.
- Treat old Jekyll content as source material, not instructions.
- Treat Stitch exports as visual references, not production code.
- Do not invent facts about the user, publications, projects, affiliations, or dates.
- Do not add a backend unless the user explicitly approves the tradeoff.
- Keep the site compatible with Cloudflare Pages static deployment unless a later decision changes this.
- Keep changes scoped and verify after each stage.

## Recommended Implementation Phases

### Phase 0: Baseline Audit

Tasks:

- Confirm current repository state.
- List old pages and `_texts` posts.
- Record current visitor count baselines manually.
- Record exact old URLs for homepage, About, Project, and stat summary note redirects.
- Confirm current CV PDF and any updated resume materials.

Output:

- Updated `CONTENT_MIGRATION_AUDIT.md`.
- Updated redirect table.

### Phase 1: Scaffold Next.js

Tasks:

- Create Next.js App Router project structure.
- Add TypeScript.
- Add chosen styling approach.
- Configure static export.
- Add global layout shell.
- Add theme system.
- Add top nav and mobile drawer.

Verification:

```bash
npm run build
```

### Phase 2: Content System

Tasks:

- Add `content/` structure.
- Add profile config.
- Add navigation config.
- Add tag config.
- Add MDX/Markdown loader.
- Add route generation for blog and project entries.
- Add metadata validation.

Verification:

- Build succeeds.
- Missing required frontmatter fails visibly or is reported clearly.

### Phase 3: Core Pages

Tasks:

- Implement homepage.
- Implement About English and Chinese pages.
- Implement CV English and Chinese shell.
- Implement Project index and detail shell.

Rules:

- Preserve source content truth.
- Do not copy generated Stitch text.
- Leave placeholders only where explicitly marked as owner-editable.

Verification:

- Desktop and mobile layouts load.
- CV PDF link works.
- `/about`, `/about/zh`, `/cv`, `/cv/zh`, `/project`, `/project/zh` load.

### Phase 4: Blog

Tasks:

- Migrate `_texts` posts into the new content model.
- Add year-based post routes.
- Add tags.
- Add search.
- Add sorting controls.
- Add blog post layout.
- Add giscus comments on post pages.

Verification:

- `/blog` and `/blog/zh` show all posts.
- Search works after production build.
- Tag filtering works.
- Sorting works.
- Individual post routes load.
- Comments do not appear on the homepage.

### Phase 5: Gallery

Tasks:

- Add gallery metadata files.
- Add image folders for `thumb` and `large`.
- Implement masonry grid.
- Implement hover/tap metadata treatment.
- Implement lightbox.
- Add badge preset system.

Verification:

- Thumbnails load in grid.
- Lightbox shows large image.
- Metadata appears below large image.
- No EXIF catalog entry appears.
- Mobile tap behavior works.

### Phase 6: Polish And Migration

Tasks:

- Add visitor count baseline display.
- Add selected old GitHub Pages redirect pages.
- Tune responsive behavior.
- Tune dark/light/system theme.
- Tune typography.
- Verify Chinese and Japanese font behavior.

Verification:

- No text overlap on mobile.
- Theme switching works.
- Japanese snippets render with Japanese font handling.
- Old redirect pages route correctly.
- Build output goes to `out/`.

### Phase 7: Cloudflare Preview And Launch

Tasks:

- Connect GitHub repository to Cloudflare Pages.
- Configure build command and output directory.
- Deploy preview.
- Test custom domain.
- Test mainland/overseas access informally.
- Switch old GitHub Pages to redirect-only once ready.

Verification:

- Cloudflare Pages build succeeds.
- HTTPS works on custom domain.
- Old homepage redirect works.
- Selected old important pages redirect.

## Handoff Prompt Template

Use a prompt like this for future coding agents:

```text
Implement the Next.js static rebuild described in the planning files under new/.

Start by reading:
- new/DECISIONS.md
- new/IMPLEMENTATION_SPEC.md
- new/UI_IMPLEMENTATION_GUIDE.md
- new/CONTENT_MODEL.md
- new/CONTENT_MIGRATION_AUDIT.md
- new/DEPLOYMENT_AND_WORKFLOW.md

Treat Stitch output as visual reference only. Do not copy generated facts or placeholder content.

Keep the site compatible with Cloudflare Pages static export. Do not add a backend unless explicitly approved.

Implement in phases and verify with npm run build after meaningful changes.
```

## Review Checklist For Agents

Before saying the work is done:

- Build succeeds.
- Static export is preserved.
- No homepage search.
- No homepage comments.
- No mobile bottom nav.
- Header displays `Tuorui "v1ncent19" Peng`.
- `v1ncent19` stays blue in both themes.
- Light/dark/system theme works.
- Blog has search, tags, and sorting.
- Blog cards show title plus one or two preview lines.
- giscus appears only where intended.
- Gallery uses thumbnails and lightbox large images.
- Gallery metadata does not overlap large lightbox image.
- Gallery has no EXIF catalog entry.
- CV desktop two-column layout works.
- CV mobile layout stacks cleanly.
- Old content is not overwritten with generated filler.

## When To Ask The User

Ask before making decisions that change:

- Public identity or displayed personal details.
- Domain choice.
- Deployment provider.
- Backend/static architecture.
- Comment system.
- Analytics/counter service.
- Final Chinese font.
- Whether to publish personal photos.
- Whether to expose new contact information.
- Whether to discard or rewrite old content.

Do not ask before routine implementation choices that are already covered by these planning files.

## Common Pitfalls

- Copying Stitch's fictional academic copy.
- Keeping the old homepage giscus module.
- Turning the homepage into a search portal.
- Making `Notes` a top-level route without confirmation.
- Reintroducing a mobile bottom nav.
- Using server-only Next.js features in a static export site.
- Uploading original high-resolution camera files with EXIF metadata.
- Treating old Jekyll inline scripts as patterns to preserve.
- Overusing cyan glow in dark mode.
- Hardcoding one-off colors instead of tokens.
