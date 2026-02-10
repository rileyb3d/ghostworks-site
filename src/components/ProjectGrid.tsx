"use client";

import { ProjectCard } from "@/components/ProjectCard";
import type { Project } from "@/lib/projects";

type ProjectGridProps = {
  projects: Project[];
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  // Build an asymmetric layout:
  // Row pattern: [large, default] then [default, default, default] etc.
  const rows: { project: Project; variant: "large" | "default"; index: number }[] = [];

  projects.forEach((project, i) => {
    // First project in the grid is large
    if (i === 0) {
      rows.push({ project, variant: "large", index: i });
    } else {
      rows.push({ project, variant: "default", index: i });
    }
  });

  return (
    <section className="mx-auto max-w-7xl px-8 pb-32 lg:px-16">
      <div className="grid gap-16 md:grid-cols-12 md:gap-x-10 md:gap-y-24">
        {rows.map(({ project, variant, index }) => {
          if (variant === "large" && index === 0) {
            return (
              <div key={project.slug} className="md:col-span-8">
                <ProjectCard
                  project={project}
                  index={index}
                  variant="large"
                />
              </div>
            );
          }

          // Offset pattern for visual interest
          const colStart =
            index % 3 === 1
              ? "md:col-span-4 md:col-start-9"
              : index % 3 === 2
              ? "md:col-span-5 md:col-start-1"
              : "md:col-span-5 md:col-start-7";

          return (
            <div key={project.slug} className={colStart}>
              <ProjectCard project={project} index={index} variant="default" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
