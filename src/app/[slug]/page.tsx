import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
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
      <article className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <Link
          href="/"
          className="mb-12 inline-block text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Back to Work
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            {project.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500">
            <span>{project.year}</span>
            {project.client && <span>{project.client}</span>}
          </div>
        </div>

        <div className="overflow-hidden rounded-sm">
          <VideoPlayer
            src={project.videoUrl}
            poster={project.thumbnailUrl}
            className="w-full"
          />
        </div>

        {project.description && (
          <p className="mt-12 max-w-2xl text-zinc-400">{project.description}</p>
        )}
      </article>
    </div>
  );
}
