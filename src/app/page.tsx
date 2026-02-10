import { HeroReel } from "@/components/HeroReel";
import { Marquee } from "@/components/Marquee";
import { ProjectCard } from "@/components/ProjectCard";
import { getAllProjects } from "@/lib/projects";

export default function Home() {
  const allProjects = getAllProjects();
  const featured = allProjects.find((p) => p.featured) ?? allProjects[0];
  const rest = allProjects.filter((p) => p.slug !== featured.slug);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <HeroReel project={featured} />
      </section>

      {/* Work grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-16 flex items-end justify-between border-b border-white/10 pb-6">
          <h2 className="font-display text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
            Selected Work
          </h2>
          <span className="hidden text-sm text-zinc-600 md:block">
            {allProjects.length} projects
          </span>
        </div>

        <div className="grid gap-x-10 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((project, index) => (
            <ProjectCard key={project.slug} project={project} index={index} />
          ))}
        </div>
      </section>

      {/* Marquee */}
      <Marquee />
    </div>
  );
}
