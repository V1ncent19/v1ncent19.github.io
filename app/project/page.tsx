import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectGrid } from "@/components/project/project-grid";
import { getProjects } from "@/lib/content";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.en.project.title,
};

export default function ProjectPage() {
  const s = copy.en;
  return (
    <section className="shell pb-24">
      <div className="mx-auto max-w-5xl">
        <PageHeader title={s.project.title} lead={s.project.lead} />
        <ProjectGrid projects={getProjects()} lang="en" basePath="/project" />
      </div>
    </section>
  );
}
