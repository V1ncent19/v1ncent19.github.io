import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Prose } from "@/components/content/prose";
import { GiscusComments } from "@/components/blog/giscus-comments";
import { POST_TONE } from "@/components/blog/post-tone";
import { StickyBackLink } from "@/components/blog/sticky-back-link";
import { LedText } from "@/components/blog/led-text";
import { hydrateMath } from "@/lib/lede-math";
import type { LegacyLang, LegacyPost } from "@/lib/legacy";
import { blogPostPath, titleLed } from "@/lib/legacy";
import { copy } from "@/lib/i18n";

const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic day string (no locale API → identical on server & client). */
function formatDay(iso: string, lang: LegacyLang): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  if (lang === "zh") return `${y}年${m}月${d}日`;
  return `${EN_MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * Single legacy post page (`/blog/[year]/[slug]`). Content stays in the
 * language it was written in (posts are not translated); only this page is a
 * canonical English-interface route, mirroring the Blog index — the zh index
 * lists the same posts. Reads full markdown from the legacy `_texts` source
 * and renders it with GFM + KaTeX. The back link is sticky below the pinned
 * nav (StickyBackLink); the content column is the site-wide home width
 * (max-w-5xl), like every other page.
 */
export function BlogPostView({ post }: { post: LegacyPost }) {
  const s = copy.en;
  const tone = POST_TONE[post.category];
  const contentLang = post.lang === "zh" ? "zh" : undefined;
  // Typeset inline math in the title (e.g. "$\bar{X}$") like the cards do.
  const titleParts = hydrateMath(titleLed(post.title));

  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        <StickyBackLink />

        <header className="mt-6 border-b border-line pb-8">
          <div className="ui-text flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone.chip}`}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {s.blog.category[post.category]}
            </span>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <time dateTime={post.date} className="tabular-nums">
              {formatDay(post.date, post.lang)}
            </time>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <span>
              ≈ {post.minutes} {s.blog.minRead}
            </span>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <span className="font-medium">{s.blog.lang[post.lang]}</span>
          </div>

          <h1
            lang={contentLang}
            className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          >
            <LedText parts={titleParts} />
          </h1>
        </header>

        <div lang={contentLang} className="pt-8">
          <Prose source={post.body} />
        </div>

        {/* Per-post comment thread (giscus). Renders nothing until deployed —
            giscus refuses localhost origins — so the page is unchanged in dev. */}
        <div className="mt-12">
          <GiscusComments />
        </div>

        <footer className="ui-text mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-faint">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 font-medium text-muted transition-colors hover:text-brand hover:no-underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {s.blog.allPosts}
          </Link>
          <span className="font-mono font-medium">
            <Link
              href={`/blog#${post.category}`}
              aria-label={s.blog.category[post.category]}
              className="text-faint transition-colors hover:text-brand hover:no-underline"
            >
              #{post.category}
            </Link>
            <span aria-hidden> · {blogPostPath(post)}</span>
          </span>
        </footer>
      </div>
    </section>
  );
}
