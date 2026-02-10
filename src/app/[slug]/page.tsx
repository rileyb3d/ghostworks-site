import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
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
        <Link
          href="/"
          className="fixed left-6 top-28 z-50 text-sm tracking-wide text-zinc-500 transition-colors hover:text-white"
        >
          ← Back
        </Link>

        {/* Full-bleed video */}
        <div className="relative w-full">
          <VideoPlayer
            src={project.videoUrl}
            poster={project.thumbnailUrl}
            className="aspect-video w-full md:aspect-[21/9]"
          />
        </div>

        {/* Project info */}
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {project.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm text-zinc-500">
            <span>{project.year}</span>
            {project.client && <span>{project.client}</span>}
          </div>

          {project.description && (
            <p className="mt-12 text-lg leading-relaxed text-zinc-400">
              {project.description}
            </p>
          )}
        </div>

        <ProjectFooter currentSlug={slug} />
      </article>
    </div>
  );
}
