import type { BlogCategory } from "@/lib/blog";

/**
 * Per-category chip/dot tones shared by the Blog index cards and the single
 * post page — colour carries the post's category. Every class is a full
 * literal so Tailwind's scanner sees it (no dynamic `bg-${tone}` fragments).
 */
export interface PostTone {
  chip: string;
  dot: string;
  value: string;
}

export const POST_TONE: Record<BlogCategory, PostTone> = {
  knowledge: {
    chip: "bg-brand-soft text-brand",
    dot: "bg-brand",
    value: "text-brand",
  },
  cuisine: {
    chip: "bg-tertiary-soft text-tertiary",
    dot: "bg-tertiary",
    value: "text-tertiary",
  },
  documentation: {
    chip: "bg-accent-soft text-accent",
    dot: "bg-accent",
    value: "text-accent",
  },
  /* Travel logs (2026-10-17): the gallery's curated orange-red. It is the one
     hue in the palette that reads as "curated collection" rather than a
     discipline, and it is already theme-paired. `--curated` has no Tailwind
     alias, so it is referenced the way gallery-view.tsx does. */
  travel: {
    chip: "bg-[var(--curated-soft)] text-[var(--curated)]",
    dot: "bg-[var(--curated)]",
    value: "text-[var(--curated)]",
  },
};
