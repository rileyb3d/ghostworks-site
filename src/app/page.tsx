import { ProjectCard } from "@/components/ProjectCard";
import { getAllProjects } from "@/lib/projects";

export default function Home() {
  const projects = getAllProjects();

  return (
    <div className="min-h-screen">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mb-12">
          <h1 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Work
          </h1>
        </div>
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
