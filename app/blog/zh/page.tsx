import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { labelFor } from "@/content/navigation";
import { toBlogCard } from "@/lib/lede-math";
import { getLegacyPosts } from "@/lib/legacy";

export const metadata: Metadata = { title: labelFor("blog", "zh") };

export default function BlogZhPage() {
  const posts = getLegacyPosts().map(toBlogCard);
  return <BlogIndexView lang="zh" posts={posts} />;
}
