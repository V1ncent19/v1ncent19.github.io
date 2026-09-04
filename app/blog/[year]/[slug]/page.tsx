import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/blog-post-view";
import { getBlogPost, getBlogPosts } from "@/lib/blog";

interface BlogPostPageProps {
  params: Promise<{ year: string; slug: string }>;
}

export function generateStaticParams() {
  return getBlogPosts().map((p) => ({
    year: p.date.slice(0, 4),
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { year, slug } = await params;
  const post = getBlogPost(year, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { year, slug } = await params;
  const post = getBlogPost(year, slug);
  if (!post) notFound();

  return <BlogPostView post={post} />;
}
