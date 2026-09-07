import Markdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { SectionMark } from "@/components/layout/section-mark";

/**
 * Blog `<video>` markup predates `controls` and `playsinline` and
 * carries attributes we don't want reaching React (lowercase boolean attrs,
 * repeated `id="video"`, vendor keys `webkit-playsinline` / `x-webkit-airplay`).
 * Every video renders with one canonical, React-cased attribute set — autoPlay +
 * loop + muted + playsInline (the iOS autoplay policy) plus controls — while
 * `children` (the `<source>` element(s) parsed out of the raw HTML) pass
 * through untouched. Raw attributes are intentionally NOT spread.
 */
const components: Components = {
  video: ({ children }) => (
    <video autoPlay loop muted playsInline controls>
      {children}
    </video>
  ),
  /* Section headings carry the site-wide § anchor (SectionMark) — the same
     grammar as the structured home/About subsections, so blog posts, project
     notes and the About body all expose copy-the-link section anchors. The
     id itself is assigned by rehypeHeadingAnchors below. */
  h2: proseHeading("h2"),
  h3: proseHeading("h3"),
};

function proseHeading(Tag: "h2" | "h3") {
  return function ProseHeading({
    id,
    children,
  }: {
    id?: string;
    children?: React.ReactNode;
  }) {
    return (
      <Tag id={id}>
        {/* Trailing gap comes from globals (.prose :is(h2,h3) arrow rule) — a
            Tailwind mr-* here would lose the cascade to .section-mark's
            unlayered negative margin. */}
        {typeof id === "string" ? <SectionMark id={id} /> : null}
        {children}
      </Tag>
    );
  };
}

/**
 * Minimal structural view of a hast node — enough for the local walker below
 * without pulling in full hast/unist typing.
 */
type HNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
};

/** Concatenated text of a hast subtree (for slug generation). */
function textOf(node: HNode): string {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? [])
    .map((child) => (child && typeof child === "object" ? textOf(child) : ""))
    .join("");
}

/**
 * GitHub-style slug for heading anchors: lowercase, punctuation stripped
 * (Unicode-aware so CJK headings keep their characters), whitespace runs →
 * single hyphen. Capped at 80 chars — headings containing display math can
 * otherwise leak hundreds of KaTeX glyph names into the slug.
 */
function slugify(text: string): string {
  const slug =
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80)
      .replace(/-+$/, "") || "section";
  return slug;
}

/**
 * Assigns `id` slugs to h2/h3 (deduped per document with -1/-2 suffixes) so
 * the § anchors in the components map above can deep-link to them. Unified
 * plugin = attacher factory (same shape as rehypeRecCapsule): called with
 * options, returns the transformer that walks the tree.
 */
function rehypeHeadingAnchors(): (tree: HNode) => void {
  return (tree: HNode) => {
    const seen = new Map<string, number>();
    const walk = (node: HNode | undefined): void => {
      if (!node || typeof node !== "object") return;
      if (node.tagName === "h2" || node.tagName === "h3") {
        const base = slugify(textOf(node));
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        node.properties = { ...node.properties, id: n ? `${base}-${n}` : base };
      }
      if (node.children) for (const child of node.children) walk(child);
    };
    walk(tree);
  };
}

/**
 * Recommendation-capsule transform. A markdown link written with a `title`
 * starting "推荐：" / "Recommendation:" (e.g.
 * `[古典](http://163cn.tv/yazW5l0 "推荐：Glenn Gould")`) becomes an `a.rec`
 * carrying the title in `data-rec`; globals.css then pops a little pill above
 * the link on hover/focus. The native `title` tooltip is dropped so the two
 * never fight. Other titled links are untouched. (About-page prose widgets.)
 */
function rehypeRecCapsule(): (tree: HNode) => void {
  return (tree: HNode) => {
    const walk = (node: HNode): void => {
      if (node.properties && node.tagName === "a") {
        const title = node.properties["title"];
        if (typeof title === "string" && /^(推荐|Recommendation)\s*[:：]/.test(title)) {
          node.properties["data-rec"] = title.trim();
          node.properties["className"] = "rec";
          delete node.properties["title"];
        }
      }
      if (node.children) for (const child of node.children) walk(child);
    };
    walk(tree);
  };
}

/**
 * Renders an author markdown string (About/Project/Blog bodies) as
 * server-rendered HTML inside `.prose`. GFM + math (KaTeX) enabled, and
 * rehype-raw admits the blog bodies' inline HTML (`<img>`, `<video>`),
 * plus About's `<span class="heimu">` spoilers. rehype-raw runs BEFORE
 * rehype-katex (canonical order); rehypeRecCapsule folds recommendation titles
 * into hover pills anywhere in the flow. Content is solely the site owner's
 * hand-authored markdown, so no sanitizer is applied here; if third-party
 * markdown ever enters this renderer, add rehype-sanitize before rehype-katex.
 * KaTeX CSS ships once from the root layout.
 */
export function Prose({ source }: { source: string }) {
  return (
    <div className="prose">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeHeadingAnchors,
          rehypeRecCapsule,
          rehypeKatex,
        ]}
        components={components}
      >
        {source}
      </Markdown>
    </div>
  );
}
