/**
 * Build-time KaTeX rendering for card ledes (blog index / search, and the
 * article-page title). The pure tokenizer in lib/blog.ts carves a run into
 * text + inline-math segments with `html` left empty; this module fills the
 * math segments with server-rendered KaTeX so client components never need to
 * bundle katex or re-run parsing. Content is the site owner's hand-authored
 * TeX, rendered with throwOnError:false so one bad token degrades to a red
 * box instead of failing the static export.
 */
import katex from "katex";
import {
  excerptLed,
  ledSearchText,
  titleLed,
  type BlogPostCard,
  type BlogPost,
  type LedPart,
} from "@/lib/blog";

function renderTex(tex: string): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
      trust: false,
    });
  } catch {
    return "";
  }
}

/** Fill the `html` slot of every math segment (text segments untouched). */
export function hydrateMath(parts: LedPart[]): LedPart[] {
  return parts.map((p) =>
    p.kind === "math" ? { ...p, html: renderTex(p.value) } : p,
  );
}

/** Turn a blog post into the serialisable BlogPostCard the index renders. */
export function toBlogCard(post: BlogPost): BlogPostCard {
  const rawTitle = titleLed(post.title);
  const lede = excerptLed(post.body);
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    category: post.category,
    lang: post.lang,
    minutes: post.minutes,
    titleParts: hydrateMath(rawTitle),
    excerptParts: hydrateMath(lede.parts),
    titleText: ledSearchText(rawTitle),
    excerptText: ledSearchText(lede.parts),
  };
}
