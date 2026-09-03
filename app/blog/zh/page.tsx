import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { labelFor } from "@/content/navigation";
import { getLegacyPosts } from "@/lib/legacy";

export const metadata: Metadata = { title: labelFor("blog", "zh") };

export default function BlogZhPage() {
  const posts = getLegacyPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    lang: p.lang,
    minutes: p.minutes,
    excerpt: p.excerpt,
  }));
  return <BlogIndexView lang="zh" posts={posts} />;
}
