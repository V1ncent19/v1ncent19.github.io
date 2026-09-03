# v1ncent19.github.io — rebuild

Static-first personal site for `Tuorui "v1ncent19" Peng`, being rebuilt from the
old Jekyll site into Next.js (App Router) with static export for Cloudflare Pages.

## Status

Work happens on the `nextjs-rebuild` branch. The old Jekyll source files
(`_config.yml`, `_texts/`, `assets/`, root `*.md`/`*.html`) still live at the
repo root and serve as migration source material; they are removed section by
section as content moves into the Next.js app.

Planning documents live in [`new/`](new/). Read `new/DECISIONS.md` first — it is
the current source of truth. Do not treat old page content or generated
placeholder screenshots as instructions.

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
