import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Prose } from "@/components/content/prose";
import { ProseBehavior } from "@/components/content/prose-behavior";
import { FactsBoard } from "@/components/about/facts-board";
import { GeneralInfo } from "@/components/about/general-info";
import { TravelSection } from "@/components/about/travel-section";
import { getAboutParts, getPersonality, getTravel } from "@/lib/content";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.zh.about.title,
};

export default function AboutZhPage() {
  const travel = getTravel();
  const personality = getPersonality();
  /* 2026-09-07 merge: 开场白 prose → 基本信息（表格 + 原「个人信息」叙事条目）
     → 其余 prose（正经爱好…）。与 en 页同构。 */
  const { intro, body } = getAboutParts("zh");
  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl" lang="zh">
        <PageHeader title={copy.zh.about.title} markId="about" />
        <Prose source={intro} />
        <ProseBehavior />
        <GeneralInfo lang="zh" />
        {/* mt-14：prose 的 :first-child 规则会清掉 h2 自带上边距，间距由
            包裹层提供（与 GeneralInfo / TravelSection 同节奏）。 */}
        <div className="mt-14">
          <Prose source={body} />
        </div>
        <TravelSection lang="zh" data={travel} />
        <FactsBoard lang="zh" personality={personality} />
      </div>
    </section>
  );
}
