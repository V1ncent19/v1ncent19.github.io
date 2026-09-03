import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectGrid } from "@/components/project/project-grid";
import { getProjects } from "@/lib/content";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.zh.project.title,
};

export default function ProjectZhPage() {
  const s = copy.zh;
  return (
    <section className="shell pb-24">
      <div className="mx-auto max-w-5xl" lang="zh">
        <PageHeader title={s.project.title} lead={s.project.lead} />
        <ProjectGrid projects={getProjects()} lang="zh" basePath="/project/zh" />
      </div>
    </section>
  );
}
