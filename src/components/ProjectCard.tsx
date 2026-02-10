"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Project } from "@/lib/projects";

type ProjectCardProps = {
  project: Project;
  index: number;
};

export function ProjectCard({ project, index }: ProjectCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isHovered]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link
        href={`/${project.slug}`}
        className="group block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <article className="overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
            {project.videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={project.videoUrl}
                  muted
                  loop
                  playsInline
                  poster={project.thumbnailUrl}
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <Image
                  src={project.thumbnailUrl}
                  alt={project.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-0"
                />
              </>
            ) : (
              <Image
                src={project.thumbnailUrl}
                alt={project.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )}
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
          </div>
          <div className="mt-5 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-medium tracking-tight text-white transition-colors group-hover:text-white/90 md:text-2xl">
              {project.title}
            </h2>
            <span className="shrink-0 text-sm text-zinc-500">{project.year}</span>
          </div>
          {project.client && (
            <p className="mt-1 text-sm text-zinc-500">{project.client}</p>
          )}
        </article>
      </Link>
    </motion.div>
  );
}
