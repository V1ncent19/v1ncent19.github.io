import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Prose } from "@/components/content/prose";
import { ProseBehavior } from "@/components/content/prose-behavior";
import { getAbout } from "@/lib/content";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.zh.about.title,
};

export default function AboutZhPage() {
  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl" lang="zh">
        <PageHeader title={copy.zh.about.title} />
        <Prose source={getAbout("zh")} />
        <ProseBehavior />
      </div>
    </section>
  );
}
