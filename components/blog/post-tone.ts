import type { LegacyCategory } from "@/lib/legacy";

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

export const POST_TONE: Record<LegacyCategory, PostTone> = {
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
};
