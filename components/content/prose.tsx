import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Renders an author markdown string (About/Project bodies and, later, Blog
 * posts) as server-rendered HTML inside `.prose`. GFM + math (KaTeX) enabled.
 * KaTeX CSS ships once from the root layout.
 */
export function Prose({ source }: { source: string }) {
  return (
    <div className="prose">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {source}
      </Markdown>
    </div>
  );
}
