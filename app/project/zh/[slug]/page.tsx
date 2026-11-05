import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/project/project-detail";
import { getProjectBySlug, getProjects } from "@/lib/content";

interface ProjectZhPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.meta.slug }));
}

export async function generateMetadata({
  params,
}: ProjectZhPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return { title: project.meta.title };
}

export default async function ProjectZhDetailPage({
  params,
}: ProjectZhPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <section className="shell pb-24 pt-10">
      <div className="mx-auto max-w-5xl" lang="zh">
        <ProjectDetail project={project} lang="zh" />
      </div>
    </section>
  );
}
