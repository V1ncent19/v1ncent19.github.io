import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Prose } from "@/components/content/prose";
import { ProseBehavior } from "@/components/content/prose-behavior";
import { FactsBoard } from "@/components/about/facts-board";
import { GeneralInfo } from "@/components/about/general-info";
import { TravelSection } from "@/components/about/travel-section";
import { getAbout, getPersonality, getTravel } from "@/lib/content";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.en.about.title,
};

export default function AboutPage() {
  const travel = getTravel();
  const personality = getPersonality();
  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        <PageHeader title={copy.en.about.title} />
        <Prose source={getAbout("en")} />
        <ProseBehavior />
        <GeneralInfo lang="en" />
        <TravelSection lang="en" data={travel} />
        <FactsBoard lang="en" personality={personality} />
      </div>
    </section>
  );
}
