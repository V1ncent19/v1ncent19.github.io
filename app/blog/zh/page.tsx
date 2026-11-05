import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { TranslationNotice } from "@/components/translation-notice";
import { labelFor } from "@/content/site/navigation";
import { blogIndexCards } from "@/lib/blog-travel";

export const metadata: Metadata = { title: labelFor("blog", "zh") };

export default function BlogZhPage() {
  /* md posts + the travel logs (Chinese titles/blurbs via pick), newest first. */
  return (
    <div>
      {/* 机翻草稿声明（人工重写本页后删除这一行 + 上面的 import） */}
      <TranslationNotice href="/blog" />
      <BlogIndexView lang="zh" posts={blogIndexCards("zh")} />
    </div>
  );
}
