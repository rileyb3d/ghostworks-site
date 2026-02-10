"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/projects";

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/${project.slug}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article className="overflow-hidden">
        <div className="relative aspect-video overflow-hidden bg-zinc-900">
          {isHovered && project.videoUrl ? (
            <video
              src={project.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={project.thumbnailUrl}
              alt={project.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium text-white transition-colors group-hover:text-zinc-300">
            {project.title}
          </h2>
          <span className="shrink-0 text-sm text-zinc-500">{project.year}</span>
        </div>
        {project.client && (
          <p className="mt-1 text-sm text-zinc-500">{project.client}</p>
        )}
      </article>
    </Link>
  );
}
