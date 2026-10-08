# Deployment and Workflow Draft

## Target Route

The recommended first deployment route is:

```text
Next.js static-first site
-> GitHub repository
-> Cloudflare Pages build
-> custom domain
```

The current GitHub Pages address should remain available as a redirect entrypoint for selected old URLs.

## Repository Strategy

Preferred approach:

- Use the existing GitHub repository if feasible.
- Create a new branch for the rebuild, for example `next-rebuild`.
- Keep the old Jekyll site stable while the Next.js version is developed.
- Switch production only after the new site is ready.

Potential risk:

- The repository structure will change significantly from Jekyll to Next.js.
- Old content migration should be explicit and tracked.

## Local Development

Next.js supports local development.

Typical commands:

```bash
npm install
npm run dev
```

Local preview:

```text
http://localhost:3000
```

Production-style check:

```bash
npm run build
```

For static export, the output directory is expected to be:

```text
out/
```

## Static Export

Next.js should be configured for static output if the chosen features remain static-compatible.

Expected configuration direction:

```js
const nextConfig = {
  output: "export"
};

module.exports = nextConfig;
```

Static export works well for:

- Markdown/MDX pages.
- Blog posts.
- Gallery pages.
- Static project pages.
- CV pages.
- Client-side third-party comment widgets.
- Static search indexes.

Static export does not support server-required features such as:

- Server API routes.
- Runtime server rendering.
- Server-side redirects.
- Server-side image optimization.
- Dynamic database-backed admin interfaces.

## Cloudflare Pages

High-level setup:

1. Create or log into a Cloudflare account.
2. Add the custom domain to Cloudflare.
3. Change the domain registrar's nameservers to the nameservers Cloudflare provides.
4. Connect Cloudflare Pages to the GitHub repository.
5. Set the build command to `npm run build`.
6. Set the output directory to `out`.
7. Add the custom domain to the Cloudflare Pages project.
8. Configure HTTPS through Cloudflare.
9. Configure `www` and apex-domain behavior.

Example domain choice:

```text
v1ncent19.space
```

Actual final domain is still pending.

## Domain Purchase Flow

General flow:

1. Choose a registrar.
2. Search for the domain.
3. Compare first-year price and renewal price.
4. Purchase the domain.
5. Complete required contact or real-name information.
6. Point DNS management to Cloudflare by changing nameservers.
7. Add DNS records through Cloudflare.

Important concepts:

- A domain is usually rented annually, not permanently owned.
- DNS decides where the domain points.
- Hosting decides where the website files are served from.
- HTTPS certificates are usually handled by the hosting platform or Cloudflare.

## Mainland China Access

Initial route:

- Use Cloudflare Pages first.
- Test actual access from mainland China after deployment.
- Avoid adding VPS or备案 complexity before the site needs it.

Known concern:

- Standard Cloudflare Pages is not the same as a mainland China CDN.
- Mainland performance may vary.
- A future China-optimized route may require ICP filing, domestic hosting/CDN, or a mirror strategy.

## Old GitHub Pages Redirects

Old site:

```text
https://v1ncent19.github.io/
```

Future site:

```text
https://<custom-domain>/
```

Required redirect coverage:

- Homepage.
- About page.
- Project page.
- Possibly stat summary note page.

Suggested approach:

- Keep GitHub Pages serving static redirect pages.
- Use simple HTML meta refresh and canonical links for selected old routes.
- If a more robust redirect layer is needed later, consider Cloudflare redirect rules or another proxy layer.

## Analytics And Visitor Count

Goal:

- Preserve visible continuity with old visitor counts.

Recommended plan:

- Record final old visible site PV/UV values before migration.
- Store them in site config as baselines.
- Add the new runtime count on top of the baseline.

This is not the same as preserving the original analytics backend history. It is a public-facing continuity solution.

## AI-Assisted Development Workflow

Recommended staged workflow:

1. Finalize architecture documents in `new/`.
2. Audit the old Jekyll site and list content to migrate.
3. Define design direction with sketches, Google Stitch, screenshots, or written references.
4. Generate the initial Next.js scaffold.
5. Implement global layout, theme, language structure, and content model.
6. Migrate About, CV, Project, and Blog content.
7. Implement Gallery and image workflow.
8. Add search, comments, and visitor counter.
9. Test desktop and mobile layouts.
10. Deploy preview on Cloudflare Pages.
11. Configure custom domain.
12. Add old GitHub Pages redirects.

## Handoff Prompt Shape For Coding Agents

When asking another coding agent to implement the site, provide:

- These planning documents.
- Current repository path.
- Old Jekyll content to preserve.
- CV PDF and updated resume content.
- Any design screenshots or Google Stitch outputs.
- Explicit route decisions.
- Static export requirement.
- Cloudflare Pages output directory requirement.

Example:

```text
Implement the Next.js static rebuild described in the files under new/.
Use English default routes and Chinese nested /zh routes.
Keep the site static-export compatible for Cloudflare Pages.
Do not add a backend unless explicitly required.
Use profile/config files for personal information, CV links, navigation, project metadata, gallery metadata, and legacy visitor count baselines.
```

## Verification Checklist

Before launch:

- `npm run build` succeeds.
- Static export output exists in `out/`.
- Home, About, CV, Gallery, Blog, and Project routes load.
- `/about/zh`, `/cv/zh`, `/gallery/zh`, `/blog/zh`, and `/project/zh` load.
- Theme switching works.
- System theme mode works.
- CV download link works.
- Blog tag filter works.
- Blog search works after production build.
- Gallery thumbnails load quickly.
- Gallery lightbox opens higher-resolution images.
- Mobile layout has no text overlap.
- Old redirect pages go to the expected new URLs.
- Cloudflare Pages deployment succeeds.
- Custom domain HTTPS works.
