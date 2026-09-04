# v1ncent19.github.io — rebuild

Static-first personal site for `Tuorui "v1ncent19" Peng`, being rebuilt from the
old Jekyll site into Next.js (App Router) with static export for Cloudflare Pages.

## Status

This repository is purely the Next.js app — the old Jekyll source tree was
removed. Blog posts live as Markdown under [`content/blog/`](content/blog/)
(37 published posts; `_drafts/` holds unpublished drafts). Site content is
authored under [`content/`](content/), with static assets in
[`public/assets/`](public/assets/).

Planning documents live in [`new/`](new/). Read
`new/IMPLEMENTATION_STATUS.md` for the current-state report.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # production build + static export into out/
```

## Stack

- Next.js App Router, TypeScript
- Static export (`output: "export"`), output directory `out/`
- Tailwind CSS v4 + CSS variables + semantic component classes
- Lucide icons
