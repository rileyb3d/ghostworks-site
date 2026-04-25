"use client";

import { ProjectCard } from "@/components/ProjectCard";
import type { Project } from "@/lib/projects";

type ProjectGridProps = {
  projects: Project[];
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-8 pb-32 lg:px-16">
      <div className="grid gap-x-10 gap-y-20 md:grid-cols-2 md:gap-y-28">
        {projects.map((project, i) => (
          <div
            key={project.slug}
            className={i % 2 === 1 ? "md:mt-32" : undefined}
          >
            <ProjectCard project={project} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
