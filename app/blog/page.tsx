import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { labelFor } from "@/content/site/navigation";
import { blogIndexCards } from "@/lib/blog-travel";

export const metadata: Metadata = { title: labelFor("blog", "en") };

export default function BlogPage() {
  /* md posts + the travel logs, newest first (lib/blog-travel.ts). */
  return <BlogIndexView lang="en" posts={blogIndexCards("en")} />;
}
