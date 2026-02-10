import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ProjectDetail } from "@/components/ProjectDetail";
import { ProjectFooter } from "@/components/ProjectFooter";
import { getProject, getAllProjects } from "@/lib/projects";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = getAllProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <article className="relative">
        {/* Full-bleed video */}
        <div className="relative w-full">
          <VideoPlayer
            src={project.videoUrl}
            poster={project.thumbnailUrl}
            className="aspect-video w-full"
          />
        </div>

        {/* Project info with animations */}
        <ProjectDetail project={project} />

        {/* Next project footer */}
        <ProjectFooter currentSlug={slug} />
      </article>
    </div>
  );
}
