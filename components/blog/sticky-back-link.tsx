"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/i18n";

/**
 * The "← All posts" link at the top of a blog post, made sticky so a way back
 * is always in reach while reading. It pins at `top-[4.5rem]` — just beneath
 * the capsule nav once that pins to the top on scroll (site-header.tsx: sticky
 * `top-3`/`sm:top-4`, pill bottom ≈ 70 px). While actually pinned the link
 * itself becomes a solid surface-colored capsule (white in light mode) with a
 * hairline + soft shadow, so body text scrolling underneath is fully masked
 * behind the button and the label stays legible; at rest it is just the plain
 * text link at the top of the article. `z-30` keeps it below the nav's `z-40`.
 */
export function StickyBackLink({ href = "/blog" }: { href?: string }) {
  const s = copy.en;
  const barRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = barRef.current;
      // Stuck exactly when its sticky top offset (4.5rem = 72px) has engaged.
      if (el) setStuck(el.getBoundingClientRect().top <= 73);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className={[
        "sticky top-[4.5rem] z-30 transition-[padding-top] duration-200",
        stuck ? "pt-0.5 sm:pt-1" : "pt-2 sm:pt-4",
      ].join(" ")}
    >
      <Link
        href={href}
        className={[
          "ui-text inline-flex items-center gap-1.5 text-sm transition-[background-color,color,border-color,box-shadow] duration-200 hover:no-underline",
          stuck
            // Pinned: a solid capsule floats over the scrolling body text.
            // bg-surface is pure white in light mode and adapts in dark.
            ? "rounded-full border border-line bg-surface px-3.5 py-1.5 text-ink shadow-[0_1px_0_rgb(23_28_31/0.06),0_4px_14px_rgb(23_28_31/0.14)] hover:border-line-strong hover:text-brand"
            : "py-0.5 text-muted hover:text-brand",
        ].join(" ")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {s.blog.allPosts}
      </Link>
    </div>
  );
}
