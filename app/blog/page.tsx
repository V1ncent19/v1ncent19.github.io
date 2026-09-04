import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { labelFor } from "@/content/navigation";
import { toBlogCard } from "@/lib/lede-math";
import { getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = { title: labelFor("blog", "en") };

export default function BlogPage() {
  const posts = getBlogPosts().map(toBlogCard);
  return <BlogIndexView lang="en" posts={posts} />;
}
