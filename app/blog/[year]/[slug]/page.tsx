import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/blog-post-view";
import { getLegacyPost, getLegacyPosts } from "@/lib/legacy";

interface BlogPostPageProps {
  params: Promise<{ year: string; slug: string }>;
}

export function generateStaticParams() {
  return getLegacyPosts().map((p) => ({
    year: p.date.slice(0, 4),
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { year, slug } = await params;
  const post = getLegacyPost(year, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { year, slug } = await params;
  const post = getLegacyPost(year, slug);
  if (!post) notFound();

  return <BlogPostView post={post} />;
}
