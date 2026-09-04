import Markdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

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
};

/**
 * Minimal structural view of a hast node — enough for the local walker below
 * without pulling in full hast/unist typing.
 */
type HNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
};

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
        rehypePlugins={[rehypeRaw, rehypeRecCapsule, rehypeKatex]}
        components={components}
      >
        {source}
      </Markdown>
    </div>
  );
}
