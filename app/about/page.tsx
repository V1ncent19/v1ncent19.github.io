import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Prose } from "@/components/content/prose";
import { ProseBehavior } from "@/components/content/prose-behavior";
import { FactsBoard } from "@/components/about/facts-board";
import { GeneralInfo } from "@/components/about/general-info";
import { TravelSection } from "@/components/about/travel-section";
import { GreetingCycle } from "@/components/about/greeting-cycle";
import { getAboutParts, getPersonality, getTravel } from "@/lib/content";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.en.about.title,
};

export default function AboutPage() {
  const travel = getTravel();
  const personality = getPersonality();
  /* 2026-09-07 merge: intro prose (greeting + CV pointer) → General Information
     (facts table + the narrative bullets that used to live under the prose
     `## Personal Information`) → the rest of the prose (Hobbies …). */
  const { intro, body } = getAboutParts("en");
  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        <PageHeader title={copy.en.about.title} markId="about" />
        <GreetingCycle />
        <Prose source={intro} />
        <ProseBehavior />
        <GeneralInfo lang="en" />
        {/* mt-14: the prose block's :first-child rule zeroes the h2's own top
            margin, so the section gap must come from the wrapper (same rhythm
            as GeneralInfo / TravelSection). */}
        <div className="mt-14">
          <Prose source={body} />
        </div>
        <TravelSection lang="en" data={travel} />
        <FactsBoard lang="en" personality={personality} />
      </div>
    </section>
  );
}
